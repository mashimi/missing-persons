# Missing Persons Registry — Tanzania

A **censorship-resistant** registry documenting enforced disappearances in
Tanzania. Built so that no single server, domain, or hosting company can
take the record down.

## Architecture

```
TIPSTER (Signal / web form over Tor)        PUBLIC VISITORS
        │ encrypted with PGP in-browser          │
        ▼                                        ▼
   FastAPI /api/reports  ──►  PostgreSQL(+PostGIS) ──► verification workflow
        │                            │                      │
        │                            │                      ▼
        │                   nightly snapshot export       published cases
        │                   → IPFS (Pinata) + Arweave          │
        ▼                                                      ▼
   Celery OSINT (GDELT, Google News,          Next.js STATIC site (out/)
   geocoding, fuzzy matching, alerts)         pinned to IPFS + ENS + Tor
```

Components (all under this repo):

| Path | What it is |
|---|---|
| `src/` | Next.js static-export site (map, registry, profiles, encrypted submit form, PWA, EN/SW) |
| `public/` | manifest.json, service worker, offline page, PGP public key |
| `scripts/` | IPFS pin, ENS update, Arweave archive, nightly snapshot |
| `migrations/` | PostgreSQL schema (registry + OSINT) |
| `api/` | FastAPI backend (persons, encrypted reports, admin workflow) |
| `bot/` | Signal tip-line bot |
| `osint/` | Celery worker + beat for automated enrichment |
| `admin/` | Admin verification dashboard (separate Next.js app — never hosted on IPFS) |
| `tor/` | Hidden service config |
| `.github/workflows/deploy.yml` | Build → IPFS → ENS → Arweave CI |

## Quick start (public site only)

```bash
npm install
npm run dev            # http://localhost:3000

npm run build          # static export → out/
```

The site works fully from its bundled snapshot
(`src/data/fallback-persons.json`) when the API is unreachable — so it can
be hosted on IPFS with zero backend.

## Full stack with Docker

```bash
cp .env.example .env            # then edit DB_PASSWORD, BOT_NUMBER, …
docker compose up -d

# verify
curl http://localhost:8000/healthz
docker compose exec tor cat /var/lib/tor/registry/hostname   # .onion mirror
```

## Generate the PGP keypair (offline, one-time)

Do this on an **air-gapped machine**; never let the private key touch a
networked laptop until it is placed on the verification server.

```bash
gpg --full-generate-key                       # choose ECC Curve25519 or RSA 3072
gpg --list-keys                               # note the fingerprint
gpg --armor --export  FINGERPRINT > server-pub.asc
gpg --armor --export-secret-keys FINGERPRINT > server-priv.asc
```

Place the files:

- `server-pub.asc` → `public/keys/server-pub.asc` (site), `bot/keys/server-pub.asc` (bot)
- `server-priv.asc` → `api/keys/server-priv.asc` (verification server ONLY)

`.gitignore` already excludes all key material — double-check before any push.

## Create the first admin (password + TOTP)

```sql
-- psql on the postgres container; use bcrypt + a random base32 secret
INSERT INTO admin_users (username, password_hash, totp_secret, role)
VALUES ('admin', '$2b$12$…bcrypt…', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', 'admin');
```

Generate the bcrypt hash with `python -c "import bcrypt; print(bcrypt.hashpw(b'YOUR-PASSWORD', bcrypt.gensalt()).decode())"`.
Then call `POST /api/admin/2fa/setup` to rotate the TOTP secret and scan the
returned QR into your authenticator app.

## Nightly snapshot (PART 5)

On the VPS (outside Tanzania — Iceland / Switzerland / Netherlands):

```bash
# crontab -e
0 2 * * * cd /srv/missing-persons-tz && ./scripts/export_snapshot.sh >> /var/log/snapshot.log 2>&1
```

Every night it exports published cases → rebuilds the static site → pins to
IPFS → archives to Arweave → logs the CID in `snapshots.log` (tamper-evident
history).

## Decentralized deployment

```bash
npm run deploy:all        # build → Pinata IPFS → ENS contenthash → Arweave
```

Secrets needed (GitHub → Settings → Secrets, or local `.env.local`):

- `PINATA_JWT` — pinata.cloud JWT
- `ENS_DOMAIN`, `ENS_PRIVATE_KEY` — e.g. `missingpersons-tz.eth`
- `ARWEAVE_WALLET` — Arweave keyfile JSON (CI) / `wallet.json` (local)

A regular domain can be added as a *convenience alias* — never rely on it
alone; registries and governments can seize those.

## Tor hidden service

`tor/torrc` points the .onion mirror at the static site (port 3000). After
first start: `docker compose exec tor cat /var/lib/tor/registry/hostname`.

## OSINT enrichment

Runs automatically via Celery beat (UTC):

| Job | Schedule |
|---|---|
| GDELT scan | every 6 h |
| Google News RSS scan | every 6 h (offset 30 min) |
| Geocoding (Nominatim) | every 12 h |
| Fuzzy name matching (≥ 70) | daily 03:00 |
| Signal alert digest | daily 07:00 |

Review machine matches in the admin dashboard (`/osint`) — automated
matching is never published directly.

## Admin dashboard

```bash
cd admin
npm install
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8000 npm run dev   # :3001
```

Pages: login (password + TOTP) → dashboard stats → reports queue
(decrypt → verify → reject → publish) → persons CRUD → OSINT review →
audit trail. **The dashboard is NOT statically exported and must never be
hosted on IPFS** — serve it on a private network / behind VPN only.

## Deployment checklist

| # | Task | Status |
|---|---|---|
| 1 | `docker compose up postgres redis` — verify DB | ☐ |
| 2 | Migrations applied on first start (001 + 002) | ☐ |
| 3 | Register the Signal bot number (PART 11.3) | ☐ |
| 4 | Generate PGP keypair on air-gapped machine | ☐ |
| 5 | Place `server-pub.asc` in `bot/keys/` + `public/keys/` | ☐ |
| 6 | `docker compose up signal-bot` — send test tip | ☐ |
| 7 | `docker compose up fastapi` — verify `/api/reports` | ☐ |
| 8 | `docker compose up celery-worker celery-beat` | ☐ |
| 9 | Build admin dashboard, test login + TOTP | ☐ |
| 10 | Submit a test tip via Signal → verify encrypted storage | ☐ |
| 11 | Wait for first GDELT/Google News scan → check `osint_matches` | ☐ |
| 12 | Verify Signal alert digest arrives at admin number | ☐ |
| 13 | Configure Tor hidden service, test `.onion` access | ☐ |
| 14 | Run Lighthouse PWA audit on public site ≥ 90 | ☐ |
| 15 | End-to-end: tip → encrypt → store → verify → publish → OSINT match | ☐ |

## Safety & verification (critical — see infor.md PART 6)

- **Verification process:** every case requires ≥ 2 independent sources or
  family confirmation before publication.
- **Consent:** explicit family consent before publishing photos, names, or
  contacts. Some families are in danger — honour removal requests.
- **Anonymity:** the web form encrypts with PGP in the browser; the API
  never logs submitter IPs; Signal tips never expose the tipster number
  (only a SHA-256 hash).
- **Data minimisation:** store only what the public record needs.
- **Legal awareness:** consult a Tanzanian human-rights lawyer (e.g. the
  Legal and Human Rights Centre — LHRC, Dar es Salaam).
- **Operational security:** the team uses pseudonyms, separate devices,
  encrypted channels, and private repos (consider self-hosted Gitea).

## Mirroring this registry (the more mirrors the stronger)

1. Get the latest CID from `deploy-info.json` / `public/ipfs-cid.json`.
2. `ipfs pin add <cid>` — or serve `out/` from any static host.
3. Optional: run your own Tor mirror and ENS record.

Document every mirror so the community knows where independent copies live.

