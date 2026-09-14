# api/auth.py
# PART 12.2 — Admin authentication: password + TOTP + Redis-backed sessions.
# Every login attempt (success or failure) is written to audit_log.
import os
import secrets
from typing import Optional

import bcrypt
import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

SESSION_TTL = int(os.getenv("SESSION_TTL", 60 * 60 * 8))  # 8 hours


class LoginIn(BaseModel):
    username: str
    password: str
    totp_code: str


class TotpSetupIn(BaseModel):
    username: str
    password: str


def _db(request: Request):
    from api.main import db  # local import to avoid a circular import

    return db()


def get_redis(request: Request):
    return request.app.state.redis


async def write_audit(
    conn, actor: str, action: str, entity: str = None, entity_id=None, details: dict = None
):
    await conn.execute(
        """
        INSERT INTO audit_log (actor, action, entity, entity_id, details)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        """,
        actor,
        action,
        entity,
        entity_id,
        _json(details or {}),
    )


def _json(obj) -> str:
    import json

    return json.dumps(obj)


async def get_current_user(
    request: Request, authorization: Optional[str] = None
) -> dict:
    """FastAPI dependency: validate the Bearer session token (Redis)."""
    from fastapi.security.utils import get_authorization_scheme_param

    scheme, token = get_authorization_scheme_param(
        request.headers.get("Authorization", "")
    )
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Missing session token")

    redis = get_redis(request)
    session = await redis.get(f"session:{token}")
    if not session:
        raise HTTPException(401, "Session expired — log in again")

    # session value: "username|role"
    username, _, role = session.partition("|")
    return {"user": username, "role": role or "reviewer", "token": token}


@router.post("/login")
async def login(payload: LoginIn, request: Request):
    conn = _db(request)
    row = await conn.fetchrow(
        """
        SELECT id, username, password_hash, totp_secret, role, is_active
        FROM admin_users
        WHERE username = $1
        """,
        payload.username,
    )

    generic_error = HTTPException(401, "Invalid credentials")

    if not row or not row["is_active"]:
        await write_audit(conn, payload.username, "login_failed")
        raise generic_error

    if not bcrypt.checkpw(
        payload.password.encode(), row["password_hash"].encode()
    ):
        await write_audit(conn, payload.username, "login_failed", "admin_user", row["id"])
        raise generic_error

    totp = pyotp.TOTP(row["totp_secret"])
    if not totp.verify(payload.totp_code, valid_window=1):
        await write_audit(conn, payload.username, "login_failed_totp", "admin_user", row["id"])
        raise generic_error

    token = secrets.token_hex(32)
    redis = get_redis(request)
    await redis.setex(
        f"session:{token}", SESSION_TTL, f"{row['username']}|{row['role']}"
    )

    await conn.execute(
        "UPDATE admin_users SET last_login_at = now() WHERE id = $1", row["id"]
    )
    await write_audit(conn, row["username"], "login", "admin_user", row["id"])

    return {
        "token": token,
        "expires_in": SESSION_TTL,
        "user": {"username": row["username"], "role": row["role"]},
    }


@router.get("/audit")
async def audit_trail(
    page: int = 1,
    page_size: int = 50,
    user: dict = Depends(get_current_user),
):
    """Full audit trail — every admin action (PART 12 / PART 15)."""
    offset = (page - 1) * page_size
    rows = await _db().fetch(
        """
        SELECT id, actor, action, entity, entity_id, details, created_at,
               count(*) OVER() AS total
        FROM audit_log
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        """,
        page_size,
        offset,
    )
    total = int(rows[0]["total"]) if rows else 0
    data = []
    for row in rows:
        item = dict(row)
        item.pop("total", None)
        item["id"] = int(item["id"])
        item["entity_id"] = str(item["entity_id"]) if item["entity_id"] else None
        item["created_at"] = str(item["created_at"])
        data.append(item)
    return {"data": data, "total": total, "page": page, "page_size": page_size}


@router.post("/logout")
async def logout(request: Request, user: dict = Depends(get_current_user)):
    redis = get_redis(request)
    await redis.delete(f"session:{user['token']}")
    return {"status": "logged_out"}


@router.post("/2fa/setup")
async def setup_totp(payload: TotpSetupIn, request: Request):
    """One-time: store a new TOTP secret + return the provisioning URI / QR.
    Call this while setting up the FIRST admin (bootstrap), or authenticated."""
    conn = _db(request)
    row = await conn.fetchrow(
        "SELECT id, username, is_active FROM admin_users WHERE username = $1",
        payload.username,
    )
    if not row or not row["is_active"]:
        raise HTTPException(404, "Admin user not found")

    secret = pyotp.random_base32()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=payload.username, issuer_name="MissingPersonsTZ"
    )

    await conn.execute(
        "UPDATE admin_users SET totp_secret = $1 WHERE id = $2", secret, row["id"]
    )
    await write_audit(conn, payload.username, "totp_setup", "admin_user", row["id"])

    # QR code as a data URI (scan into Google Authenticator / Aegis)
    import base64
    import io

    import qrcode

    buf = io.BytesIO()
    img = qrcode.make(uri)
    img.save(buf, format="PNG")
    qr_data_uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

    return {"secret": secret, "otpauth_uri": uri, "qr_png_data_uri": qr_data_uri}
