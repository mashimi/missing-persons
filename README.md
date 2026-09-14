# Missing Persons Registry — Tanzania
### Rejista ya Watu Waliopotea — Tanzania

![Deploy](https://github.com/mashimi/missing-persons/actions/workflows/deploy.yml/badge.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%20%2B%20PostGIS-336791)
![IPFS](https://img.shields.io/badge/mirror-IPFS-65c2cb)
![Arweave](https://img.shields.io/badge/archive-Arweave-2D5B5E)
![Tor](https://img.shields.io/badge/mirror-.onion-7D4698)
![PWA](https://img.shields.io/badge/PWA-offline--ready-5A0FC8)

A **censorship-resistant**, civil-society registry that documents enforced
disappearances in Tanzania — built so that no single server, domain,
registrar, or hosting company can take the record down.

*"Kurekodi uteshaji wa watu. Kila jina lina umuhimu."*
("Documenting enforced disappearances. Every name matters.")

---

## Table of contents

1. [What this project is](#1-what-this-project-is)
2. [Threat model — why "censorship-resistant"](#2-threat-model--why-censorship-resistant)
3. [Architecture](#3-architecture)
4. [Feature highlights](#4-feature-highlights)
5. [Tech stack](#5-tech-stack)
6. [Repository layout](#6-repository-layout)
7. [Quick start — public site only](#7-quick-start--public-site-only)
8. [Full stack with Docker](#8-full-stack-with-docker)
9. [Admin dashboard](#9-admin-dashboard)
10. [How an anonymous tip flows](#10-how-an-anonymous-tip-flows)
11. [Database schema](#11-database-schema)
12. [API reference](#12-api-reference)
13. [OSINT enrichment](#13-osint-enrichment)
14. [Deployment & mirrors](#14-deployment--mirrors)
15. [Environment variables](#15-environment-variables)
16. [One-time setup: PGP keypair & first admin](#16-one-time-setup-pgp-keypair--first-admin)
17. [Safety & verification principles](#17-safety--verification-principles)
18. [Deployment checklist](#18-deployment-checklist)
19. [Mirroring this registry](#19-mirroring-this-registry)
20. [Contributing & security](#20-contributing--security)
21. [License](#21-license)

---

## 1. What this project is

The Missing Persons Registry — Tanzania is a platform for documenting cases
of people who have been abducted or have disappeared, when the official
record is absent or unreliable. It is maintained by civil-society
volunteers and designed around three hard requirements:

1. **The record must survive.** Every published case is exported as a
   tamper-evident JSON snapshot and mirrored to IPFS, Arweave, and Tor.
   Anyone can re-host it; no authority can call one company and make it
   disappear.
2. **Tipsters must be safe.** Reports are encrypted with PGP *in the
   browser* before they ever touch the network, can be submitted over Tor
   or Signal, and the backend never stores submitter IP addresses or raw
   phone numbers.
3. **Only verified cases are published.** Every case requires at least two
   independent sources (or family confirmation) and explicit family
   consent before it appears in the public registry.

The system consists of a public static website, a FastAPI backend, a Signal
tip-line bot, an automated OSINT enrichment pipeline, an admin verification
dashboard, and a CI pipeline that publishes each build to three
independent mirrors.

---

## 2. Threat model — why "censorship-resistant"

A traditional website (one server, one domain, one hosting company) can be
shut down with one phone call. This project removes every single point of
control:

| Layer | Weak version | This project |
|---|---|---|
| Hosting | One VPS | Static site pinned to **IPFS**, permanently archived on **Arweave**, mirrored as a **Tor hidden service**; any volunteer can re-pin the same CID |
| DNS | `.com` / `.tz` registrar | **ENS** name (e.g. `missingpersons-tz.eth`) pointing at the IPFS CID — no registrar can seize it. A regular domain may exist as a *convenience alias only* |
| Data | Single database | Nightly snapshot export (`scripts/export_snapshot.sh`) → IPFS + Arweave, with a logged, tamper-evident CID history (`snapshots.log`) |
| Frontend availability | Server must be online | The site is a **PWA with a service worker** and ships a bundled snapshot (`src/data/fallback-persons.json`), so it renders from cache or IPFS even with the backend offline |
| Tipster identity | Server logs IPs | **PGP encryption in the browser**, no IP logging on `/api/reports`, Signal tips identified only by a truncated SHA-256 hash |

---

## 3. Architecture

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
| `api/` | FastAPI backend (published cases, encrypted reports, admin workflow, audit log) |
| `admin/` | Admin verification dashboard (separate Next.js app — **never** hosted on IPFS) |
| `bot/` | Signal tip-line bot |
| `osint/` | Celery worker + beat for automated enrichment |
| `migrations/` | PostgreSQL schema (registry + OSINT), auto-applied on first DB start |
| `scripts/` | IPFS pin, ENS update, Arweave archive, nightly snapshot export |
| `tor/` | Hidden service config |
| `.github/workflows/deploy.yml` | Build → IPFS → ENS → Arweave CI |

## 4. Feature highlights

### Public website (`src/`)
- **Interactive map** — Leaflet + OpenStreetMap (`MapView`) plotting
  last-seen locations of every published case.
- **Searchable registry** — `PersonList` / `PersonCard` with live search
  (`SearchBar`) and full profile pages (`/persons/[id]`).
- **Encrypted report form** — `/submit` collects case details (including an
  optional photo) and PGP-encrypts everything in the browser via
  `openpgp.js` (`src/lib/pgp.ts`) before sending.
- **Bilingual** — English / Swahili switcher backed by
  `src/i18n/locales/en.json` + `sw.json`.
- **Progressive Web App** — installable (`PWAInstallPrompt`), offline page
  (`public/offline.html`), service worker (`public/sw.js`), and an
  IndexedDB case cache (`src/lib/idb.ts`).
- **Zero-backend mode** — every data fetch falls back to the bundled
  snapshot (`src/data/fallback-persons.json`), so the site is fully
  functional from IPFS with no API at all.
- **Fully static output** — `next build` produces `out/` (no server
  required), ready for any static host or IPFS.

### Backend & operations
- **FastAPI** (`api/`) — public endpoints serve *only* published cases;
  tips are stored as opaque PGP blobs; admin actions require a session and
  are written to an audit log.
- **Verification workflow** — pending → verified → rejected → published,
  with report decryption reserved for the admin dashboard.
- **Signal tip-line bot** (`bot/`) — anonymous tips via Signal, PGP
  encrypted by the bot, sender number never stored (SHA-256 hash only),
  `HELP`/`STOP` commands and per-hour rate limiting.
- **OSINT enrichment** (`osint/`) — Celery tasks scan GDELT + Google News,
  geocode locations via Nominatim, fuzzy-match articles to persons
  (rapidfuzz ≥ 70), and send daily Signal digests to admins.
- **Admin dashboard** (`admin/`) — separate Next.js app (port 3001) with
  bcrypt + TOTP 2FA login, stats, reports queue, persons CRUD, OSINT
  review, and audit trail.

---

## 5. Tech stack

| Layer | Technology |
|---|---|
| Public site | Next.js 14 (App Router, static export), React 18, TypeScript |
| Styling | Tailwind CSS 3 + PostCSS |
| Map | Leaflet 1.9 + react-leaflet (OpenStreetMap tiles) |
| Data fetching | SWR + axios, IndexedDB caching |
| Encryption | openpgp.js 5 (in-browser), PGPy (bot), PGP private key on server |
| Backend | Python FastAPI + asyncpg (PostgreSQL) + Redis |
| Database | PostgreSQL 15 + PostGIS 3.4 + pg_trgm (fuzzy search) |
| Task queue | Celery (worker + beat) on Redis |
| OSINT sources | GDELT 2.0 DOC API, Google News RSS, Nominatim geocoding, rapidfuzz |
| Tip line | signal-cli-rest-api + custom Python bot |
| Decentralized hosting | IPFS (Pinata), Arweave, Tor hidden service |
| Decentralized naming | ENS (Ethereum Name Service) via ethers.js |
| CI/CD | GitHub Actions → build → IPFS → ENS → Arweave |
| Containerization | Docker Compose (7 services) |

---

## 6. Repository layout

```
missing-persons-tz/
├── src/                        # Public website (Next.js 14, static export)
│   ├── app/                    # Routes: /, /persons, /persons/[id], /submit, /about
│   ├── components/             # MapView, PersonList, SearchBar, Navbar, Footer, PWA prompt…
│   ├── lib/                    # api.ts (fetch + fallback), pgp.ts (encryption), idb.ts, ipfs.ts
│   ├── i18n/                   # I18nProvider + en.json / sw.json
│   └── data/                   # fallback-persons.json — bundled snapshot for offline/IPFS mode
├── public/                     # manifest.json, sw.js, offline.html, icons, PGP public key
├── api/                        # FastAPI backend
│   ├── main.py                 # persons CRUD (public read / admin write), stats, reports, snapshot
│   ├── auth.py                 # login, TOTP 2FA setup, sessions, audit log
│   ├── verification.py         # reports queue: verify / reject / publish
│   └── osint.py                # OSINT match review endpoints
├── admin/                      # Admin verification dashboard (separate Next.js app, port 3001)
│   └── app/                    # login, dashboard, reports, persons, osint, audit pages
├── bot/                        # Signal tip-line bot (signal_bot.py)
├── osint/                      # Celery worker + beat (tasks.py, celery_app.py)
├── migrations/                 # 001_initial.sql (registry), 002_osint.sql (OSINT schema)
├── scripts/                    # deploy-ipfs.mjs, update-ens.mjs, archive-arweave.mjs, export_snapshot.sh
├── tor/                        # torrc — hidden service pointing at the static site
├── docker-compose.yml          # Full stack: postgres, redis, fastapi, bot, celery, tor
└── .github/workflows/deploy.yml  # CI: build → IPFS → ENS → Arweave
```

## 7. Quick start — public site only

Requires **Node.js 18+** (Node 20 recommended).

```bash
npm install
npm run dev            # http://localhost:3000

npm run build          # static export → out/
```

The site works fully from its bundled snapshot
(`src/data/fallback-persons.json`) when the API is unreachable — so it can
be hosted on IPFS with zero backend. Point it at a live API with
`NEXT_PUBLIC_API_URL` (see [Environment variables](#15-environment-variables)).

---

## 8. Full stack with Docker

Docker Compose starts the entire backend: PostgreSQL (+PostGIS), Redis,
FastAPI, the Signal tip line, the Celery OSINT workers, and a Tor mirror.
Migrations are applied automatically on first database start.

```bash
cp .env.example .env            # then edit DB_PASSWORD, BOT_NUMBER, …
docker compose up -d

# verify the API
curl http://localhost:8000/healthz

# get the .onion address of the mirror
docker compose exec tor cat /var/lib/tor/registry/hostname
```

| Service | Image / build | Port | Purpose |
|---|---|---|---|
| `postgres` | `postgis/postgis:15-3.4` | 127.0.0.1:5432 | Primary database; `migrations/` auto-applied on first start |
| `redis` | `redis:7-alpine` | 127.0.0.1:6379 | Celery broker + admin sessions |
| `fastapi` | `./api` | 127.0.0.1:8000 | REST API (persons, reports, admin workflow) |
| `signal-cli-rest-api` | `bbernhard/signal-cli-rest-api` | 127.0.0.1:8080 | Signal gateway for the tip line |
| `signal-bot` | `./bot` | — | Anonymous tip intake over Signal |
| `celery-worker` | `./osint` | — | OSINT enrichment tasks |
| `celery-beat` | `./osint` | — | Task scheduler (schedules in §13) |
| `tor` | `dperson/torproxy` | 127.0.0.1:9050 | `.onion` mirror of the static site |

All ports are bound to `127.0.0.1` — put a reverse proxy in front for
public access.

---

## 9. Admin dashboard

```bash
cd admin
npm install
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8000 npm run dev   # :3001
```

Pages: **login** (password + TOTP) → **dashboard stats** → **reports
queue** (decrypt → verify → reject → publish) → **persons CRUD** →
**OSINT review** → **audit trail**.

> ⚠️ **The dashboard is NOT statically exported and must never be hosted
> on IPFS.** Serve it on a private network / behind VPN only. The PGP
> private key (`api/keys/server-priv.asc`) lives only on the verification
> server.

---

## 10. How an anonymous tip flows

1. A tipster opens `/submit` (ideally over Tor) or messages the Signal bot.
2. The report payload — case details, optional photo, optional contact —
   is serialized and **encrypted with the server's PGP public key inside
   the browser** (`src/lib/pgp.ts`). The plaintext never crosses the
   network.
3. `POST /api/reports` stores **only the armored ciphertext blob** (plus
   source and an optional sender *hint*). No IP address is logged; the
   Signal bot reduces the sender to a truncated SHA-256 hash.
4. An admin opens the report in the dashboard; the server decrypts it with
   the offline-held private key for review only.
5. After human verification (≥ 2 independent sources / family
   confirmation), the admin publishes the case — it then appears in the
   public API, the website, and the next nightly snapshot.
6. Automated OSINT (news scans + fuzzy matching) may attach related
   articles to the case, but **machine matches are never published
   directly** — a human reviews every one.

## 11. Database schema

Defined in `migrations/` and applied automatically on first Postgres start.

| Table | Purpose |
|---|---|
| `locations` | Last-seen places with lat/lng + PostGIS geography column (auto-synced by trigger), region/district |
| `persons` | The public registry: name, age, gender, status (`missing` / `found_alive` / `found_deceased` / `unknown`), description, tags, `is_published` flag |
| `tip_reports` | Encrypted tips: source (`web`/`signal`), PGP blob, status (`pending`/`verified`/`rejected`/`published`), sender hint (hashed) |
| `admin_users` | bcrypt password hash + base32 TOTP secret + role (`admin`/`reviewer`/`viewer`) |
| `contributors` | Verified external partners |
| `audit_log` | Every admin action (actor = username, never an IP) |
| `osint_matches` | GDELT / Google News articles (deduped by URL), rapidfuzz match score, review state |

Useful views: `v_published_persons` (public API feed), `v_case_stats`
(dashboard/homepage stats), `v_cases_by_region`. Optional row-level
security policies for `tip_reports` and `audit_log` are included as
comments in `001_initial.sql`.

---

## 12. API reference

FastAPI, interactive docs at `http://localhost:8000/docs`.

### Public (no auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Liveness probe |
| `GET` | `/api/persons` | Published cases, paginated (`?page`, `?page_size`, `?search`) |
| `GET` | `/api/persons/{id}` | One published case |
| `GET` | `/api/stats` | Aggregate stats (`v_case_stats`) |
| `GET` | `/api/snapshot` | Full JSON snapshot of published cases (seeds the static bundle) |
| `POST` | `/api/reports` | Submit an **encrypted** tip (202 Accepted; ciphertext only) |

### Admin (session token from `POST /api/admin/login`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Password + TOTP → session token (8 h TTL) |
| `POST` | `/api/admin/logout` | Invalidate session |
| `POST` | `/api/admin/2fa/setup` | Rotate TOTP secret |
| `GET` | `/api/admin/audit` | Audit trail |
| `GET` | `/api/admin/reports` | Verification queue |
| `GET` | `/api/admin/reports/{id}` | Decrypt + inspect one report |
| `POST` | `/api/admin/reports/{id}/verify` | Mark a report verified |
| `POST` | `/api/admin/reports/{id}/reject` | Reject a report |
| `POST` | `/api/admin/reports/{id}/publish` | Publish → creates the public person record |
| `POST` | `/api/persons` · `PATCH` / `DELETE /api/persons/{id}` | Persons CRUD (admin) |
| `GET` | `/api/admin/osint/matches` | Machine matches for review |
| `POST` | `/api/admin/osint/matches/{id}/review` | Accept / reject a match |

---

## 13. OSINT enrichment

Runs automatically via Celery beat (UTC):

| Job | Schedule |
|---|---|
| GDELT 2.0 DOC API scan | every 6 h |
| Google News RSS scan | every 6 h (offset 30 min) |
| Geocoding (Nominatim, ≤ 1 req/s) | every 12 h |
| Fuzzy name matching (rapidfuzz partial_ratio ≥ 70) | daily 03:00 |
| Signal alert digest to admin numbers | daily 07:00 |

Search terms are deliberately conservative (Tanzania + major cities ×
abduction/disappearance vocabulary) to keep noise low. Articles are
deduplicated by URL in `osint_matches`; every machine match must be
reviewed by a human in the admin dashboard (`/osint`) before it is linked
to a case — automated matching is **never** published directly.

## 14. Deployment & mirrors

### CI pipeline (`.github/workflows/deploy.yml`)

On every push to `main` (or manual `workflow_dispatch`):

1. `npm ci` + `npm run build` → static export in `out/`
2. Pin `out/` to IPFS via **Pinata** (`scripts/deploy-ipfs.mjs`)
3. Rebuild so the footer embeds the fresh IPFS CID, then re-pin the final
   build (the CID changes because of the embedded CID)
4. Update the **ENS contenthash** (`scripts/update-ens.mjs`) when
   `ENS_PRIVATE_KEY` is configured
5. Archive the build **permanently on Arweave**
   (`scripts/archive-arweave.mjs`) when `ARWEAVE_WALLET` is configured
6. Publish `deploy-info.json` + `arweave-info.json` as a workflow artifact

### Manual deployment

```bash
npm run deploy:all        # build + ipfs + ens + arweave
npm run deploy:ipfs       # pin out/ via Pinata (needs PINATA_JWT)
npm run deploy:ens        # update ENS contenthash
npm run deploy:arweave    # permanent archive (needs wallet.json)
```

### Nightly snapshot pipeline (VPS cron)

`scripts/export_snapshot.sh` (suggested crontab: 02:00 UTC) exports every
published case from Postgres to `src/data/fallback-persons.json`,
validates the JSON, rebuilds the static site, re-pins to IPFS, archives
on Arweave, and appends the new CID to `snapshots.log` — a tamper-evident
publication history.

### Tor hidden service

`tor/torrc` points the `.onion` mirror at the static site (port 3000).
After first start, get the address:

```bash
docker compose exec tor cat /var/lib/tor/registry/hostname
```

### Decentralized naming

The ENS name (e.g. `missingpersons-tz.eth`) resolves to the current IPFS
CID and cannot be seized by any registrar. A regular domain may be added
as a *convenience alias* — never rely on it alone; registries and
governments can seize those.

---

## 15. Environment variables

Copy `.env.example` → `.env` and fill in real values. **Never commit
real secrets** (`.gitignore` excludes `.env*`, `*.pem`, `*.key`,
`wallet.json`, and all key material).

### Frontend (Next.js build)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI base URL; leave empty to run purely from the bundled snapshot |
| `NEXT_PUBLIC_IPFS_GATEWAY` | Public IPFS gateway for mirror links |
| `NEXT_PUBLIC_PGP_PUBLIC_KEY_URL` | URL of the armored server public key (default `/keys/server-pub.asc`) |

### Deployment scripts / CI secrets

| Variable | Purpose |
|---|---|
| `PINATA_JWT` | pinata.cloud JWT for IPFS pinning |
| `ENS_DOMAIN` · `ENS_PRIVATE_KEY` · `ENS_PROVIDER_URL` · `ENS_RESOLVER_ADDRESS` | ENS contenthash updates |
| `ARWEAVE_WALLET` (CI) / `ARWEAVE_WALLET_PATH` (local `wallet.json`) | Arweave archiving |
| `IPFS_GATEWAY` | Gateway used by deploy scripts |

### Backend (Docker Compose)

| Variable | Purpose |
|---|---|
| `DB_PASSWORD` · `DATABASE_URL` | PostgreSQL credentials |
| `REDIS_URL` | Redis / Celery broker |
| `ADMIN_SESSION_SECRET` | Session signing (`openssl rand -hex 32`) |
| `PGP_PUBLIC_KEY_FILE` · `PGP_PRIVATE_KEY_FILE` · `PGP_PASSPHRASE` | PGP keypair paths + passphrase |
| `BOT_NUMBER` | Signal number registered to the bot |
| `SIGNAL_API` · `FASTAPI_URL` | Internal service URLs |
| `ALERT_SIGNAL_NUMBERS` | Comma-separated admin numbers for daily OSINT digests |
| `RATE_LIMIT_PER_HOUR` · `POLL_SECONDS` | Bot rate limiting / polling |

## 16. One-time setup: PGP keypair & first admin

### Generate the PGP keypair (offline)

Do this on an **air-gapped machine**; never let the private key touch a
networked laptop until it is placed on the verification server.

```bash
gpg --full-generate-key                       # choose ECC Curve25519 or RSA 3072
gpg --list-keys                               # note the fingerprint
gpg --armor --export  FINGERPRINT > server-pub.asc
gpg --armor --export-secret-keys FINGERPRINT > server-priv.asc
```

Place the files:

- `server-pub.asc` → `public/keys/server-pub.asc` (site) **and**
  `bot/keys/server-pub.asc` (bot)
- `server-priv.asc` → `api/keys/server-priv.asc` (verification server ONLY)

`.gitignore` already excludes all key material — double-check before any
push.

### Create the first admin (password + TOTP)

```sql
-- psql on the postgres container; use bcrypt + a random base32 secret
INSERT INTO admin_users (username, password_hash, totp_secret, role)
VALUES ('admin', '$2b$12$…bcrypt…', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', 'admin');
```

Generate the bcrypt hash with:

```bash
python -c "import bcrypt; print(bcrypt.hashpw(b'YOUR-PASSWORD', bcrypt.gensalt()).decode())"
```

Then call `POST /api/admin/2fa/setup` to rotate the TOTP secret through
the dashboard.

---

## 17. Safety & verification principles

- **Verification process:** every case requires ≥ 2 independent sources
  or family confirmation before publication.
- **Consent:** explicit family consent before publishing photos, names,
  or contacts. Some families are in danger — honour removal requests.
- **Anonymity:** the web form encrypts with PGP in the browser; the API
  never logs submitter IPs; Signal tips never expose the tipster number
  (only a SHA-256 hash).
- **Data minimisation:** store only what the public record needs.
- **Legal awareness:** consult a Tanzanian human-rights lawyer (e.g. the
  Legal and Human Rights Centre — LHRC, Dar es Salaam).
- **Operational security:** the team uses pseudonyms, separate devices,
  encrypted channels, and private repos (consider self-hosted Gitea).

---

## 18. Deployment checklist

| # | Task | Status |
|---|---|---|
| 1 | `docker compose up postgres redis` — verify DB | ☐ |
| 2 | Migrations applied on first start (001 + 002) | ☐ |
| 3 | Register the Signal bot number | ☐ |
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

---

## 19. Mirroring this registry

The more mirrors, the stronger the record. To run your own copy:

1. Get the latest CID from `deploy-info.json` / `public/ipfs-cid.json`.
2. `ipfs pin add <cid>` — or serve `out/` from any static host.
3. Optional: run your own Tor mirror and ENS record.

Document every mirror so the community knows where independent copies
live.

---

## 20. Contributing & security

- **Issues / PRs are welcome** — for code, tests, translations
  (especially Swahili), and documentation.
- **Do not post sensitive case information or tipster details in GitHub
  issues.** Case data flows only through the encrypted channels described
  in §10.
- **Security vulnerabilities:** report privately to the maintainers
  rather than opening a public issue.
- Contributors familiar with the operational context should follow the
  team's operational-security practices (pseudonyms, separate devices,
  encrypted channels).

---

## 21. License

A license has not been selected yet — all rights are reserved by the
maintainers until one is added. The intended spirit is that human-rights
organizations, mirrors, and researchers may reuse the software and data
freely for non-commercial documentation and advocacy; contact the
maintainers for anything beyond that.

---

*This registry is maintained by civil-society volunteers. Data is verified
before publication. If you have information about a case, use the secure
channels described above — your identity will be protected.*






