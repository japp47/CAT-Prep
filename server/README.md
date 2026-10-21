# 99ile API (Go)

The server behind sync. It is optional: the site works fully without it (docs/architecture.md §1).
Today it has `GET /healthz` (the process is up) and `GET /readyz` (the database answers). Identity and sync
come in the next branches.

Needs Go 1.27 and Docker.

## Run it on your Mac

```sh
cd server
cp .env.example .env     # once
make run                 # Postgres 17 in Docker (port 5433), migrations as the owner, then the API as cat_app on :8080
```

```sh
curl localhost:8080/healthz   # {"status":"ok"}
curl localhost:8080/readyz    # {"status":"ready"}
```

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
| `ENV` | `dev` | `prod` on Cloud Run: JSON logs, https origin required |
| `PORT` | `8080` | Cloud Run sets it |
| `DATABASE_URL` | none, required | The API's connection, as `cat_app`. Live: Supabase session pooler |
| `MIGRATE_DATABASE_URL` | none | `cmd/migrate` only, as the owner. Live: a secret used only by the migrate step |
| `ALLOWED_ORIGIN` | `http://localhost:5173` in dev | The site's origin; other sites cannot change data |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
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
