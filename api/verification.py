# api/verification.py
# PART 12.3 — Report verification workflow (admin only).
#
# pending → (decrypt) → verify → publish as a public case
#                     → reject
#
# The PGP private key lives ONLY on this server (mounted read-only at
# PGP_PRIVATE_KEY_FILE). Decryption happens here, behind an authenticated
# endpoint, and each step is audited.
import json
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pgpy import PGPKey, PGPMessage, PGPUID
from pydantic import BaseModel

from api.auth import get_current_user, write_audit

router = APIRouter(prefix="/api/admin/reports", tags=["verification"])

_private_key: Optional[PGPKey] = None


def _private_key() -> PGPKey:
    global _private_key
    if _private_key is None:
        path = os.getenv("PGP_PRIVATE_KEY_FILE", "/keys/server-priv.asc")
        with open(path, "r", encoding="utf-8") as fh:
            _private_key, _ = PGPKey.from_blob(fh.read())
        passphrase = os.getenv("PGP_PASSPHRASE", "")
        if _private_key.is_protected:
            with _private_key.unlock(passphrase) as unlocked:
                _private_key = unlocked
    return _private_key


def decrypt_blob(armored: str) -> dict:
    message = PGPMessage.from_blob(armored)
    decrypted = _private_key().decrypt(message)
    return json.loads(str(decrypted))


class VerifyIn(BaseModel):
    note: Optional[str] = None


class RejectIn(BaseModel):
    reason: str


class PublishIn(BaseModel):
    publish_family_contact: bool = False


def _db(request: Request):
    from api.main import db

    return db()


@router.get("")
async def list_reports(
    status: str = Query("pending"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    offset = (page - 1) * page_size
    rows = await _db().fetch(
        """
        SELECT id, source, sender_hint, status, created_at, verified_at,
               published_person_id,
               count(*) OVER() AS total
        FROM tip_reports
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """,
        status,
        page_size,
        offset,
    )
    total = int(rows[0]["total"]) if rows else 0
    return {
        "data": [
            {k: (str(v) if k in ("id", "published_person_id") else v) for k, v in dict(r).items() if k != "total"}
            for r in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{report_id}")
async def get_report(report_id: str, user: dict = Depends(get_current_user)):
    """Decrypt a single report for review. Audited — every read is logged."""
    row = await _db().fetchrow(
        """
        SELECT id, source, sender_hint, encrypted_content, status, created_at
        FROM tip_reports
        WHERE id = $1
        """,
        report_id,
    )
    if not row:
        raise HTTPException(404, "Report not found")

    try:
        decrypted = decrypt_blob(row["encrypted_content"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(422, f"Decryption failed: {exc}") from exc

    await write_audit(
        _db(), user["user"], "decrypt_report", "tip_report", row["id"]
    )

    return {
        "id": str(row["id"]),
        "source": row["source"],
        "sender_hint": row["sender_hint"],
        "status": row["status"],
        "created_at": str(row["created_at"]),
        "report": decrypted,
    }


@router.post("/{report_id}/verify")
async def verify_report(
    report_id: str, payload: VerifyIn, user: dict = Depends(get_current_user)
):
    result = await _db().fetchrow(
        """
        UPDATE tip_reports
        SET status = 'verified', verified_at = now(),
            verified_by = (SELECT id FROM admin_users WHERE username = $2)
        WHERE id = $1 AND status = 'pending'
        RETURNING id
        """,
        report_id,
        user["user"],
    )
    if not result:
        raise HTTPException(404, "Report not found or already handled")

    await write_audit(
        _db(), user["user"], "verify_report", "tip_report", result["id"],
        {"note": payload.note},
    )
    return {"id": str(result["id"]), "status": "verified"}


@router.post("/{report_id}/reject")
async def reject_report(
    report_id: str, payload: RejectIn, user: dict = Depends(get_current_user)
):
    result = await _db().fetchrow(
        """
        UPDATE tip_reports
        SET status = 'rejected', verified_at = now(),
            verified_by = (SELECT id FROM admin_users WHERE username = $2)
        WHERE id = $1 AND status IN ('pending', 'verified')
        RETURNING id
        """,
        report_id,
        user["user"],
    )
    if not result:
        raise HTTPException(404, "Report not found or already handled")

    await write_audit(
        _db(), user["user"], "reject_report", "tip_report", result["id"],
        {"reason": payload.reason},
    )
    return {"id": str(result["id"]), "status": "rejected"}


@router.post("/{report_id}/publish")
async def publish_report(
    report_id: str, payload: PublishIn, user: dict = Depends(get_current_user)
):
    """Turn a verified report into a public person record.

    The report must already be verified (2-source / family confirmation
    happens outside the system — see infor.md PART 6 'Safety & Verification').
    """
    conn = _db()
    row = await conn.fetchrow(
        """
        SELECT id, encrypted_content, status
        FROM tip_reports
        WHERE id = $1 AND status = 'verified'
        """,
        report_id,
    )
    if not row:
        raise HTTPException(
            404, "Report not found or not verified (verify it first)"
        )

    try:
        report = decrypt_blob(row["encrypted_content"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(422, f"Decryption failed: {exc}") from exc

    async with conn.acquire() as c:
        location_id = None
        if report.get("location_name"):
            lat = lon = None
            if report.get("coordinates"):
                try:
                    lat_s, lon_s = [
                        s.strip() for s in str(report["coordinates"]).split(",")
                    ]
                    lat, lon = float(lat_s), float(lon_s)
                except (ValueError, AttributeError):
                    lat = lon = None

            location_id = await c.fetchval(
                """
                INSERT INTO locations (name, latitude, longitude, region, district, country)
                VALUES ($1, $2, $3, $4, $5, 'Tanzania')
                RETURNING id
                """,
                report["location_name"],
                lat,
                lon,
                report.get("region"),
                report.get("district"),
            )

        person_id = await c.fetchval(
            """
            INSERT INTO persons
                (full_name, age, gender, last_seen_date, location_id, status,
                 description, circumstances, family_contact,
                 is_published, published_at)
            VALUES ($1, $2, $3, $4, $5, 'missing', $6, $7, $8, TRUE, now())
            RETURNING id
            """,
            report.get("full_name"),
            report.get("age"),
            report.get("gender", "unknown"),
            report.get("last_seen_date"),
            location_id,
            report.get("description"),
            report.get("circumstances"),
            report.get("contact") if payload.publish_family_contact else None,
        )

        await c.execute(
            """
            UPDATE tip_reports
            SET status = 'published',
                published_person_id = $2,
                verified_by = (SELECT id FROM admin_users WHERE username = $3)
            WHERE id = $1
            """,
            report_id,
            person_id,
            user["user"],
        )

        await write_audit(
            c, user["user"], "publish_report", "tip_report", row["id"],
            {"person_id": str(person_id)},
        )

    return {"id": report_id, "person_id": str(person_id), "status": "published"}

