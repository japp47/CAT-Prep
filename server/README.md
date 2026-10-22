# 99ile API (Go)

The server behind sync. It is optional: the site works fully without it (docs/architecture.md §1).
It has `GET /healthz` (the process is up, and which commit), `GET /readyz` (the database answers) and the
student API under `/v1` (docs/architecture.md §5, §6):

| Route | What it does |
|---|---|
| `POST /v1/identity` | Turns sync on for this browser: a new identity and device, and the `__Host-dev` cookie (5 an hour per address) |
| `GET /v1/identity` | Which identity and device this browser is |
| `POST /v1/sync/pull` | `{cursor}` → records written after it, oldest first, 500 a page |
| `POST /v1/sync/push` | `{changes}` → `applied` and `stale`; at most 200 changes, 16 KB each |
| `POST /v1/identity/link-codes`, `/link`, `/recover`, `/recovery-code` | Link a device with a code, get progress back with the recovery code (B4) |
| `GET /v1/devices`, `DELETE /v1/devices/{id}` (`me` = this browser) | The device list; remove one |
| `GET /v1/me/export`, `DELETE /v1/me` | Everything the server keeps, as a download; delete it everywhere (B5) |

Every kind of progress syncs (`SyncKinds` in `cmd/api/main.go`, checked against the browser's list by a test). In
prod, `/v1` answers 503 until `PROXY_SECRET`, `IP_HASH_KEY` and `TURNSTILE_SECRET` are set, so the live server runs
before sync is switched on. `cmd/cleanup` deletes expired link codes, devices removed over 90 days ago and audit
events over 400 days old; `.github/workflows/cleanup.yml` runs it daily (or `make cleanup-prod`).

Needs Go 1.27 and Docker.

## Run it on your Mac

```sh
cd server
cp .env.example .env     # once
make run                 # Postgres 17 in Docker (port 5433), migrations as the owner, then the API as cat_app on :8080
```

```sh
curl localhost:8080/healthz   # {"commit":"dev","status":"ok"}
curl localhost:8080/readyz    # {"status":"ready"}
```

To try sync, run the site too (`npm run dev` at the repo root: `.env.development` turns the Sync card on and Vite
forwards `/api` to `:8080`, or to `API_TARGET`). Open Settings in two browsers (Chrome or Firefox: the cookie is
`Secure`, which they allow on localhost), turn sync on in one, and paste its progress id into "Join" in the other.

Other commands:

| Command | What it does |
|---|---|
| `make test` | Unit tests, no database needed |
| `make test-int` | Unit and integration tests against the `cat_test` database (emptied by tests) |
| `make migrate` | Apply new migrations as the owner (`MIGRATE_DATABASE_URL`) and set the local passwords |
| `make migrate-status` | The database's schema version and the one this code expects |
| `make db-psql` | SQL prompt on the dev database |
| `make db-down` / `make db-reset` | Stop Postgres / stop it and delete its data |
| `make image` | Build the production image (distroless, about 20 MB) |

## Layout

```
cmd/api/            the server: settings, database as cat_app, routes, graceful shutdown. Never migrates
cmd/migrate/        applies migrations as the owner; a separate step before every deploy
internal/config/    environment variables → Config; every problem reported at once
internal/account/   turn sync on, the device cookie (only its SHA-256 is stored), Require middleware, dev join
internal/syncapi/   pull and push: server revs, compare-and-set on baseRev, the per-identity head lock
internal/audit/     rows for audit.events (append-only for the server)
internal/reqinfo/   /v1 gate: proxy secret, the student's address, its keyed hash
internal/ids/       uuid v7 ids
internal/limit/     in-memory rate limits
internal/httpx/     JSON and the error shape, router (JSON 404 and 405), middleware:
                    request id, access log, recover, 64 KB body limit, same-origin check
internal/store/     Postgres pool (pgx), migrations (goose, with a lock for two instances)
migrations/         numbered SQL files, built into the binary; never edit a merged one
dev/initdb.sql      creates the cat_test database the first time Postgres starts
```

Errors always look like `{"error": {"code": "not_found", "message": "There is nothing at this address."}}`.
Every response has an `X-Request-Id`, also in the log line for that request. Logs never contain bodies,
query strings, cookies or headers.

## Settings

| Variable | Default | Notes |
|---|---|---|
| `ENV` | `dev` | `prod` on Render: JSON logs, https origin required |
| `PORT` | `8080` | Render sets it |
| `DATABASE_URL` | none, required | The API's connection, as `cat_app`. Live: Supabase session pooler |
| `MIGRATE_DATABASE_URL` | none | `cmd/migrate` only, as the owner. Live: a secret used only by the migrate step |
| `ALLOWED_ORIGIN` | `http://localhost:5173` in dev | The site's origin; other sites cannot change data |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `PROXY_SECRET` | none | Shared with the Pages Function (`functions/api`); 32+ characters. Required in prod for `/v1` |
| `TURNSTILE_SECRET` | none (no bot check in dev) | Cloudflare Turnstile secret key, checked on `POST /v1/identity`. Required in prod for `/v1` |
| `IP_HASH_KEY`, `IP_HASH_KEY_ID` | random per run in dev | Hex key (32+ bytes) for `audit.events.ip_hash`, and which yearly key it is (default 1). Required in prod for `/v1` |
| `TEST_DATABASE_URL` | none | Integration tests only. Never point it at real data |

Port 5433 is used because 5432 is often taken by another local Postgres.

## Two logins, two steps

The API never changes the schema. Migrations run first, as a separate command with the owner's connection; the
API runs as `cat_app`, which can read and write data but cannot create, alter or drop anything. If the database
is older than the API expects, the API still starts and `/readyz` answers 503 "waiting for a database update"
until the migration has run. Live deploy order: run `/migrate` from the same image, then deploy the API.

`cat_app` and `cat_readonly` are created by migration `00002` without passwords. Locally `make migrate` sets
them to `cat_app` and `cat_readonly`; on Supabase set them once by hand:
`alter role cat_app password '…';`

## Live database

The live database is Supabase (Singapore). Migrations reach it through the session pooler as the owner,
`postgres`. Put that link once in `server/.env.prod`, which Git and Docker ignore:

```sh
MIGRATE_DATABASE_URL='postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require'
```

Keep the single quotes, and use a password of letters and numbers only (`openssl rand -hex 20`): `@ : / ? #`
break the link. Then:

- `make migrate-prod-status`: the live schema version and the one this code expects
- `make migrate-prod`: apply new migrations

Both print the database host before they start, so you can see where they point.

Normally you never run them: after CI passes on `main`, `.github/workflows/deploy-api.yml` migrates and then
deploys, but only when `server/` changed. `/healthz` reports the live commit. To redeploy by hand: GitHub →
Actions → Deploy API → Run workflow.
