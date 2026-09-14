# osint/tasks.py
# PART 13.5 — OSINT enrichment tasks.
#
# Sources: GDELT 2.0 DOC API + Google News RSS.
# Storage: osint_matches (deduplicated by source_url).
# Matching: rapidfuzz partial_ratio ≥ 70 links articles to persons;
#           humans review every match in the admin dashboard.
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import feedparser
import psycopg2
import requests
from bs4 import BeautifulSoup
from celery import shared_task
from rapidfuzz import fuzz

log = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://mp:mp@localhost:5432/missing_persons"
)
GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc"
GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"
NOMINATIM = "https://nominatim.openstreetmap.org/search"

# Search terms — deliberately conservative to avoid noise
QUERY_TERMS = (
    '("Tanzania" OR "Dar es Salaam" OR "Dodoma" OR "Mwanza" OR "Arusha") '
    '("abduction" OR "abducted" OR "disappearance" OR "disappeared" '
    'OR "enforced disappearance" OR "missing person" OR "kidnapping")'
)

# Nominatim policy: 1 req/s max + a descriptive User-Agent
NOMINATIM_HEADERS = {
    "User-Agent": "missing-persons-tz-osint/0.1 (civil-society registry)"
}


def db():
    return psycopg2.connect(DATABASE_URL)


# ── 1. GDELT Scan ─────────────────────────────────────
@shared_task
def scan_gdelt():
    """
    Query the GDELT 2.0 DOC API for recent coverage and store any
    new articles in osint_matches (deduplicated by URL).
    """
    params = {
        "query": QUERY_TERMS,
        "mode": "artlist",
        "maxrecords": 75,
        "format": "json",
        "timespan": "6h",
        "sort": "datedesc",
    }
    try:
        res = requests.get(GDELT_API, params=params, timeout=30)
        res.raise_for_status()
        payload = res.json()
    except (requests.RequestException, ValueError) as exc:
        log.warning("GDELT scan failed: %s", exc)
        return 0

    articles = []
    for art in payload.get("articles", []):
        url = art.get("url")
        if not url:
            continue
        articles.append(
            {
                "source_type": "gdelt",
                "source_url": url,
                "title": _strip_html(art.get("title", "")),
                "snippet": _strip_html(art.get("seendescription") or art.get("description") or ""),
                "published_at": _parse_gdelt_date(art.get("seendate")),
            }
        )

    seen = _get_seen_urls("gdelt")
    fresh = [a for a in articles if a["source_url"] not in seen]
    if fresh:
        _store_articles(fresh)
    log.info("GDELT: %d new articles (%d scanned)", len(fresh), len(articles))
    return len(fresh)


# ── 2. Google News RSS Scan ───────────────────────────
@shared_task
def scan_google_news():
    """
    Scan Google News RSS for the same query terms.
    """
    params = {
        "q": QUERY_TERMS,
        "hl": "en",
        "gl": "TZ",
        "ceid": "TZ:en",
    }
    try:
        feed = feedparser.parse(f"{GOOGLE_NEWS_RSS}?{urlencode(params)}")
    except Exception as exc:  # noqa: BLE001
        log.warning("Google News scan failed: %s", exc)
        return 0

    articles = []
    for entry in feed.entries[:75]:
        url = entry.get("link")
        if not url:
            continue
        articles.append(
            {
                "source_type": "google_news",
                "source_url": url,
                "title": _strip_html(entry.get("title", "")),
                "snippet": _strip_html(entry.get("summary", "")),
                "published_at": _parse_rss_date(entry.get("published")),
            }
        )

    seen = _get_seen_urls("google_news")
    fresh = [a for a in articles if a["source_url"] not in seen]
    if fresh:
        _store_articles(fresh)
    log.info("Google News: %d new articles (%d scanned)", len(fresh), len(articles))
    return len(fresh)


# ── 3. Geocoding (Nominatim) ──────────────────────────
@shared_task
def geocode_locations():
    """
    Fill in missing coordinates for locations using Nominatim.
    Rate limit: max 1 request per second (Nominatim usage policy).
    """
    conn = db()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, region, district FROM locations
        WHERE latitude IS NULL OR longitude IS NULL
        LIMIT 50
        """
    )
    rows = cur.fetchall()
    if not rows:
        conn.close()
        return 0

    updated = 0
    import time

    for loc_id, name, region, district in rows:
        query = ", ".join(part for part in (name, district, region, "Tanzania") if part)
        try:
            res = requests.get(
                NOMINATIM,
                params={"q": query, "format": "json", "limit": 1},
                headers=NOMINATIM_HEADERS,
                timeout=30,
            )
            res.raise_for_status()
            results = res.json()
            time.sleep(1.1)  # be polite — Nominatim requires this

            if not results:
                continue

            result = results[0]
            cur.execute(
                "UPDATE locations SET latitude=%s, longitude=%s WHERE id=%s",
                (float(result["lat"]), float(result["lon"]), loc_id),
            )
            updated += 1
        except Exception as exc:  # noqa: BLE001
            log.warning("Geocode failed for '%s': %s", query, exc)

    conn.commit()
    conn.close()
    log.info("Geocoded %d/%d locations", updated, len(rows))
    return updated


# ── 4. Fuzzy Name Matching ────────────────────────────
@shared_task
def fuzzy_match_names():
    """
    For each new OSINT article, try to match mentioned names against the
    persons table using fuzzy string matching (rapidfuzz).
    """
    conn = db()
    cur = conn.cursor()

    cur.execute("SELECT id, full_name FROM persons")
    persons = cur.fetchall()
    if not persons:
        conn.close()
        return 0

    person_names = {str(row[0]): row[1] for row in persons}

    cur.execute(
        """
        SELECT id, title, snippet FROM osint_matches
        WHERE reviewed = FALSE AND match_score IS NULL
        LIMIT 100
        """
    )
    articles = cur.fetchall()

    matches_found = 0
    for art_id, title, snippet in articles:
        text = f"{title} {snippet}".lower()

        best_score = 0
        best_person_id = None

        for pid, pname in person_names.items():
            score = fuzz.partial_ratio(pname.lower(), text)
            if score > best_score:
                best_score = score
                best_person_id = pid

        if best_score >= 70 and best_person_id:
            cur.execute(
                """UPDATE osint_matches
                   SET person_id = %s, match_score = %s
                   WHERE id = %s""",
                (best_person_id, best_score, art_id),
            )
            matches_found += 1

    conn.commit()
    conn.close()
    log.info(
        "Fuzzy matching: %d potential matches from %d articles",
        matches_found,
        len(articles),
    )
    return matches_found


# ── 5. Daily Alert Digest ─────────────────────────────
@shared_task
def send_daily_alert():
    """
    Compile new matches from the last 24 h and send a digest to admin
    Signal numbers via the Signal bot (signal-cli-rest-api).
    """
    import httpx

    conn = db()
    cur = conn.cursor()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    cur.execute(
        """
        SELECT om.title, om.source_url, om.match_score,
               p.full_name, om.source_type
        FROM osint_matches om
        JOIN persons p ON p.id = om.person_id
        WHERE om.created_at > %s AND om.reviewed = FALSE
        ORDER BY om.match_score DESC NULLS LAST
        LIMIT 20
        """,
        (cutoff,),
    )
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return 0

    lines = [f"🔔 OSINT Alert – {len(rows)} new potential matches\n"]
    for title, url, score, name, source in rows:
        score_text = f"{score:.0f}%" if score is not None else "?"
        lines.append(f"• {name} ({score_text} match)\n  {title}\n  {url}\n")

    message = "\n".join(lines)

    admin_numbers = os.getenv("ALERT_SIGNAL_NUMBERS", "").split(",")
    for num in admin_numbers:
        num = num.strip()
        if not num:
            continue
        try:
            httpx.post(
                f"{os.getenv('SIGNAL_API', 'http://127.0.0.1:8080')}/v2/send",
                json={
                    "message": message,
                    "number": os.getenv("BOT_NUMBER", ""),
                    "recipients": [num],
                },
                timeout=10,
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("Failed to send alert to %s: %s", num, exc)

    return len(rows)


# ── Helpers ─────────────────────────────────────────────
def _get_seen_urls(source_type: str) -> set:
    conn = db()
    cur = conn.cursor()
    cur.execute(
        "SELECT source_url FROM osint_matches WHERE source_type = %s",
        (source_type,),
    )
    urls = {row[0] for row in cur.fetchall()}
    conn.close()
    return urls


def _store_articles(articles: list) -> None:
    conn = db()
    cur = conn.cursor()
    for art in articles:
        try:
            cur.execute(
                """INSERT INTO osint_matches
                       (source_type, source_url, title, snippet, published_at)
                   VALUES (%(source_type)s, %(source_url)s, %(title)s,
                           %(snippet)s, %(published_at)s)
                   ON CONFLICT (source_url) DO NOTHING""",
                art,
            )
        except psycopg2.Error as exc:
            log.warning("Could not store article %s: %s", art["source_url"], exc)
    conn.commit()
    conn.close()


def _parse_gdelt_date(raw) -> datetime | None:
    """GDELT seendate format: YYYYMMDDHHMMSS."""
    if not raw:
        return None
    try:
        return datetime.strptime(str(raw)[:14], "%Y%m%d%H%M%S").replace(
            tzinfo=timezone.utc
        )
    except ValueError:
        return None


def _parse_rss_date(raw) -> datetime | None:
    if not raw:
        return None
    try:
        from email.utils import parsedate_to_datetime

        return parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        return None


def _strip_html(html: str) -> str:
    if not html:
        return ""
    return BeautifulSoup(html, "lxml").get_text(separator=" ", strip=True)[:500]


