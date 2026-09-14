# api/osint.py
# PART 13.7 — OSINT admin panel endpoints (mounted by api/main.py).
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from api.auth import get_current_user, write_audit

router = APIRouter(prefix="/api/admin/osint", tags=["osint"])


def _db(request: Request):
    from api.main import db

    return db()


class ReviewIn(BaseModel):
    approved: bool


@router.get("/matches")
async def list_matches(
    reviewed: bool = False,
    min_score: float = 70,
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
):
    offset = (page - 1) * 20
    rows = await _db().fetch(
        """
        SELECT om.id, om.source_type, om.source_url, om.title, om.snippet,
               om.published_at, om.match_score, om.reviewed, om.created_at,
               p.id AS person_id, p.full_name, p.photo_url
        FROM osint_matches om
        LEFT JOIN persons p ON p.id = om.person_id
        WHERE om.reviewed = $1 AND om.match_score >= $2
        ORDER BY om.match_score DESC NULLS LAST
        LIMIT 20 OFFSET $3
        """,
        reviewed,
        min_score,
        offset,
    )
    data = []
    for row in rows:
        item = dict(row)
        item["id"] = str(item["id"])
        item["person_id"] = str(item["person_id"]) if item["person_id"] else None
        data.append(item)
    return {"data": data, "page": page}


@router.post("/matches/{match_id}/review")
async def review_match(
    match_id: UUID, payload: ReviewIn, user: dict = Depends(get_current_user)
):
    result = await _db().fetchrow(
        """
        UPDATE osint_matches
        SET reviewed = TRUE,
            reviewed_at = now(),
            reviewed_by = (SELECT id FROM admin_users WHERE username = $2)
        WHERE id = $1
        RETURNING id, person_id
        """,
        match_id,
        user["user"],
    )
    if not result:
        raise HTTPException(404, "Match not found")

    await write_audit(
        _db(), user["user"], "osint_review", "osint_match", result["id"],
        {"approved": payload.approved},
    )
    return {
        "status": "reviewed",
        "approved": payload.approved,
        "person_id": str(result["person_id"]) if result["person_id"] else None,
    }
