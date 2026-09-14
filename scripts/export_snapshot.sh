#!/usr/bin/env bash
# scripts/export_snapshot.sh
# PART 5 — Nightly snapshot pipeline (runs on the VPS via cron).
#
#   1. Export every PUBLISHED case from Postgres as JSON
#   2. Copy it into the static site as the offline fallback
#   3. Rebuild the static site
#   4. Pin the new build to IPFS (Pinata)
#   5. Archive it permanently on Arweave
#   6. Log the CID (tamper-evident history in snapshots.log)
#
# Crontab (every night 02:00 UTC):
#   0 2 * * * cd /srv/missing-persons-tz && ./scripts/export_snapshot.sh >> /var/log/snapshot.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

DB_URL="${DATABASE_URL:-postgresql://mp:mp@localhost:5432/missing_persons}"
SNAPSHOT="data/fallback-persons.json"

# ── 1. Export published persons as one JSON array ──────────
psql "$DB_URL" -Atc "
  SELECT COALESCE(json_agg(t), '[]'::json)
  FROM (
    SELECT p.id,
           p.full_name,
           p.age,
           p.gender,
           p.photo_url,
           p.last_seen_date,
           p.status,
           p.description,
           p.circumstances,
           p.tags,
           json_build_object(
             'id', l.id,
             'name', l.name,
             'latitude', l.latitude,
             'longitude', l.longitude,
             'region', l.region,
             'district', l.district,
             'country', l.country
           ) AS last_seen_location,
           p.created_at,
           p.updated_at
    FROM persons p
    LEFT JOIN locations l ON l.id = p.location_id
    WHERE p.is_published = TRUE
    ORDER BY p.last_seen_date DESC
  ) t;
" > "$SNAPSHOT"

# ── 2. Validate the snapshot is valid JSON ─────────────────
node -e "JSON.parse(require('fs').readFileSync('$SNAPSHOT','utf8'))" \
  || { echo "✖ Snapshot export produced invalid JSON — aborting"; exit 1; }

COUNT=$(node -p "JSON.parse(require('fs').readFileSync('$SNAPSHOT','utf8')).length")
echo "→ Exported $COUNT published cases"

# ── 3. Rebuild the static site with the fresh snapshot ─────
npm run build

# ── 4. Pin to IPFS ─────────────────────────────────────────
node scripts/deploy-ipfs.mjs

# ── 5. Permanent Arweave archive ───────────────────────────
node scripts/archive-arweave.mjs || echo "! Arweave archive failed — IPFS pin still valid"

# ── 6. Append to the snapshot log ──────────────────────────
CID=$(node -p "JSON.parse(require('fs').readFileSync('deploy-info.json','utf8')).cid")
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') $CID" >> snapshots.log
echo "✔ Snapshot complete: $CID"
