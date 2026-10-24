# 99ile: architecture (plan, how it is built)

How 99ile is built today, and how the Go backend will be added without losing what works.
Part of specify → plan → analyze → implement (see the table at the top of `docs/feature.md`).
Decisions are tagged **Decided** (with date) or **Proposed** (needs the owner's yes). Where this file and `docs/plan.md` Part 2 disagree, this file is newer.
Last updated 21 Oct 2026 (step 3 re-plan).

---

## 1. Quality goals, in order
1. **Works with no account and no internet.** The browser is the first home of a student's data.
2. **Fast on a cheap phone on 4G.** First paint about 1 s, the first download under budget (`npm run size`).
3. **Correct.** Answer keys, scores and schedules are tested; history means what it meant when it was recorded.
4. **Private.** Collect the least data that does the job; no tracking; export and delete.
5. **₹0 to run** at launch, on free tiers that sleep when idle.
6. **Simple to change** by one developer: one repo, one frontend, one Go service, one database.

When two goals clash, the lower number wins. Example: a page never waits for the server (1), even though server-first code would be simpler (6).

---

## 2. The system today (frontend only)

```
Browser (React 19 SPA, PWA)                       Cloudflare Pages (static, free)
┌───────────────────────────────────────────┐      ┌───────────────────────────────┐
│ pages/  (lazy routes)                     │      │ dist/: index.html, hashed JS, │
│ components/  kit.tsx, ui/ (shadcn)        │◀─────│ fonts, content chunks, sw.js  │
│ domain: practice/  planner/  data/        │      │ _headers: CSP self-only,      │
│ lib/state.ts  (AppState, normalize)       │      │ immutable caching             │
│ lib/store.tsx (useStore, update)          │      └───────────────────────────────┘
│ localStorage: cat-prep-hub-v3 (+ drafts,  │
│ prefs)                                    │      GitHub Actions CI: typecheck, test,
└───────────────────────────────────────────┘      build, catalog committed, size
```

### 2.1 Layers
| Layer | Folder | Rule |
|---|---|---|
| Pages | `src/pages`, `src/pages/practice`, `src/pages/tracker` | One lazy route each (`App.tsx`). Compose components; little logic |
| Components | `src/components`, `src/components/ui` | Page building blocks in `kit.tsx`; shadcn in `ui/`. Tokens in `src/index.css` |
| Domain | `src/practice`, `src/planner`, `src/sections`, `src/data` | Pure TypeScript: scoring (`record.ts`), redo (`redo.ts`), report (`report.ts`), summaries, streak, percentile, the day planner (`planner/engine.ts`). Tested with Vitest. No React here where avoidable |
| State | `src/lib/state.ts`, `src/lib/store.tsx` | One `AppState` object; every read from storage or a backup goes through `normalize()`; writes through `update(fn)` |
| Content | `content/*.json`, `src/practice/rc|va|cr`, `scripts/catalog.ts` | Written by the owner, checked by tests, split per file (below) |

### 2.2 Content pipeline
```
content/rc/*.json, content/va/*.json, content/cr/items.json, va/paragraphs.ts
        │  npm run catalog (scripts/catalog.ts)
        ▼
src/practice/catalog.gen.ts   small metadata: ids, titles, genres, RC_FILE, counts  (main bundle)
src/practice/leads.gen.ts     first lines for the home teaser
        │
src/practice/bank.ts          one dynamic import per content file
src/practice/content.ts       useContent(need) / ContentGate: loads only the files a page needs
```
App code never imports `practice/rc`, `cr`, `va/paragraphs` or `full.ts`; a test enforces it.

### 2.3 Student data today
All in `AppState` (`src/lib/state.ts`, version 4), saved as one JSON value in localStorage under `cat-prep-hub-v3`. Unfinished practice is in `lib/draft.ts` (one key, dropped after a day); UI preferences (theme and similar) in `lib/prefs.ts`.

| Field | Shape | Has an id | Has `updatedAt` | Changes after it is written |
|---|---|---|---|---|
| `rcAttempts`, `vaAttempts`, `crAttempts`, `speedRuns` | list | yes | no | no (append only) |
| `sectionals`, `summaries` | list | yes | yes | summaries: yes |
| `lrAttempts` | list | yes | yes | yes: the post-mortem (F86) is added after the review opens |
| `mocks`, `errors`, `vocab`, `practice` | list | yes | no | errors, vocab: yes |
| `redo` | list | key `k` | no | yes (box, due, tries) |
| `days` | map by date | date | no | yes |
| `ticks` | map by link id | key | no | yes (on and off) |
| `settings`, `targets`, `since` | single values | no | no | yes |

Sync needs every row to have a stable id and an `updatedAt`, and deletions to leave a tombstone. Rather than change every row, a sync ledger kept beside `AppState` records when each row last changed and which were deleted (S5 in `docs/implement.md`), so `AppState` keeps its shape.

Ids come from `uid()` in `lib/date.ts`: the time in ms plus 4 random base-36 characters (about 1.7 million values). That was enough for one browser; with sync, ids from several devices share one space, so S5 lengthens the random part to 10 characters from `crypto.getRandomValues` (old ids stay valid).

### 2.4 Hosting and delivery
- Cloudflare Pages builds `main`. Security headers and caching in `public/_headers`: CSP is self-only (`connect-src 'self'`), so the future API must be same-origin (section 4).
- Service worker `pwa/sw.js` caches the shell and content for offline use.
- CI (`.github/workflows/ci.yml`) runs on every pull request. The Go server is not in CI yet (`docs/implement.md`, B1).

---

## 3. Where logic runs

**Decided 21 Oct 2026 (D2)** (it matches the plan so far, and answers the research's "move the learning engine to Go"). The research review suggested moving attempts, scoring, redo scheduling and progress into Go and making the server authoritative. Recommended: keep it in TypeScript, because:
- The logic already exists in TypeScript with tests. A Go copy would be a second source of truth that drifts.
- Local-first means the browser must compute everything offline anyway. A server copy would only be used when online.
- The free database and the free server sleep when idle; a page that waits on them is slow.

So:

| Work | Runs in | Why |
|---|---|---|
| Scoring, redo schedule, report card, recommendations, weekly review, day planner | Browser (TypeScript domain) | Works offline; one tested implementation |
| Storing and syncing a student's records | Server (Go + Postgres), copy in the browser | Survives a cleared browser; cross-device |
| Anything that must be trusted by others: leaderboard scores | Server re-scores from its copy of the answer key (`content/*.json` read by Go) | A browser can be edited |
| AI calls | Server only | The provider key must stay secret; quotas; caching |
| Content | Repo → CDN | Free, fast, offline, tested in CI |

The server stores records as opaque JSON (it does not need to understand an RC attempt to sync it). The one place Go reads content is the leaderboard re-score, from the same JSON files the site uses.

---

## 4. Target system (backend v1 and after)

```
Browser (React PWA, local-first)
  │  fetch("/api/v1/...")  same origin, cookie
  ▼
Cloudflare Pages Function  functions/api/[[path]].ts   (proxy: keeps the cookie first-party on *.pages.dev,
  │                                                      no custom domain, CSP stays 'self')
  ▼
Go API on Render free, Singapore (one instance, kept awake by a ping)   ── one modular service, not microservices
  ├── internal/identity   anonymous identity, devices, recovery and link codes; accounts later
  ├── internal/sync       POST /v1/sync: push and pull records
  ├── internal/feedback   problem reports
  ├── internal/ai         (3b) provider client, prompts, validation, cache, quotas
  ├── internal/board      (step 9) leaderboard, re-scoring from content/
  ▼
Postgres (Supabase free, Singapore; D10, Neon the fallback)          Groq (prod AI) / Ollama (dev AI)
```

### 4.1 Why a modular monolith
One binary with packages per domain gives clear boundaries without network calls, service discovery or distributed transactions. A package can be split out later if one part needs different scaling (AI is the only likely one). Redis, queues and workers are not needed: Postgres covers rate counters, caches and job rows at this scale.

### 4.2 Go layout
```
server/
  cmd/api/main.go            HTTP server, graceful shutdown (exists: GET /healthz)
  cmd/author/main.go         owner's tool: drafts content with local Ollama (no hosting)
  internal/config            env vars → typed Config, validated at start
  internal/httpx             router, middleware (request id, recover, body limit, access log,
                             origin check, rate limit), JSON and error helpers
  internal/identity          handlers + service + queries
  internal/sync              handlers + service (merge rules) + queries
  internal/feedback
  internal/ai                client.go (OpenAI-compatible), prompts/, validate.go, budget.go
  internal/store             pgx pool, sqlc output, transactions
  migrations/                goose SQL files, numbered
  queries/                   SQL for sqlc
  Dockerfile                 distroless, about 15 MB
  docker-compose.yml         postgres (and ollama) for local development
```
Each domain package has `handler.go` (HTTP in and out), `service.go` (rules, no HTTP), and its SQL. Handlers depend on service interfaces, so tests can swap the database.

### 4.3 Stack (**Decided 18 Oct 2026**, kept)
Go 1.27 (`go.mod` and the Docker builder; 1.23 is out of support, `docs/research/step-3.md`) standard `net/http` routing (method and path patterns), `pgx/v5`, `sqlc` for typed queries, `goose` for migrations (one tool only), `log/slog` JSON logs, `golang.org/x/time/rate`. No web framework: the standard router has what we need, and fewer dependencies is less to keep up to date.

### 4.4 API conventions
- Base path `/v1` (the proxy maps `/api/v1/*`). JSON, camelCase fields.
- Errors: `{ "error": { "code": "rate_limited", "message": "Too many tries. Wait a minute." } }`. Messages are written for students.
- Every response carries `X-Request-Id`; logs carry the same id.
- Unsafe methods require the `Origin` header to match the site (CSRF), plus `SameSite=Lax` cookies.
- Body cap 64 KB (sync pushes are batched to fit), 20 KB of text for AI.
- `GET /healthz`: the process is up (no database). `GET /readyz`: the database answers.

---

## 5. Identity

**Decided 21 Oct 2026 (D1): three levels, each optional, each keeping the data of the one before.**
1. **Backup file** (live): export on one device, import on another. No server.
2. **Anonymous sync** (backend v1): no name, email or password; recovery code and device linking.
3. **Account** (after v1): Google or email. On sign-in the student chooses to save everything this device has into their account in Postgres (5.2).

The plan (2C) had put email and Google first. Anonymous first, because:
- The home page promises "No sign-up". Sync without an account keeps that promise.
- It is less work for v1: no email sending, no password reset, no OAuth app review.
- Accounts can be attached later to the same identity, so nobody loses data.

Trade-off: if a student loses every device and the recovery code, the data is gone. The UI says so plainly when sync is turned on.

### 5.1 How it works
| Thing | What it is | Stored on the server as |
|---|---|---|
| Identity | a random id, no personal data | `identities(id, created_at, last_seen_at)` |
| Device credential | 32 random bytes in an `httpOnly; Secure; SameSite=Lax` cookie, one per browser, 1 year, renewed on use | SHA-256 only, in `devices(id, identity_id, secret_hash, label, created_at, last_used_at, revoked_at)` |
| Recovery code | 16 characters (80 random bits, Crockford base32, four groups), shown once, can be regenerated (the old one stops working) | SHA-256 only, `recovery_codes` |
| Link code | 8 characters, valid 10 minutes, used once; shown as a QR (the link `https://<site>/link#<CODE>`; the code is in the fragment, so it never reaches a server log) and as text | SHA-256 only, `link_codes(code_hash, identity_id, expires_at, used_at)` |

High-entropy secrets are hashed with SHA-256, the same pattern as API keys; argon2id is for low-entropy passwords (accounts, later). Recovery and link attempts are rate limited per IP. A device can be removed from Settings, which revokes its credential.

Flows: **Turn on sync** → `POST /v1/identity` creates identity + device + recovery code. **Link** → device A `POST /v1/identity/link-codes`, device B `POST /v1/identity/link {code}`. **Recover** → `POST /v1/identity/recover {code}`. **Leave** → `DELETE /v1/devices/me`. **Devices** → `GET /v1/devices`, `DELETE /v1/devices/{id}`. **New recovery code** → `POST /v1/identity/recovery-code` (the old hash is replaced in the same transaction).

When a device that already has local progress joins an identity (link or recover), the browser asks "Add this device's progress?" (`docs/feature.md`, F47). **Add** runs the first sync (§6.3): pull everything, merge with the kind rules, push the result. **Start fresh** offers a backup file, then replaces local state with what it pulls. Either way nothing on the server is overwritten wholesale.

**QR scanning** happens inside 99ile (`docs/research/step-3.md`, findings 11–15): a lazy `LinkScan` screen opens the rear camera with `getUserMedia`, reads frames with `BarcodeDetector` where the browser has it, else with `jsqr` (loaded only then), and accepts only our own link format. The QR is drawn as SVG by `uqr`, also lazy. Neither library is in the main script. `public/_headers` allows the camera for our own origin only (`camera=(self)`). The `/link` route reads the code from the fragment; on iPhone Safari outside the Home Screen app it explains that the code should be scanned from inside the app if that is where the student studies.

Recovery is honest, as Mullvad does it: the screen says the code cannot be reset, offers copy and download, and offers a backup file too. A device credential cookie is the only session; there is no password to steal.

### 5.2 Accounts (B7, the last branch of step 3)
**Decided 21 Oct 2026 (D9): Google first, email later.** Google sign-in needs no email sending, no passwords and no reset flow, and nearly every student has a Google account on their phone. Email and password (argon2id, verify and reset mails through Resend, whose free plan sends about 100 a day) follow when students ask for it.
Sign-in as in `docs/plan.md` 2C: Google (OAuth code flow with PKCE, ID token verified), later email and password (argon2id). Adds `users(id, email, email_verified, identity_id, …)`, `password_credentials`, `oauth_identities`, `email_tokens`. **An account owns exactly one identity**, so all sync code stays the same; signing in only decides which identity this device uses.

What happens to the device's progress on sign-in:

| Device before sign-in | Account | What happens |
|---|---|---|
| Guest, never synced | new | Asks "Save this device's progress to your account?" **Yes:** a new identity is made for the account and the device pushes all its records (first sync, §6.3). **No:** offers a backup file first, then the device starts from the account's empty progress |
| Anonymous sync on | new | The device's identity becomes the account's identity. Nothing is copied; every linked device is now under the account |
| Guest or anonymous | already has progress (another device) | Asks "Add this device's progress to your account?" **Yes:** the device switches to the account's identity, pulls, merges with the rules in §6.1 and pushes everything it has. Nothing is overwritten; the old anonymous identity is deleted once its records are in. **No:** as above, backup file first |

The merge runs in the browser, with the same code as everyday sync (D2), so there is one set of merge rules. Signing out asks "Keep a copy on this device, or clear it?"

**How it is built (B7, decided 24 Oct 2026, D27 to D30).**
- **No new session.** The device cookie (`__Host-dev`) stays the only login. Signing in decides which identity this device's row points at; every sync endpoint stays as it is (D27).
- **Code flow through the site's own origin.** "Sign in with Google" opens `/api/v1/auth/google/start`, which sets a short `__Host-oauth` cookie (state, PKCE verifier, nonce, return page; 10 minutes, `SameSite=Lax` so it comes back on Google's redirect) and sends the browser to Google. Google returns to `{ALLOWED_ORIGIN}/api/v1/auth/google/callback`, through the Pages proxy, so cookies stay first-party. The server exchanges the code with the verifier and the client secret, and checks the ID token (issuer, audience, expiry, nonce, `email_verified`) with `go-oidc`.
- **What the callback decides.** If no question is needed it finishes at once: a new account on a device with anonymous sync **adopts** that identity; a device already on the account's identity is simply signed in. Otherwise it saves a one-time **sign-in ticket** (hash only, 10 minutes, single use, like link codes) and returns to Settings with it; the page asks "Save this device's progress to your account?" and posts `POST /v1/auth/complete {ticket, keep}`. The server points this device at the account's identity (making it for a new account) and sets a fresh device cookie; the browser then runs the same steps as linking a device (B4): with `keep` it merges and pushes everything, without it clears first, after offering a backup.
- **Another account on a shared device.** If the device is already signed in to a different account, keeping its progress is not offered: two people's progress is never merged.
- **The old anonymous identity** is not deleted at sign-in (its other devices may still be using it). The clean-up job deletes anonymous identities with no account and no active device for 30 days (D29); its recovery code works until then.
- **Signing out** is "turn off sync on this device": the device row is revoked and the cookie cleared, keep or clear here. **Delete everything** deletes the account, then its identity.
- **Staff roles** (`access` schema) move to B8, where the admin page first reads them (D28).

---

## 6. Sync

**Decided 18 Oct 2026** (generic records table, server revision numbers); merge rules detailed 21 Oct 2026.

### 6.1 Records
Every syncable thing in `AppState` becomes a record `{ kind, id, data, updatedAt, deleted }`:

| Kind | id | Merge on conflict |
|---|---|---|
| `rc`, `va`, `cr`, `speed`, `sectional`, `mockReview` | attempt id | none needed: written once |
| `summary`, `error`, `word`, `mock`, `practice`, `recommendation`, `weekReview` | row id | newest `updatedAt` wins |
| `lr` | attempt id | newest `updatedAt` wins (only the post-mortem changes). **Deploy order:** the server must list `lr` in `SyncKinds` before the browser pushes it; a refused write is not retried until the row changes |
| `redo` | question key | the copy with more `tries` wins; equal tries → newest `updatedAt` |
| `day` | date | field by field: `done` and `spent` take the larger minutes per block; `min`, `carried`, `dismiss` newest wins |
| `tick` | link id | newest wins; unticking is a tombstone |
| `setting` | section id | newest wins |
| `profile` | `"me"` | `since`, `targets`, `about` (attempt, studying or working; F81); `since` keeps the earlier date, the rest newest wins |

### 6.2 Protocol (**Decided 21 Oct 2026, D8**: server order, not device clocks)
Device clocks can be hours or days wrong. Following Replicache's design (`docs/research/step-3.md`, finding 6), the server's `rev` decides order and every write says which version it was based on.

One sync round, run by the browser:
```
1. Pull   POST /v1/sync/pull { "cursor": 1840 }
          → { "cursor": 1912, "records": [ { kind, id, data, deleted, rev } … ], "more": false }
          (repeat while more; pages of 500)
2. Merge  in the browser, per kind (§6.1), into AppState; mark merged rows dirty if the result
          differs from what the server has.
3. Push   POST /v1/sync/push { "changes": [ { kind, id, data, deleted, baseRev } … ] }   (≤ 200 rows, ≤ 64 KB)
          → { "applied": [ { kind, id, rev } … ], "stale": [ { kind, id, data, deleted, rev } … ] }
4. Stale rows are merged again and pushed once more in the next round.
```
- `baseRev` is the `rev` this device last saw for that record (0 for a new one). The server writes only if its current `rev` equals `baseRev` (compare-and-set in one `UPDATE … WHERE rev = $base`); otherwise the row comes back in `stale` with the server copy. Nothing is ever overwritten blind.
- Every accepted write gets a new `rev` from a Postgres sequence. A push whose data equals what is stored gets no new `rev`, so retries are safe.
- `updatedAt` is a **hybrid clock stamp**, used only as the tiebreak inside "newest wins" merges: each device stamps a change with the later of its clock and one more than the highest stamp it has made or seen (`hi` in the ledger). An edit made after seeing another device's copy therefore always beats it, even if that device's clock runs ahead; only truly simultaneous edits fall back to the stamp, the same way on every device. (A clamp to "a day ahead" was considered and dropped: it still let a fast clock win, and it made merges depend on each device's clock.)
- The browser keeps the cursor, the dirty set and each record's last-seen `rev` in the sync ledger (its own localStorage key, not in `AppState`).
- When: on load, 30 s after the last change, when the connection returns, when the tab is hidden (`fetch` with `keepalive`), and on focus if the last pull was over 5 minutes ago. No polling. A failed round backs off (1, 5, 15, 60 minutes) and never shows a popup.
- Two endpoints instead of one so a pull is a cheap read and a push stays under the body cap; both are idempotent.

### 6.3 Turning sync on for the first time
The device pushes all its records. If the identity already has records (linking a second device), the pull merges them in first. Nothing is overwritten wholesale; every record follows its kind's rule.

### 6.3a Restore and delete while sync is on
- **Restoring a backup file** while synced merges it in (every row of the file through the kind rules), never replaces `AppState`. Replacing would turn every row missing from an old backup into a tombstone and delete it on every device.
- **Delete all my data** asks: this device only (local `blankState()`, sync turned off on this device, server untouched) or everywhere (`DELETE /v1/me`, then local clear).
- **Unticking** a block in `day.done` is lost if another device still has it ticked when they merge (the merge takes the larger minutes). Rare and harmless; noted, not solved.

### 6.3b What is not synced
Drafts (`lib/draft.ts`: a half-done set belongs to the device it was started on), prefs (theme, sidebar, "Not sure" shown), `redoSeeded` (per device), and the sync ledger itself.

### 6.4 Tests that prove it
Two simulated devices with random offline edits in random order must end with identical state (property test in TypeScript for the merge, integration test in Go for the server). Same push twice → one row. Deleting on one device removes it on the other.

---

## 7. History and audit

The research asked for an audit trail. Keep it to what makes decisions explainable and recoverable, and keep browser storage bounded (localStorage is about 5 MB).

| History | Where | How |
|---|---|---|
| Attempts | Browser, synced | Append only already; each stores the content version (F46) |
| Error corrections | Browser, synced | The entry keeps `trapWas` and `causeWas` when the student changes them |
| Recommendations | Browser, synced | Never deleted; status changes; before and after recorded (F43) |
| Account and device events | Server `audit_events(id, identity_id, kind, at, meta)` | identity created, device linked or removed, recovery used, export, delete. No secrets, no content |
| AI runs | Server `ai_runs` | model, prompt version, input hash, token counts, valid or not, student flag. Not the student's text beyond what the cache needs |

Not logged: page views, clicks, passwords, tokens, cookies, pasted article text.

---

## 8. AI (step 3b and later)

```go
// internal/ai: one interface; providers behind it.
type Coach interface {
    ExplainMistake(ctx context.Context, in MistakeInput) (Explanation, error)
    SummaryFeedback(ctx context.Context, in SummaryInput) (SummaryChecks, error)
    // step 7
    GenerateRC(ctx context.Context, in ArticleInput) (RCSet, error)
    NarrateWeek(ctx context.Context, in WeekFacts) (Narrative, error)
}
```
- One client for Groq (prod) and Ollama (dev): both speak OpenAI-compatible chat completions. Config picks the base URL and model.
- Inputs are small, typed structs built by the server from what the browser sends: never the whole history. `NarrateWeek` gets the computed weekly review, not raw attempts (code counts, AI explains).
- Output must be JSON matching a schema; invalid → retry once → return "not available" and the browser shows the non-AI fallback.
- Cache by SHA-256 of (kind, prompt version, input). Daily caps per identity and a global budget at 80% of the free tier; `AI_ENABLED=false` switches it off.
- Budgets and the quality gate for generated RC sets are in `docs/plan.md` 2E.

---

## 9. Database (grows by milestone; nothing is created before it is used)

**Full design, column by column: `docs/database.md`** (21 Oct 2026): schema `app`, database roles (`cat_app` append-only on audit, `cat_readonly` without `records.data`), app roles and permissions, audit events, lifecycle. The table below is the milestone summary.

| Milestone | Tables |
|---|---|
| B1 foundation | `goose_db_version` only |
| B2 identity and sync (one kind) | `identities`, `devices`, `records` (+ sequence `records_rev`), `audit_events` |
| B4 recovery and linking | `recovery_codes`, `link_codes` |
| B6 feedback | `feedback` |
| 3b AI | `ai_cache`, `ai_runs`, `ai_usage`, `ai_budget` |
| B7 accounts | `users`, `oauth_identities` (Google first); `password_credentials`, `email_tokens` when email sign-in comes (D9) |
| 4b habit (F64, F65) | schema `notify`: `inbox`, `prefs`, `push_subscriptions`, `sends` (unique key per identity, kind and day) |
| 6b community (F67 to F70) | schema `community`: `threads`, `posts`, `votes`, `groups`, `members`, `invites`, `reports`, `blocks` |
| Step 9 | `daily_scores` (now per study group, inside `community`) |

```sql
-- Sketch; the real definition, with created_at/updated_at and grants, is in docs/database.md §5.
create table app.records (
  identity_id uuid not null references identities(id) on delete cascade,
  kind        text not null,
  rec_id      text not null,
  data        jsonb not null,
  stamp       bigint not null,          -- device hybrid-clock ms, only a tiebreak in browser merges
  rev         bigint not null,          -- from sequence records_rev: pull order and compare-and-set
  deleted     boolean not null default false,
  primary key (identity_id, kind, rec_id)
);
create index records_pull on records (identity_id, rev);
```
`on delete cascade` from `identities` makes "delete my data" one statement. Size estimate: about 100 KB per active student, so a free 500 MB database holds about 5,000.

Content stays in the repo, not in the database (`docs/plan.md`, "Where data lives"). Content versions (F46) are hashes computed at build time, so history stays meaningful without a questions table.

---

## 10. Hosting, cost and security
Hosting and free limits: `docs/plan.md` 2I (Cloudflare Pages + Pages Function proxy, Render, Postgres, Resend later, Turnstile, R2 backups, GitHub Actions). Security checklist: `docs/plan.md` 2J.

**Database host (Decided 21 Oct 2026, D10): Supabase free Postgres in Singapore, Neon as the fallback.** Neon's free compute is suspended for the rest of the month once 100 CU-hours (about 400 hours at the smallest size) are used, and students keep a database awake most of the day. Supabase's free database has no hour cap, pauses only after 7 days unused, and has a Singapore region next to the server on Render (Render has no India region; each request makes several database round trips, so server and database sit together). It is used as plain Postgres through `pgx` and its session pooler (IPv4, prepared statements work); none of Supabase's auth or APIs. Switching is a `DATABASE_URL` change. Limit: 500 MB, about 5,000 active students at 100 KB each; watch it in the weekly backup job.

**Cloudflare Pages vs Workers.** Cloudflare now recommends Workers with static assets for new projects; Pages keeps working with no end date. Stay on Pages for step 3; moving is its own small task later.

Additions for anonymous identity:
- Turnstile on "Turn on sync" (creating identities is the abuse path).
- Rate limits: identity creation per IP per day, recovery and link attempts per IP per hour.
- Weekly encrypted `pg_dump` to R2 is the only backup of synced data; test a restore once a month.
- Request logs keep IP addresses for 7 days at most (DPDP Rules 2025: they are personal data). Render keeps logs 7 days on the free (Hobby) plan, which matches.

## 11. Observability
- JSON logs with request id, route, status, duration; never bodies or cookies.
- Render's metrics and logs; cron-job.org calls `/healthz` every 5 minutes (keep-awake) and `/readyz` every hour, and emails on failure.
- Problem reports reach the owner daily (`.github/workflows/digest.yml`): an email to 99ile.team@gmail.com with notes through Gmail SMTP (B6c), and a comment on one GitHub issue (B6b) that lists question ids and counts, never notes, because the repository is public. An admin page follows B7 (B8).
- Counters worth a log line: sync pushes and pulls (records, bytes), AI calls (valid, invalid, cached), rate-limit hits.

## 12. Testing
| Layer | How |
|---|---|
| Go units | `go test ./...`: merge rules, code generation and hashing, validators |
| Go handlers | `httptest` with a fake service |
| Go integration | real Postgres from `docker-compose.yml`, `TEST_DATABASE_URL`, run in CI with a Postgres service; never point it at real data |
| Browser sync client | Vitest with a fake server; the two-device property test |
| End to end | `docs/plan.md`, Verification |

## 13. Decision log
| Date | Decision | Status |
|---|---|---|
| 17 Oct 2026 | Local-first: the site works with no account and no internet | Decided |
| 18 Oct 2026 | Go + Postgres, stdlib router, pgx, sqlc, goose; Cloud Run + Neon; same-origin proxy | Decided |
| 18 Oct 2026 | Content stays in the repo as JSON; user data syncs as generic records | Decided |
| 18 Oct 2026 | Step 2 before backend v1; small AI right after it | Decided |
| 20 Oct 2026 | Self-hosted fonts, no preload; content split per file | Decided |
| 21 Oct 2026 | Domain logic stays in TypeScript; the server stores and syncs, re-scores only the leaderboard (D2) | Decided |
| 21 Oct 2026 | Backup file → anonymous sync (recovery and link codes) → account; sign-in can save all of the device's progress into the account (D1) | Decided |
| 21 Oct 2026 | Content hash on every attempt (F46) instead of a questions table (D3) | Decided |
| 21 Oct 2026 | Sync order from the server's `rev` with compare-and-set on `baseRev`; device clocks only break ties (D8) | Decided |
| 21 Oct 2026 | Google sign-in first in B7; email later (D9) | Decided |
| 21 Oct 2026 | Supabase free Postgres in Mumbai, Neon fallback; Cloud Run in Mumbai (D10) | Decided |
| 21 Oct 2026 | Render free in Singapore instead of Cloud Run (D11, no card); Supabase moved to Singapore beside it; keep-awake ping; deploy = migrate, then Render deploy hook for the exact commit | Decided, live |
| 21 Oct 2026 | Go 1.27 in `go.mod` and the builder | Decided (support policy) |
| 21 Oct 2026 | Link devices by a QR scanned inside 99ile (the camera app opens Safari on iPhone); typed code as the other way | Decided |
| 23 Oct 2026 | Owner's proposals adopted as F56 to F78 in the order of D18; community needs accounts (D19); reminders through the inbox first (D23) | Proposed, owner to confirm |

## 13a. Search and History stay in the browser (D26, 24 Oct 2026)
The ⌘K palette and History (F51) read the student's own state in the browser. Sync already puts the same state on every linked device, so neither needs an endpoint, and both work offline. Per-student data is bounded by the sync limits (20,000 records, 8 MB), so in-browser search stays fast as students grow; the number of students does not matter because each browser searches only its own data. Server search arrives with shared content: community posts (F67, F68) get a Postgres `tsvector` column and a GIN index in the `community` schema.

## 14. Later services (planned 23 Oct 2026; details decided when each step starts)

**Solver (F57, F61; TypeScript, browser).** A small constraint solver for scheduling, grouping, tournaments and grid puzzles: counts the arrangements left after each clue, proves one answer, drives Replay and generates daily puzzles from a seed. Pure functions with property tests; loaded only on DILR and Arcade pages. No server.

**Notifications (F64, F65; Go module `notify`).**
- Inbox and preferences through `/v1/notify/*`, behind the same `/v1` gate and device cookie as sync.
- A scheduler (D24) every 15 minutes: students whose reminder time passed in their time zone, sync records show no finished practice today, not in quiet hours, nothing sent yet today (insert into `sends` with a unique key; a conflict means skip). Then write the inbox item and send web push (VAPID keys in Render env, never in the repo). A failed push leaves the inbox item; subscriptions that return 404 or 410 are removed.
- Frontend: push subscription in the existing service worker; the bell loads idle.

**Community (F67 to F70; Go module `community`).**
- Accounts only (B7); every read of a group checks membership in SQL, not by a secret id.
- The spoiler gate is checked on the server: a thread's posts are returned only if the identity has a synced attempt of that question (or the student says they did it on another device without sync, which unlocks it locally only).
- Text and KaTeX source stored; rendered in the browser with HTML escaped. Rate limits per account, link holding for new accounts, hide on three reports.
- Size: text only, about 1 KB a post; 100,000 posts is about 100 MB, inside the free database with sync.
