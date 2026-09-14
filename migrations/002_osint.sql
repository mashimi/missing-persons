-- migrations/002_osint.sql
-- PART 13.3 — OSINT enrichment schema (news scans, fuzzy matches, review)

CREATE TABLE IF NOT EXISTS osint_matches (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type  TEXT NOT NULL
                 CHECK (source_type IN ('gdelt', 'google_news', 'manual')),
    source_url   TEXT NOT NULL,
    title        TEXT NOT NULL,
    snippet      TEXT,
    published_at TIMESTAMPTZ,
    person_id    UUID REFERENCES persons(id) ON DELETE SET NULL,
    match_score  REAL,                                -- 0–100 rapidfuzz score
    reviewed     BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One article = one row, ever (dedup across scans)
CREATE UNIQUE INDEX IF NOT EXISTS idx_osint_source_url
    ON osint_matches (source_url);

CREATE INDEX IF NOT EXISTS idx_osint_pending_review
    ON osint_matches (reviewed, match_score DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_osint_person
    ON osint_matches (person_id)
    WHERE person_id IS NOT NULL;
