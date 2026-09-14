# Contributing to the Missing Persons Registry — Tanzania

Thank you for wanting to help document enforced disappearances and keep
this record alive. This project is different from most open-source work:
**real people's safety depends on how we handle data.** Please read this
file carefully before your first contribution.

## ⚠️ Rule zero — safety before everything

- **Never post sensitive case information in GitHub issues, PRs, or
  comments.** No names of missing persons, no tipster details, no photos,
  no locations that are not already public.
- Case data only ever flows through the encrypted channels described in
  the README (§10): the PGP-encrypted web form or the Signal bot.
- Do not commit secrets: `.env`, `wallet.json`, `*.pem`, `*.key`, or any
  PGP key material. `.gitignore` blocks them — if you find a way around
  it, that's a bug, not a feature.
- Do not weaken any of the privacy properties in a PR (IP non-logging,
  sender hashing, in-browser encryption, published-only API reads).
  Proposals to change them need an explicit security discussion first.

## Ways to contribute

| Area | Examples |
|---|---|
| Code | Bug fixes, new features in `src/` (site), `api/` (FastAPI), `bot/`, `osint/`, `admin/` |
| Translations | Improve or extend the Swahili (`src/i18n/locales/sw.json`) and English (`en.json`) strings |
| Documentation | Clarify the README, code comments, runbooks for deployment/mirroring |
| Mirrors | Pin the latest CID, run a Tor mirror, document independent copies |
| Testing | Manual end-to-end runs of the [deployment checklist](README.md#18-deployment-checklist), report what broke |

## Development setup

See the [README](README.md#7-quick-start--public-site-only) for full
details. Short version:

```bash
# Public site (Node 18+/20)
npm install
npm run dev                # http://localhost:3000
npm run build              # static export → out/

# Full backend (Docker)
cp .env.example .env       # then edit DB_PASSWORD, BOT_NUMBER, …
docker compose up -d

# Admin dashboard (separate app, port 3001)
cd admin && npm install
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8000 npm run dev
```

Where things live:

| Path | What you'll touch |
|---|---|
| `src/` | Next.js 14 App Router pages, components, `lib/` (api, pgp, idb, ipfs), i18n |
| `api/` | FastAPI: `main.py` (persons/reports), `auth.py`, `verification.py`, `osint.py` |
| `bot/` | `signal_bot.py` — Signal tip intake |
| `osint/` | `tasks.py` + `celery_app.py` — GDELT/News scans, geocoding, matching |
| `admin/` | Admin dashboard pages under `admin/app/` |
| `migrations/` | SQL schema changes (numbered `00N_*.sql`) |

## Coding standards

### TypeScript / React (`src/`, `admin/`)
- Match the existing style: function components, hooks, TypeScript types
  in `src/lib/types.ts`.
- Keep the public site statically exportable: no server-only APIs in
  `src/` (`next.config.mjs` uses `output: "export"`).
- Run `npm run lint` (eslint-config-next / core-web-vitals) — builds skip
  linting, so run it explicitly.
- Any new user-facing string must be added to **both** `en.json` and
  `sw.json`.

### Python (`api/`, `bot/`, `osint/`)
- Match the existing module style: plain functions, `logging`, typed
  signatures where practical.
- Preserve the privacy invariants: `/api/reports` stores ciphertext only;
  never log IPs, raw phone numbers, or decrypted tip contents.
- API changes must keep the public endpoints backwards-compatible
  (`/api/persons`, `/api/snapshot`) or include a migration plan.
- Schema changes go in a new numbered file in `migrations/` and must be
  idempotent (`CREATE TABLE IF NOT EXISTS` …) since Postgres auto-applies
  them on first start.

## Commits & pull requests

- Use short, descriptive commits — e.g. `fix: retry OSINT scan on timeout`
  or `docs: expand mirroring guide`. Conventional-commit prefixes
  (`fix:`, `feat:`, `docs:`, `refactor:`) are appreciated but not
  enforced.
- Keep PRs focused: one feature or fix per PR, with a short description
  of what changed and why.
- If a PR touches anything security-relevant (auth, PGP, reports
  pipeline, admin dashboard), say so explicitly in the description.
- The repo's CI (`.github/workflows/deploy.yml`) builds and publishes to
  IPFS on every push to `main` — expect maintainers to merge into `main`
  carefully.

## Before you open a PR

```bash
npm run lint          # site lint passes
npm run build         # static export succeeds
cd admin && npm run build   # if you touched the admin app
```

For backend changes, if Docker is available, verify the stack still
comes up and `curl http://localhost:8000/healthz` returns `{"status":"ok"}`.

## Reporting security vulnerabilities

**Do not open a public issue.** Contact the maintainers privately
(see the repository owner's profile for contact details) with:

1. A description of the vulnerability
2. Steps to reproduce (safe ones — no real case data)
3. Any suggested fix

We treat the privacy of tipsters as the project's top priority; reports
in that area are triaged first.

## License

By contributing, you agree that your contributions will be licensed
under the [MIT License](LICENSE) that covers this repository.

---

*This registry is maintained by civil-society volunteers. Data is verified
before publication. If you have information about a case, do not post it
on GitHub — use the secure channels described in the
[README](README.md#10-how-an-anonymous-tip-flows).*

