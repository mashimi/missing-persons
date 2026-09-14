# api/main.py
# PART 4 — Backend API (FastAPI, minimal and censorship-resistant).
#
# Design rules (PART 4 intro + PART 7):
#   * The public API serves ONLY published cases.
#   * Encrypted tip reports are stored as opaque blobs — the API NEVER
#     stores an IP address for a submission (PART 7.2).
#   * Drafting, verification and publication require an admin session
#     (PART 12).
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Optional

import asyncpg
import redis.asyncio as aioredis
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.auth import get_current_user, router as auth_router
from api.osint import router as osint_router
from api.verification import router as verification_router

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://mp:mp@localhost:5432/missing_persons"
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

pool: Optional[asyncpg.Pool] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    app.state.redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    yield
    await pool.close()
    await app.state.redis.close()


app = FastAPI(
    title="Missing Persons Registry API",
    description="Public registry of enforced disappearances in Tanzania.",
    lifespan=lifespan,
)

# The static site may live on any mirror — allow everything.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(verification_router)
app.include_router(osint_router)


def db() -> asyncpg.Pool:
    if pool is None:
        raise HTTPException(503, "Database not ready")
    return pool


# ── Models ────────────────────────────────────────────────
class LocationIn(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    region: Optional[str] = None
    district: Optional[str] = None
    country: str = "Tanzania"


class PersonIn(BaseModel):
    full_name: str
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: str = "unknown"
    photo_url: Optional[str] = None
    last_seen_date: Optional[str] = None
    location: Optional[LocationIn] = None
    status: str = "missing"
    description: Optional[str] = None
    circumstances: Optional[str] = None
    family_contact: Optional[str] = None
    tags: list[str] = []


class PersonPatch(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[str] = None
    photo_url: Optional[str] = None
    last_seen_date: Optional[str] = None
    location: Optional[LocationIn] = None
    status: Optional[str] = None
    description: Optional[str] = None
    circumstances: Optional[str] = None
    family_contact: Optional[str] = None
    tags: Optional[list[str]] = None
    is_published: Optional[bool] = None


class EncryptedReportIn(BaseModel):
    # PART 7.4 — the only field that matters: the PGP-armored blob.
    encrypted_blob: str
    source: str = "web"
    sender_hint: Optional[str] = None


# ── Health ────────────────────────────────────────────────
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# ── Public: list published persons ────────────────────────
@app.get("/api/persons")
async def list_persons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = "",
    status: Optional[str] = None,
    region: Optional[str] = None,
):
    offset = (page - 1) * page_size
    conditions = ["p.is_published = TRUE"]
    args: list[Any] = []

    if search:
        conditions.append(
            "(p.full_name ILIKE $%d OR p.description ILIKE $%d OR p.circumstances ILIKE $%d)"
            % (len(args) + 1, len(args) + 1, len(args) + 1)
        )
        args.append(f"%{search}%")

    if status:
        conditions.append("p.status = $%d" % (len(args) + 1))
        args.append(status)

    if region:
        conditions.append("l.region = $%d" % (len(args) + 1))
        args.append(region)

    where = " AND ".join(conditions)
    query = f"""
        SELECT p.id, p.full_name, p.age, p.gender, p.photo_url,
               p.last_seen_date, p.status, p.description, p.circumstances,
               p.family_contact, p.tags, p.created_at, p.updated_at,
               json_build_object(
                   'id', l.id, 'name', l.name,
                   'latitude', l.latitude, 'longitude', l.longitude,
                   'region', l.region, 'district', l.district, 'country', l.country
               ) AS last_seen_location,
               count(*) OVER() AS total
        FROM persons p
        LEFT JOIN locations l ON l.id = p.location_id
        WHERE {where}
        ORDER BY p.last_seen_date DESC NULLS LAST
        LIMIT $%d OFFSET $%d
    """ % (len(args) + 1, len(args) + 2)
    args.extend([page_size, offset])

    rows = await db().fetch(query, *args)
    total = int(rows[0]["total"]) if rows else 0

    data: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        item.pop("total", None)
        # asyncpg returns json_build_object(...) as a text value
        if item.get("last_seen_location") is not None:
            item["last_seen_location"] = json.loads(item["last_seen_location"])
        data.append(item)

    # Shape expected by the frontend: PaginatedResponse<Person>
    return {"data": data, "total": total, "page": page, "page_size": page_size}


# ── Public: single person ─────────────────────────────────
@app.get("/api/persons/{person_id}")
async def get_person(person_id: str):
    row = await db().fetchrow(
        """
        SELECT p.id, p.full_name, p.age, p.gender, p.photo_url,
               p.last_seen_date, p.status, p.description, p.circumstances,
               p.family_contact, p.tags, p.created_at, p.updated_at,
               json_build_object(
                   'id', l.id, 'name', l.name,
                   'latitude', l.latitude, 'longitude', l.longitude,
                   'region', l.region, 'district', l.district, 'country', l.country
               ) AS last_seen_location
        FROM persons p
        LEFT JOIN locations l ON l.id = p.location_id
        WHERE p.id = $1 AND p.is_published = TRUE
        """,
        person_id,
    )
    if not row:
        raise HTTPException(404, "Person not found")

    person = dict(row)
    if person.get("last_seen_location") is not None:
        person["last_seen_location"] = json.loads(person["last_seen_location"])
    return person


# ── Admin: create a draft case ────────────────────────────
@app.post("/api/persons", status_code=201)
async def create_person(payload: PersonIn, user: dict = Depends(get_current_user)):
    async with db().acquire() as conn:
        location_id = None
        if payload.location:
            location_id = await conn.fetchval(
                """
                INSERT INTO locations (name, latitude, longitude, region, district, country)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                payload.location.name,
                payload.location.latitude,
                payload.location.longitude,
                payload.location.region,
                payload.location.district,
                payload.location.country,
            )

        person_id = await conn.fetchval(
            """
            INSERT INTO persons
                (full_name, age, gender, photo_url, last_seen_date, location_id,
                 status, description, circumstances, family_contact, tags,
                 is_published)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE)
            RETURNING id
            """,
            payload.full_name,
            payload.age,
            payload.gender,
            payload.photo_url,
            payload.last_seen_date,
            location_id,
            payload.status,
            payload.description,
            payload.circumstances,
            payload.family_contact,
            payload.tags,
        )

        await conn.execute(
            """
            INSERT INTO audit_log (actor, action, entity, entity_id, details)
            VALUES ($1, 'create_person', 'person', $2, '{"draft": true}'::jsonb)
            """,
            user["user"],
            person_id,
        )

    return {"id": str(person_id), "status": "draft"}


# ── Admin: update / publish / delete ──────────────────────
@app.patch("/api/persons/{person_id}")
async def patch_person(
    person_id: str, payload: PersonPatch, user: dict = Depends(get_current_user)
):
    updates = payload.model_dump(exclude_none=True, exclude={"location"})
    if not updates and payload.location is None:
        raise HTTPException(400, "Nothing to update")

    async with db().acquire() as conn:
        if payload.location:
            updates["location_id"] = await conn.fetchval(
                """
                INSERT INTO locations (name, latitude, longitude, region, district, country)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                payload.location.name,
                payload.location.latitude,
                payload.location.longitude,
                payload.location.region,
                payload.location.district,
                payload.location.country,
            )

        if updates:
            cols = ", ".join(f"{key} = ${i + 2}" for i, key in enumerate(updates))
            await conn.execute(
                f"UPDATE persons SET {cols} WHERE id = $1",
                person_id,
                *updates.values(),
            )

        if updates.get("is_published"):
            await conn.execute(
                "UPDATE persons SET published_at = now() WHERE id = $1", person_id
            )

        await conn.execute(
            """
            INSERT INTO audit_log (actor, action, entity, entity_id, details)
            VALUES ($1, 'update_person', 'person', $2, $3::jsonb)
            """,
            user["user"],
            person_id,
            json.dumps(updates),
        )

    return {"id": person_id, "updated": True}


@app.delete("/api/persons/{person_id}")
async def delete_person(person_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin role required")
    await db().execute("DELETE FROM persons WHERE id = $1", person_id)
    return {"id": person_id, "deleted": True}


# ── Public: aggregate stats (home page) ───────────────────
@app.get("/api/stats")
async def stats():
    row = await db().fetchrow("SELECT * FROM v_case_stats")
    return dict(row or {})


# ── Public: ingest encrypted tip reports (PART 7.4) ───────
# The server receives ONLY the PGP-armored blob. No IP logging, no
# plaintext — decryption happens offline during admin verification.
@app.post("/api/reports", status_code=202)
async def submit_encrypted_report(payload: EncryptedReportIn, request: Request):
    if len(payload.encrypted_blob) > 1_000_000:
        raise HTTPException(413, "Report too large")

    report_id = await db().fetchval(
        """
        INSERT INTO tip_reports (source, sender_hint, encrypted_content)
        VALUES ($1, $2, $3)
        RETURNING id
        """,
        payload.source if payload.source in ("web", "signal") else "web",
        payload.sender_hint,  # already hashed upstream (never a raw number)
        payload.encrypted_blob,
    )

    # Deliberately NOT logging request.client.host — anonymous submissions
    # are the whole point (PART 6: "do not log IPs").
    return {"status": "received", "reference": str(report_id)}


# ── Public: snapshot for the static build (PART 5) ────────
@app.get("/api/snapshot")
async def snapshot():
    rows = await db().fetch(
        """
        SELECT id, full_name, age, gender, photo_url, last_seen_date, status,
               description, circumstances, family_contact, tags,
               created_at, updated_at,
               json_build_object(
                   'id', l.id, 'name', l.name,
                   'latitude', l.latitude, 'longitude', l.longitude,
                   'region', l.region, 'district', l.district, 'country', l.country
               ) AS last_seen_location
        FROM persons p
        LEFT JOIN locations l ON l.id = p.location_id
        WHERE is_published = TRUE
        ORDER BY last_seen_date DESC
        """
    )
    data = []
    for row in rows:
        item = dict(row)
        if item.get("last_seen_location") is not None:
            item["last_seen_location"] = json.loads(item["last_seen_location"])
        data.append(item)
    return data


