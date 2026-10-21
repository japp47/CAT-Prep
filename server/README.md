# 99ile API (Go)

The server behind sync. It is optional: the site works fully without it (docs/architecture.md §1).
Today it has `GET /healthz` (the process is up) and `GET /readyz` (the database answers). Identity and sync
come in the next branches.

Needs Go 1.27 and Docker.

## Run it on your Mac

```sh
cd server
cp .env.example .env     # once
make run                 # starts Postgres 17 in Docker on port 5433, then the API on :8080
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
| `make migrate` | Apply migrations and exit (the server also does this when it starts) |
| `make db-psql` | SQL prompt on the dev database |
| `make db-down` / `make db-reset` | Stop Postgres / stop it and delete its data |
| `make image` | Build the production image (distroless, about 20 MB) |

## Layout

```
cmd/api/            main: settings, database, migrations, routes, graceful shutdown
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
| `DATABASE_URL` | none, required | Local: see `.env.example`. Live: Supabase session pooler |
| `ALLOWED_ORIGIN` | `http://localhost:5173` in dev | The site's origin; other sites cannot change data |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `TEST_DATABASE_URL` | none | Integration tests only. Never point it at real data |

Port 5433 is used because 5432 is often taken by another local Postgres.
