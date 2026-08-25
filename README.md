# Sidekick

**Local-first admin PWA for freelancers** — bookings, clients, invoices, shop,
tax prep and docs, with an opt-in cloud backend (LINE booking integration,
Stripe subscription billing, teams) for when you outgrow a single device.

- **App:** static PWA in [`app/`](app/) — no build step, no framework, no
  runtime dependencies. Live on GitHub Pages
  (<https://gritui.github.io/Sidekickz>).
- **API:** the small set of Vercel Edge functions in [`api/`](api/) the app
  opts into (auth, bookings, billing, LINE, teams). Live on Vercel
  (<https://sidekickz.vercel.app>).
- **Database:** Neon Postgres over `@neondatabase/serverless`' HTTP driver —
  chosen specifically so bursty serverless traffic can never exhaust a
  connection pool.

## Repository layout

| Path | What lives there |
|---|---|
| `app/` | The PWA itself (`index.html`, feature modules, service worker, styles) |
| `api/` | One file per Vercel Edge function (`auth-*`, `billing-*`, `booking-*`, `line-*`, `team-*`, …) |
| `lib/` | Shared server modules (`db.js`, `auth.js`, `crudHandler.js`, `cors.js`, `rateLimit.js`, `autoMigrate.js`, …) |
| `sql/` | `schema-core.sql` — the single idempotent, additive-only schema |
| `tests/` | Playwright browser suites (`check-*.js`) + Node suites (`test-*.mjs`) + `run-all.sh` |
| `loop/` | AI-squad development process docs (backlog inbox, role handshakes, worker prompts) |
| `demo/` | Landing page for the app's demo mode |
| `.claude/skills/` | Claude Code skill used by the automation loop |

## Getting started

Requirements: **Node 22+**, and `python3` (used by the test suite's static
file server).

```bash
git clone https://github.com/GRITui/Sidekickz.git
cd Sidekickz
npm ci                # installs @neondatabase/serverless, stripe, playwright

# Frontend only: there is no build step — serve app/ statically, e.g.
npx serve app         # or any static file server pointed at app/
```

### Full stack (optional)

The app works locally with no backend at all. To exercise `api/` you need
the environment variables documented line-by-line in
[`.env.example`](.env.example): a Neon `DATABASE_URL` (the Vercel ↔ Neon
integration auto-provisions it in production), `SESSION_SECRET`, and — only
for the features you actually want to hit — Stripe and/or LINE credentials.

## Running the tests

```bash
bash tests/run-all.sh   # the full battery (~51 suites) — same gate CI uses
```

Two flavors live in [`tests/`](tests/) — see
[`tests/README.md`](tests/README.md) for details:

- `tests/check-*.js` — Playwright-driven browser suites against the app
  served statically (Chromium resolved via `PLAYWRIGHT_CHROMIUM_PATH` or
  Playwright's default lookup).
- `tests/test-*.mjs` — dependency-light Node suites exercising server
  modules directly (rate limiting, migrations, schema sync, entitlements,
  webhooks…), mostly with faked SQL clients so no database is required.

## Deployment

Both pipelines are GitHub Actions, least-privilege by default:

- **`.github/workflows/deploy-vercel.yml`** — every push to `main` runs the
  full test battery, then auto-deploys **staging**. Production deploys are
  `workflow_dispatch`-only (fired on demand), re-running the whole battery
  against the exact commit being promoted. PRs get preview builds plus an
  auto-comment with the preview URL.
- **`.github/workflows/deploy-pages.yml`** — assembles the combined GitHub
  Pages site: `main`'s `app/` at `/`, the `personal-gym-trainer-freelanz`
  branch's build at `/gym/`, and `demo/` at `/demo/`.

Schema changes ship as ordinary PRs: edit `sql/schema-core.sql`, regenerate
its verbatim Edge-safe embed in `lib/schemaSql.js` (the exact command is in
`tests/test-schema-sync.mjs`'s header), bump `SCHEMA_VERSION` in
`lib/migrate.js` — all in the same commit — and the next cold start applies
it automatically. Every statement is idempotent (`create/alter … if not
exists`), so re-applying an already-current schema is a harmless no-op
(see `.env.example` for the full story, including the manual fallback
endpoint and the `AUTO_MIGRATE=off` kill switch).

## Environment variables

Everything is documented inline in [`.env.example`](.env.example) — real
values belong only in the Vercel project dashboard, never in a committed
file. Notable knobs: `AUTO_MIGRATE=off` (skip auto-migration during
incidents), `SETUP_TOKEN` (temporarily enables `POST /api/admin-migrate`),
`CRON_SECRET` (gates `/api/cron-reminders`).

## License

[MIT](LICENSE)
