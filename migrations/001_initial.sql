-- migrations/001_initial.sql
-- PART 3.1 — Missing Persons Registry: full initial schema
-- Target: postgis/postgis:15-3.4 (PostGIS optional; plain lat/lng always kept)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Optional but recommended on the postgis image:
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Locations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    latitude    NUMERIC(9, 6),
    longitude   NUMERIC(9, 6),
    geography   GEOGRAPHY(POINT, 4326),  -- generated below from lat/lng when available
    region      TEXT,
    district    TEXT,
    country     TEXT NOT NULL DEFAULT 'Tanzania',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Persons (the public registry) ─────────────────────────
CREATE TABLE IF NOT EXISTS persons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       TEXT NOT NULL,
    slug            TEXT UNIQUE,                -- optional URL-friendly id
    age             SMALLINT CHECK (age IS NULL OR age BETWEEN 0 AND 120),
    gender          TEXT NOT NULL DEFAULT 'unknown'
                    CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    photo_url       TEXT,
    last_seen_date  DATE,
    location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'missing'
                    CHECK (status IN ('missing', 'found_alive', 'found_deceased', 'unknown')),
    description     TEXT,
    circumstances   TEXT,
    family_contact  TEXT,                       -- withheld unless family consented
    tags            TEXT[] NOT NULL DEFAULT '{}',
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,   -- draft until verified by 2 sources
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Encrypted tip reports (verification workflow) ─────────
CREATE TABLE IF NOT EXISTS tip_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source              TEXT NOT NULL DEFAULT 'web'
                        CHECK (source IN ('web', 'signal')),
    sender_hint         TEXT,                   -- HASHED sender ref — never a raw number
    encrypted_content   TEXT NOT NULL,          -- PGP-armored blob; server cannot read it
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'verified', 'rejected', 'published')),
    verified_by         UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    verified_at         TIMESTAMPTZ,
    published_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Admin users (password + TOTP) ─────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,                -- bcrypt
    totp_secret   TEXT NOT NULL,                -- base32 TOTP secret
    role          TEXT NOT NULL DEFAULT 'reviewer'
                  CHECK (role IN ('admin', 'reviewer', 'viewer')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

-- ── Contributors (verified external partners) ─────────────
CREATE TABLE IF NOT EXISTS contributors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    TEXT UNIQUE NOT NULL,
    org_name    TEXT,
    signal_hash TEXT,                           -- SHA-256 of their Signal number
    is_trusted  BOOLEAN NOT NULL DEFAULT FALSE, -- trusted contributors may add drafts
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Audit log (every admin action) ────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id         BIGSERIAL PRIMARY KEY,
    actor      TEXT NOT NULL,                   -- admin username (never an IP)
    action     TEXT NOT NULL,                   -- login | verify | reject | publish | ...
    entity     TEXT,                            -- tip_report | person | osint_match
    entity_id  UUID,
    details    JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_persons_status        ON persons (status);
CREATE INDEX IF NOT EXISTS idx_persons_published     ON persons (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_persons_last_seen     ON persons (last_seen_date DESC);
CREATE INDEX IF NOT EXISTS idx_persons_name_trgm     ON persons USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_persons_fts           ON persons
    USING gin (to_tsvector('english', coalesce(description, '') || ' ' || coalesce(circumstances, '')));
CREATE INDEX IF NOT EXISTS idx_locations_region      ON locations (region);
CREATE INDEX IF NOT EXISTS idx_tip_reports_status    ON tip_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created     ON audit_log (created_at DESC);

-- ── updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_persons_updated_at
    BEFORE UPDATE ON persons
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Keep the geography column in sync with lat/lng (PostGIS optional)
CREATE OR REPLACE FUNCTION sync_location_geography() RETURNS trigger AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geography = ST_SetSRID(
            ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision),
            4326
        )::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_locations_geography
    BEFORE INSERT OR UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION sync_location_geography();

COMMIT;

-- ── 3.3 Useful views ───────────────────────────────────────
-- Public API feed (matches the frontend Person type)
CREATE OR REPLACE VIEW v_published_persons AS
SELECT p.id,
       p.full_name,
       p.age,
       p.gender,
       p.photo_url,
       p.last_seen_date,
       p.status,
       p.description,
       p.circumstances,
       p.family_contact,
       p.tags,
       p.created_at,
       p.updated_at,
       l.id   AS location_id,
       l.name AS location_name,
       l.latitude,
       l.longitude,
       l.region,
       l.district,
       l.country
FROM persons p
LEFT JOIN locations l ON l.id = p.location_id
WHERE p.is_published = TRUE;

-- Stats for the dashboard + home page
CREATE OR REPLACE VIEW v_case_stats AS
SELECT
    COUNT(*)                                                              AS total_cases,
    COUNT(*) FILTER (WHERE status = 'missing')                            AS missing,
    COUNT(*) FILTER (WHERE status = 'found_alive')                        AS found_alive,
    COUNT(*) FILTER (WHERE status = 'found_deceased')                     AS found_deceased,
    COUNT(*) FILTER (WHERE last_seen_date >= now() - INTERVAL '30 days')  AS last_30_days,
    COUNT(*) FILTER (WHERE last_seen_date >= now() - INTERVAL '7 days')   AS last_7_days
FROM persons
WHERE is_published = TRUE;

CREATE OR REPLACE VIEW v_cases_by_region AS
SELECT l.region,
       COUNT(*) AS cases
FROM persons p
JOIN locations l ON l.id = p.location_id
WHERE p.is_published = TRUE
GROUP BY l.region
ORDER BY cases DESC;

-- ── 3.4 Row-Level Security (optional hardening) ───────────
-- The API connects as role `mp`; report contents must only be readable by
-- admins. Enable these statements if you run the DB with per-role access:
--
-- ALTER TABLE tip_reports ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tip_reports_admin_read ON tip_reports
--     FOR SELECT USING (pg_has_role(current_user, 'mp_admin', 'member'));
-- CREATE POLICY tip_reports_insert ON tip_reports
--     FOR INSERT WITH CHECK (TRUE);   -- anyone may insert (encrypted) tips
--
-- ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY audit_admin_only ON audit_log
--     FOR SELECT USING (pg_has_role(current_user, 'mp_admin', 'member'));

