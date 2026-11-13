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
events over 400 days old; `.github/workflows/cleanup.yml` runs it daily (or `make cleanup-prod`). Each scheduled
job (cleanup, digest, notify) retries the database for about twenty seconds before giving up: the free database's
pooler sometimes answers more slowly than one ping allows, and a job that dies there waits a whole day.

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
internal/notify/    study reminders: the rule book, the queue, push and email channels, the wording (templates/)
internal/mailx/     SMTP with login and TLS, shared by the digest and reminders
cmd/notify/         plans and sends reminders every 15 minutes (GitHub Actions); -vapid, -preview, -send-test
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
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | none (sign-in off) | "Sign in with Google" (B7). An OAuth client of type Web application; its redirect URI is `ALLOWED_ORIGIN` + `/api/v1/auth/google/callback`. Both or neither. The site shows the button only when Pages also has `VITE_GOOGLE_SIGNIN=1` |
| `IP_HASH_KEY`, `IP_HASH_KEY_ID` | random per run in dev | Hex key (32+ bytes) for `audit.events.ip_hash`, and which yearly key it is (default 1). Required in prod for `/v1` |
| `NOTIFY_TOKEN_SECRET` | random per run in dev; none in prod (reminders off) | Hex, 32+ bytes (`openssl rand -hex 32`). Signs one-click unsubscribe links. The same value on Render and in the GitHub secret of the same name |
| `NOTIFY_VAPID_PUBLIC` | none (push off) | The push public key from `go run ./cmd/notify -vapid`. Without it, notifications are off and email reminders still work. In prod without `NOTIFY_TOKEN_SECRET`, `/v1/notify` answers 503 and the site hides Reminders |
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

## Problem reports

"Report a problem" on a question posts to `POST /v1/feedback` and lands in `support.feedback` (B6).

**How you hear about them.** Every day at 09:00 (India), `.github/workflows/digest.yml` sends the new reports
two ways, then marks them `seen`:

- **Email to 99ile.team@gmail.com, with the students' notes.** Sent through Gmail with an app password, stored as
  the repository secret `DIGEST_SMTP_PASSWORD` (99ile.team account: 2-Step Verification on, then
  myaccount.google.com → App passwords). Without the secret the email is skipped and the job logs a warning.
- **A comment on the GitHub issue "Problem reports from students"** (label `problem-reports`; opened the first
  time). The repository is public, so it lists the question, the kind of problem and the count, never a note.

If one way fails and the other works, the reports are still marked seen and the run shows red, so you notice.
If both fail, nothing is marked and tomorrow tries again. Run it any time from Actions → Problem report digest →
Run workflow, or print both texts without sending: `make digest-prod`. Notes are private: keep them out of GitHub.

Closed reports (`fixed`, `wont_fix`) are deleted a year after they were closed by the daily clean-up job. The
privacy page promises the same for the emails: once a month, search the 99ile.team inbox for
`from:me subject:"99ile:" older_than:1y` and delete what it finds.

**Reading and closing them: the admin page (B8).** Open `/admin` on the site, or tap your initial, then Admin.
Reports are grouped by question; Fixed, Won't fix, Mark seen and Reopen act on the whole group, and each change is
in the audit log (`feedback.resolved`). Only staff see it; everyone else gets "Page not found".

**Making someone staff.** They sign in with Google once, then, as the owner:

```sh
make grant-prod EMAIL=99ile.team@gmail.com            # admin (reports, counts, and later accounts and roles)
make grant-prod EMAIL=helper@gmail.com ROLE=moderator # reports and counts only
make grant-prod EMAIL=helper@gmail.com REVOKE=1       # take it back
```

Locally: `make grant EMAIL=…`. Grants are never deleted, only revoked, and both are audited as `system`.

The SQL editor still works as a fallback (it runs as the owner):

```sql
select id, created_at, item_id, kind, note, page from support.feedback where status in ('new', 'seen') order by id desc limit 50;
update support.feedback set status = 'fixed', handled_at = now(), updated_at = now() where id = 123;
```

The `item_id` names the question: `rc:<set>:<n>` (n counts from 0), a VA key such as `pj:bees`, or `cr:<id>`.
Each network can send 10 reports an hour.

## AI summary feedback

"Get a second opinion" on a summary's four ticks, the re-check after "Revise yours", and "Show the smallest fix"
(F36, D101, D103); see docs/design/explain-mistake.md. The browser sends the set's id and the student's summary (5
to 25 words). ("Why did I pick this?" was removed on 13 Nov 2026, D105.) The API builds the prompt from the site's `/ai/rc.json` (written at build), checks the reply, and caches it
in schema `ai` (migration 16), so a repeat costs nothing.

Every new generation passes one gate (`internal/ai/guard.go`): a verified Google account, `AI_PER_ADDRESS` new ones per
network address an hour (30), the student's daily seat (`AI_PER_STUDENT`) taken atomically, and 2,500 tokens of the
day's budget reserved on the `ai.usage` row `all` before the call, then settled to what it used.

**Turning it on (Render, the API service, Environment):**
1. Make a key at console.groq.com (free tier: about 1,000 requests and 200K tokens a day, per model).
2. `AI_ENABLED` = `1`, `GROQ_API_KEYS` = the key (or `key1,key2`: the second is a spare for a revoked key; Groq's
   limits are per account and per model, so more keys in one account add no quota). `AI_DAILY_TOKENS` (150000) is the
   whole day's budget across models (each has its own 200K at Groq, so it can go up to about 500000 once you trust
   it); `AI_PER_STUDENT` (10) is new summary checks and fixes a student a day. Removing `AI_ENABLED` hides the AI
   buttons at once (the site keeps the student's own ticks). A bad setting stops the API at start with the reason.

**Models.** `internal/ai/models.json` lists the providers, the models with their settings, and the order each task
tries them: summaries `gpt-oss-120b`, then `qwen3.8-27b`, then `gpt-oss-20b`. A
model over its limit (429) rests for as long as Groq's `Retry-After` says and the next one answers; a refused key
(401/403) rests for an hour and the next key is used; a missing model (404) or a refused request rests and is logged
as an error. To switch without a deploy, set `AI_SUMMARY` on Render to catalog names
(`qwen3.8-27b,gpt-oss-20b`); a new model or provider is a change to `models.json` (any OpenAI-compatible API, its
keys in the variable it names). Admin → AI shows each model's state, the keys that work (as counts) and seven days
per model; in SQL, `select * from ai.model_usage order by day desc, model;`.
3. In SQL: `select day, kind, generations, tokens from ai.usage order by day desc limit 14;` (kind `all` is the day's
   total against the budget; `summary` and `summary_fix` are the split) and flagged ones:
   `select kind, flags, output from ai.cache where flags > 0;` (three flags drop an answer; the next request remakes it).

## Study reminders

Push and email reminders on days a student has not practised (docs/feature.md F65, design and principles in
docs/design/notifications.md). Choices are saved through `/v1/notify/*`. **The API sends them itself** (D91): with
`NOTIFY_WORKER=1` a worker inside it plans and sends every two minutes, so a reminder for 7:30 goes out by about
7:32. (GitHub's schedule skipped most runs; `.github/workflows/notify.yml` is now a manual button for one pass.)
Email goes through the 99ile.team Gmail with an app password, at most 300 a day (`NOTIFY_EMAIL_DAILY_CAP`).

**Turning it on (once), all on Render (the API service, Environment):**

1. Migrations 12 to 15 run by themselves: the deploy workflow migrates before Render deploys.
2. `NOTIFY_TOKEN_SECRET` (`openssl rand -hex 32`) and `NOTIFY_VAPID_PUBLIC`, `NOTIFY_VAPID_PRIVATE` (a pair from
   `go run ./cmd/notify -vapid`; the same values as in GitHub, for the manual button).
3. Email goes through **Gmail's API over HTTPS** (D92): Render's free plan blocks the mail ports SMTP needs. Once:
   - Google Cloud console, the project that has the Google sign-in client: APIs & Services → Library → **Gmail API**
     → Enable. Its OAuth consent screen must say **In production** (it does for sign-in); in Testing, the token
     would stop after 7 days.
   - Credentials → Create credentials → OAuth client ID → type **Desktop app**, name "99ile reminders mail". Copy its
     ID and secret.
   - On your Mac, in server/: `NOTIFY_GMAIL_CLIENT_ID=… NOTIFY_GMAIL_CLIENT_SECRET=… go run ./cmd/notify -gmail-token`.
     Open the link it prints, signed in as 99ile.team@gmail.com. Google warns that it has not verified the app (it
     is yours): Advanced → Go to 99ile → allow "Send email on your behalf" and "View your email message metadata"
     (headers only, never a body: the bounce check reads one header). The terminal prints
     `NOTIFY_GMAIL_REFRESH_TOKEN=…`. A token made before R2 (12 Nov 2026) can only send: run this once more and replace
     it on Render, or the log says once a day "bounce check is off" while sending carries on.
   - Render: `NOTIFY_SMTP_USER` = `99ile.team@gmail.com`, and `NOTIFY_GMAIL_CLIENT_ID`, `NOTIFY_GMAIL_CLIENT_SECRET`,
     `NOTIFY_GMAIL_REFRESH_TOKEN`. `NOTIFY_SMTP_PASSWORD` is not used on Render; delete it and revoke that app
     password. Changing the 99ile.team password ends the token: run `-gmail-token` again.
4. `NOTIFY_WORKER` = `1`. Render restarts; the log shows "reminder worker started".
5. Gmail (99ile.team), two filters that skip the inbox ("Reminders" is a label name Gmail keeps for itself):
   - `from:mailer-daemon` → label **`99ile-bounces`**, exactly that name: the worker reads it once an hour (below).
   - `subject:unsubscribe` → label "99ile mail": mailto unsubscribes. (Before R2 one filter put both under "99ile
     mail"; split it so the bounce check never sees anything but bounces.)
6. To watch first without sending, add `NOTIFY_DRY` = `1`: each pass logs "would_queue" and sends nothing. Remove it
   to send.

**Bounces (R2, D97):** once an hour the worker lists the `99ile-bounces` label and reads only each bounce's
`X-Failed-Recipients` header. A student whose Google address it names stops getting email (the Settings card says
the address bounced) until they turn email on again. Each bounce is handled once (`notify.bounces`, kept 60 days, no
address). If Google's bounce lacks that header, mark the address by hand on the admin page (Reminders).

**The weekly review (R2, D97):** Sundays at 9:00 in each student's zone, for students who switched it on. The
figures come from the student's own browser (`PUT /v1/notify/week`, `notify.weeks`); the server never reads synced
records. Before it goes to students, leave `NOTIFY_DRY=1` over one Sunday and check the log's "would queue weekly".

**The admin page's Reminders tab:** counts (who has what on, the last 14 days by message, skip reasons, bounces,
unsubscribes, today's email budget) for staff with `stats.read`; "Send me a test" (any wording with sample figures,
to your own address and devices, marked Test, ten an hour) and "Mark an address bounced" for admins
(`reminders.manage`, migration 15). Both actions are in the audit log, without addresses.

**Switches** (Render environment): `NOTIFY_EMAIL=off` or `NOTIFY_PUSH=off` stops a channel; removing
`NOTIFY_WORKER` stops the reminders. Each takes effect when Render restarts, about a minute.

**Checking the wording:** `go run ./cmd/notify -preview /tmp/mail` writes every message as HTML and text;
`go run ./cmd/notify -send-test you@example.com` emails all of them to one address, through Gmail's API with the
three `NOTIFY_GMAIL_*` settings and `NOTIFY_SMTP_USER` in the environment (or over SMTP with `NOTIFY_SMTP_PASSWORD`). Wording is `internal/notify/templates/messages.json`, the rules' numbers
`policy.json`; a test fails on a missing placeholder, a subject over 50 characters or a push over 120.

**When something is wrong:** five failures in a row pause a channel for that pass, and the worker emails
99ile.team ("99ile: reminders need attention", with the error), at most every six hours while it lasts. Render's log
has a "reminders" line for every pass that did anything: queued, sent, skipped (with why), failed, retried. In SQL:

```sql
select kind, channel, status, reason, count(*) from notify.messages where created_at > now() - interval '1 day' group by 1, 2, 3, 4 order by 5 desc;
select kind, count(*) filter (where status = 'sent') sent, count(opened_at) opened, count(practised_at) practised from notify.messages group by 1;
```

