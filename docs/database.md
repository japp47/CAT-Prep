# 99ile: database design

The Postgres schema for the Go server: what is created in B2, what is planned for later branches, and the rules every table follows.
Part of plan (see `docs/architecture.md` §5, §6, §7 and §9, which this file details). Owner reviews before B2 is built.
Last updated 22 Oct 2026: one schema per area, `sync.heads`, D12–D17 answered.

---

## 1. Rules for every table

| Rule | Why |
|---|---|
| **No ORM.** SQL migrations are the source of truth; `schema.sql` is generated from them; `sqlc` turns queries into typed Go | The common production setup for Go and Postgres; every change is plain SQL that can be reviewed |
| **One schema per area** (§1.2), never `public` | Related tables sit together in DBeaver; grants are set once per area (the audit area is append-only for the server by default); an area can move out later without renaming. Supabase's Data API only exposes `public`, and it is switched off (§8) |
| **Always write the schema in SQL** (`account.devices`, never `devices`) | No `search_path` surprises; `sqlc` and DBeaver read the same names |
| **Ids:** `uuid` v7 made by the Go server for things people own (identities, devices, users); `bigint generated always as identity` for logs and inboxes | v7 ids are time-ordered, so inserts stay fast and ids sort by creation. Postgres 17 (Supabase) has no `uuidv7()`; the server makes them |
| **Time:** `timestamptz` only, set by the database (`default now()`). The device's own clock appears only as `stamp` in `sync.records` | One clock for audit; device clocks can be wrong |
| **Timestamps follow §1.1** | One rule, with its exceptions written down before any migration |
| **Status columns are `text` with a `check`**, not Postgres enums | Adding a value is one migration line; enums are awkward to change |
| **Foreign keys are explicit about deletes:** `on delete cascade` for data that belongs to an identity, `on delete set null` for history that must survive, `on delete restrict` for reference data | Deleting an identity removes its data in one statement (DPDP Act), while the audit log keeps the event with the link removed |
| **Secrets are stored as SHA-256 hashes** (`bytea`, 32 bytes, checked) and hidden from `cat_readonly` | Device cookies, recovery and link codes are random and long, so a fast hash is safe; a database leak gives nobody a usable code |
| **Every schema, table and column has a `comment`** | DBeaver and the Supabase dashboard show it next to the column |
| **Names:** `snake_case`, plural tables, `<table>_<cols>_idx` indexes, `<thing>_id` foreign keys | Predictable when writing SQL by hand |

### 1.1 Timestamps (decided 21 Oct 2026, before the B2 migrations)

**Rule 1. Every table has `created_at timestamptz not null default now()`.** No exceptions and no other name for it: event tables use `created_at` too, not `at`.

**Rule 2. `updated_at timestamptz not null default now()`, kept by the trigger `app.touch_updated_at()`, only on tables whose content is edited in place:**

| Table | Edited by |
|---|---|
| `sync.records` | Every accepted sync write |
| `sync.heads` | Every accepted push (new `rev`, counts) |
| `account.users` (B7) | Name, email verified |
| `account.profiles` (later) | The student |
| `support.feedback` (B6) | Status changes by staff |

**Rule 3. Tables without `updated_at`, and why:**

| Table | Kind | What records change instead |
|---|---|---|
| `audit.events` | Append-only | Rows are never changed |
| `access.role_permissions` | Join table | Rows are added or deleted, never changed |
| `access.roles`, `access.permissions` | Reference data, changed only by migrations | The migration history is their history |
| `account.identities` | Lifecycle | `status` changes only by suspend and unsuspend, recorded as `suspended_at` and an audit event. `last_seen_at` is activity (rule 4) |
| `account.devices` | Lifecycle | Only `revoked_at` (and `revoked_reason`) change; nothing is renamed. `last_used_at`, `last_synced_at` are activity (rule 4) |
| `access.grants` (B7) | Lifecycle | `revoked_at`, `revoked_by`; a grant is never edited, a new one is made |
| `account.recovery_codes` (B4) | Replace, not edit | A new code replaces the row, so its `created_at` is the time it was made |
| `account.link_codes` (B4) | Lifecycle | `used_at` |

**Rule 4. Activity columns are not updates.** `last_seen_at`, `last_used_at` and `last_synced_at` are written at most once an hour or every 10 minutes, to show "last synced" and to spot unused devices. A table that has them does not also have `updated_at`, because the trigger would move it on every touch and it would mean nothing.

**Rule 5. Lifecycle columns are named for the event:** `suspended_at`, `revoked_at`, `used_at`, `expires_at`, `handled_at`. Each is null until the event happens.

**Rule 6. The device's clock appears in exactly one place:** `sync.records.stamp` (`bigint`, milliseconds, the hybrid clock). Every `timestamptz` is the database's own `now()`.

### 1.2 Schemas (decided 22 Oct 2026, D17)

Postgres has one level of grouping: database → schema → table. Schemas cannot be nested, so each area of the app gets one schema.

| Schema | Holds | Created in | Server (`cat_app`) may | `cat_readonly` may |
|---|---|---|---|---|
| `app` | Shared helpers only: `touch_updated_at()` | B1 (built) | Use the functions | Nothing |
| `account` | Who someone is: `identities`, `devices`; later `recovery_codes`, `link_codes` (B4), `users`, `oauth_accounts` (B7), `profiles` | B2 | `select`, `insert`, `update`, `delete` | `select`, except secret hashes |
| `sync` | Synced progress: `heads`, `records`, sequence `rev` | B2 | `select`, `insert`, `update`, `delete`; the sequence | `select`, except `records.data` |
| `audit` | `events` | B2 | **`insert` and `select` only** | `select` |
| `access` | Staff roles: `roles`, `permissions`, `role_permissions`, `grants` | B7 | `select`, `insert`, `update` (revoking), no `delete` | `select` |
| `support` | `feedback` | B6 | `select`, `insert`, `update` | `select` |
| `ai`, `game` | AI cache and budgets (3b), daily scores (step 9) | later | per table | `select` |

Each schema's migration creates it, sets these grants as **default privileges** (so later tables in the area get them without anyone remembering), revokes everything from Supabase's `anon`, `authenticated` and `service_role`, and comments it. Foreign keys cross schemas freely (`sync.records` → `account.identities`).

Names checked against Supabase's own schemas (`auth`, `storage`, `realtime`, `extensions`, `graphql`, `vault`, `cron`, `net`, `pgbouncer`, `supabase_functions`): none clash. `identity` was avoided as a schema name because it is also SQL syntax (`generated always as identity`).

---

## 2. Who can touch the database (Postgres roles)

Two layers: **database roles** say what a connection may do; **app roles** (§4) say what a person may do in the app.

| Database role | Used by | Can |
|---|---|---|
| Owner (`cat` locally, `postgres` on Supabase) | The migrate command only (`cmd/migrate`, `MIGRATE_DATABASE_URL`) and the monthly clean-up | Everything; owns the tables |
| `cat_app` | The Go server at run time (`DATABASE_URL`) | Per schema, as in §1.2. Read `goose_db_version` to check the schema version. No `create`, `drop` or `alter` |
| `cat_readonly` | You in DBeaver, later dashboards | `select` per §1.2; **never** `sync.records.data` or any secret hash (column-level grants), so browsing never shows a student's answers or a usable secret by accident |
| `anon`, `authenticated`, `service_role` (Supabase) | Supabase's API (turned off) | Nothing on any of our schemas or on `goose_db_version` |

Migration `00002` creates `cat_app` and `cat_readonly` (with `login` but no password, so nobody can sign in as them yet). Their passwords are set once by hand on each database (`alter role cat_app password '…'`), never in a file; locally `make migrate` sets the dev passwords.

**Migrations are a separate step, never part of starting the server.**
- `cmd/migrate` connects with `MIGRATE_DATABASE_URL` (the owner) and applies new migrations. It refuses to run as `cat_app` or `cat_readonly`.
- `cmd/api` connects with `DATABASE_URL` (`cat_app`) and cannot change the schema. At start and on every `/readyz` it compares the database's version with the newest migration built into it: if the database is behind, it logs an error and `/readyz` answers 503 "waiting for a database update" until the migration runs. A database ahead of the server is fine (a new migration is applied before the new server version replaces the old one).
- Deploy order: `.github/workflows/deploy-api.yml` runs after CI passes on `main` and only when `server/` changed since the live commit (`/healthz` reports it from `RENDER_GIT_COMMIT`): `go run ./cmd/migrate` with the owner's URL (repository secret `MIGRATE_DATABASE_URL`), then Render's deploy hook for that exact commit (`RENDER_DEPLOY_HOOK`, `&ref=<sha>`), then it waits until `/healthz` reports the new commit and `/readyz` answers 200. Render's auto-deploy is off. By hand: `make migrate-prod` (link in `server/.env.prod`).
- **A migration must only add** (tables, nullable or defaulted columns, indexes), because the old server version keeps running on the new schema until Render swaps it. Renaming or dropping takes two deploys: stop using it first, remove it in a later migration.

---

## 3. Overview

```
account.identities ─┬─< account.devices
  (the anchor)      ├── sync.heads                 one row: this identity's latest rev and totals
                    ├─< sync.records ── device_id ─> account.devices (set null)
                    ├── account.recovery_codes      (B4)
                    ├─< account.link_codes          (B4)
                    ├── account.profiles            (later)
                    └── account.users               (B7) ─┬─< account.oauth_accounts
                                                          └─< access.grants >── access.roles ─< access.role_permissions >── access.permissions

audit.events      (B2, append-only; points at identities, devices and users with set null)
support.feedback  (B6; points at identities with set null)
```
`─<` one to many, `──` one to one, `>──` many to one. **An identity is the person's anchor:** anonymous at first, later owned by an account. Everything a student has hangs off `identity_id`, so signing in (B7) never moves data. Every arrow from a student's data to `account.identities` is `on delete cascade`; every arrow from history (`audit`, `support`) is `on delete set null`.

---

## 4. Roles and permissions (`access`, created in B7)

Students need no role: by default an identity can only read and write its own records. Roles are for staff (you now, a moderator later).

**Rules**
1. A permission is a fixed key like `feedback.read`. Code checks permissions, never role names.
2. A role is a named set of permissions. `admin` has all of them except `records.read`; `moderator` has a few.
3. A grant gives a role to an **account** (`account.users`), with who granted it, when, why, and when it was revoked. Grants are never deleted, only revoked, so the history stays.
4. **Admin powers need a signed-in account (D13), and the database enforces it:** `access.grants.user_id` references `account.users`, so an anonymous identity cannot hold a role at all. A stolen device cookie is never enough to act as admin.
5. **Until B7 there are no admin endpoints and no `access` tables.** You are the admin through DBeaver: `cat_readonly` for reading, the owner login for the rare fix. Creating role tables that no code reads would be dead weight and would have to point at identities, which D13 rules out.
6. Every admin action writes an `audit.events` row with `actor_type = 'admin'`.
7. **Nobody gets `records.read` for now (D14).** Staff can manage accounts and see metadata, not a student's answers. If support ever needs it, it becomes a permission granted on purpose and audited per use.
8. The first admin grant is made with a one-off command (`make grant-admin USER=<user-id>`, owner login), recorded in the audit log as `actor_type = 'system'`.

**Seeded in the B7 migration**

| Permission | Meaning | admin | moderator |
|---|---|---|---|
| `feedback.read` | See problem reports | yes | yes |
| `feedback.resolve` | Mark a report fixed or won't fix | yes | yes |
| `audit.read` | Read the audit log | yes | |
| `identity.read` | See an identity's devices, dates and status (not its records) | yes | yes |
| `identity.suspend` | Stop an abusive identity from syncing | yes | |
| `identity.delete` | Delete an identity and its data on request | yes | |
| `role.grant` | Grant and revoke roles | yes | |
| `stats.read` | Counts: identities, devices, records, sync volume | yes | yes |
| `records.read` | Read a student's synced data | **no one** | |

### `access.roles`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `key` | `text` | PK | | `admin`, `moderator`; `check (key ~ '^[a-z_]{2,32}$')` |
| `name` | `text` | not null | | Shown in the admin page |
| `description` | `text` | not null | | |
| `created_at` | `timestamptz` | not null | `now()` | |

### `access.permissions`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `key` | `text` | PK | | `area.verb`; `check (key ~ '^[a-z_]+\.[a-z_]+$')` |
| `description` | `text` | not null | | |
| `created_at` | `timestamptz` | not null | `now()` | |

### `access.role_permissions`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `role_key` | `text` | not null | | FK → `access.roles.key` on delete cascade |
| `permission_key` | `text` | not null | | FK → `access.permissions.key` on delete cascade |
| `created_at` | `timestamptz` | not null | `now()` | |
| | | | | PK (`role_key`, `permission_key`) |

### `access.grants`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `bigint` | PK | identity | |
| `user_id` | `uuid` | not null | | FK → `account.users` on delete cascade. Who holds the role |
| `role_key` | `text` | not null | | FK → `access.roles.key` on delete restrict (a role in use cannot vanish) |
| `reason` | `text` | not null | `''` | `check (length(reason) <= 200)` |
| `granted_by` | `uuid` | null | | FK → `account.users` on delete set null. Null = the bootstrap command |
| `created_at` | `timestamptz` | not null | `now()` | When it was granted |
| `revoked_at` | `timestamptz` | null | | |
| `revoked_by` | `uuid` | null | | FK → `account.users` on delete set null |
| | | | | unique (`user_id`, `role_key`) **where `revoked_at is null`**: one active grant per role |
| | | | | `check (revoked_by is null or revoked_at is not null)`: only a revoked grant has a revoker |

Code keeps the permission keys as Go constants; a test fails if code uses a key the seed does not have.

---

## 5. Tables created in B2

### 5.1 `account.identities`
The anonymous owner of synced progress. No name, email or password.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PK | | v7, made by the server |
| `status` | `text` | not null | `'active'` | `check (status in ('active','suspended'))`. Deleted identities are removed, not flagged |
| `suspended_at` | `timestamptz` | null | | |
| `suspended_reason` | `text` | null | | `check (length(suspended_reason) <= 200)` |
| `created_at` | `timestamptz` | not null | `now()` | |
| `last_seen_at` | `timestamptz` | not null | `now()` | At most once an hour, so a sync does not always write here |
| | | | | `check ((status = 'suspended') = (suspended_at is not null))` |
| | | | | index (`last_seen_at`): find identities unused for a year |

### 5.2 `account.devices`
One browser that syncs. Its cookie (`__Host-dev`) is the only session; there is no password.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PK | | v7 |
| `identity_id` | `uuid` | not null | | FK → `account.identities` on delete cascade |
| `secret_hash` | `bytea` | not null | | SHA-256 of the 32-byte cookie secret; unique; `check (octet_length(secret_hash) = 32)`. Hidden from `cat_readonly` |
| `label` | `text` | not null | `''` | "Chrome on Android", from the user agent once; `check (length(label) <= 60)` |
| `platform` | `text` | not null | `'other'` | `check (platform in ('ios','android','mac','windows','linux','other'))`: an icon in the device list |
| `created_at` | `timestamptz` | not null | `now()` | |
| `last_used_at` | `timestamptz` | not null | `now()` | At most once every 10 minutes |
| `last_synced_at` | `timestamptz` | null | | Shown as "last synced" in the device list |
| `revoked_at` | `timestamptz` | null | | A revoked device gets 401 and keeps its local copy |
| `revoked_reason` | `text` | null | | `check (revoked_reason in ('signed_out','removed','recovery','admin'))` |
| | | | | `check ((revoked_at is null) = (revoked_reason is null))` |
| | | | | unique index (`secret_hash`): every request looks the cookie up here |
| | | | | index (`identity_id`) where `revoked_at is null`: the device list |

### 5.3 `sync.heads`
**New on 22 Oct 2026.** One row per identity that syncs. It is the lock that keeps pulls correct, and it holds the totals used for limits.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `identity_id` | `uuid` | PK | | FK → `account.identities` on delete cascade. Made together with the identity |
| `rev` | `bigint` | not null | `0` | The highest `rev` given to this identity's records; a pull with this cursor is up to date |
| `record_count` | `integer` | not null | `0` | `check (record_count >= 0)`. Limit 20,000 |
| `data_bytes` | `bigint` | not null | `0` | `check (data_bytes >= 0)`. Sum of `records.data_bytes`; limit 8 MB (a heavy student is about 100 KB) |
| `created_at` | `timestamptz` | not null | `now()` | |
| `updated_at` | `timestamptz` | not null | `now()` | Last accepted push (trigger) |

**Why it exists (the bug it prevents).** `rev` comes from one sequence, and a sequence hands out numbers when asked, not when a transaction commits. Two devices of the same student pushing at once: push A takes `rev` 10, push B takes 11, B commits first, a third device pulls and moves its cursor to 11, then A commits `rev` 10. That device never sees row 10. **Every push therefore starts with `select … from sync.heads where identity_id = $1 for update`**, so one identity's pushes run one after another and its `rev`s become visible in order. Different students never wait for each other. Pulls take no lock.

### 5.4 `sync.records` and sequence `sync.rev`
Synced progress: one row per record (`docs/architecture.md` §6). The server stores `data` without reading it.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `identity_id` | `uuid` | not null | | FK → `account.identities` on delete cascade |
| `kind` | `text` | not null | | `rc`, `day`, `redo`…; the allow-list lives in Go so a new kind needs no migration. `check (kind ~ '^[a-z][a-zA-Z]{1,23}$')` |
| `rec_id` | `text` | not null | | The row's id in the browser; `check (length(rec_id) between 1 and 200)` |
| `data` | `jsonb` | null | | Null for a deletion. The server takes at most 16 KB as sent; stored jsonb adds a space after every `:` and `,`, so the column allows `octet_length(data::text) <= 32768` (`00007`). **Hidden from `cat_readonly`** |
| `deleted` | `boolean` | not null | `false` | `check (deleted = (data is null))` |
| `data_bytes` | `integer` | not null | generated | `generated always as (coalesce(octet_length(data::text), 0)) stored`: keeps `heads.data_bytes` exact without re-measuring |
| `stamp` | `bigint` | not null | | The device's hybrid-clock stamp; only a tiebreak in browser merges |
| `rev` | `bigint` | not null | `nextval('sync.rev')` | Server order; a new `nextval` on every accepted write. Pull order and compare-and-set use it |
| `device_id` | `uuid` | null | | FK → `account.devices` on delete set null. Which device wrote it last (debugging, audit) |
| `created_at` | `timestamptz` | not null | `now()` | First write |
| `updated_at` | `timestamptz` | not null | `now()` | Last accepted write (trigger) |
| | | | | PK (`identity_id`, `kind`, `rec_id`): the upsert key |
| | | | | unique index `records_pull_idx` (`identity_id`, `rev`): `where rev > $cursor order by rev limit 500` |

**One push, in one transaction:**
1. Lock the head (`for update`).
2. For each change: `insert … on conflict (identity_id, kind, rec_id) do update … where records.rev = $baseRev and records.data is distinct from excluded.data returning rev`. No row back means stale or unchanged; the server tells them apart and returns stale rows with the server copy.
3. Update the head: new `rev`, `record_count`, `data_bytes`.

**Refused one row at a time, never the whole push** (decided 22 Oct 2026 after negative tests): a row of an unknown kind, with a bad id, over 16 KB, or a *new* row that would take the identity past its limits comes back in `rejected` with a code (`unknown_kind`, `bad_id`, `record_too_big`, `over_limit`); the rest of the push applies. Updates and deletions are always allowed, so a full identity can make room. One `sync.rejected` audit event per push, with counts by code. The browser marks a refused row (`"!" + hash` in the ledger) and skips it until its content changes.

Size: about 100 KB per active student; a 500 MB free database holds about 5,000. Deletions stay as small tombstones so a device that was offline for months still learns about them.

### 5.5 `audit.events`
Append-only history of security and account events (`docs/architecture.md` §7). Not page views, not clicks, not study content.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `bigint` | PK | identity | Also the "newest first" order |
| `created_at` | `timestamptz` | not null | `now()` | When it happened |
| `action` | `text` | not null | | `area.verb`; `check (action ~ '^[a-z_]+\.[a-z_]+$')` |
| `actor_type` | `text` | not null | | `check (actor_type in ('device','user','admin','system'))`; `user` is used from B7 |
| `actor_identity_id` | `uuid` | null | | FK → `account.identities` on delete set null. Who did it |
| `actor_device_id` | `uuid` | null | | FK → `account.devices` on delete set null. From which device |
| `subject_identity_id` | `uuid` | null | | FK → `account.identities` on delete set null. Whose data it affected (often the same) |
| `target_type` | `text` | null | | `device`, `grant`, `feedback`…; `check (target_type ~ '^[a-z_]{2,32}$')` |
| `target_id` | `text` | null | | The target's id as text; `check ((target_type is null) = (target_id is null))` |
| `request_id` | `text` | null | | Matches the server log line |
| `ip_hash` | `bytea` | null | | HMAC-SHA256 of the IP with a server key (D16); `check (octet_length(ip_hash) = 32)` |
| `ip_key` | `smallint` | null | | Which yearly key made `ip_hash`, so hashes are only compared within one key; `check ((ip_hash is null) = (ip_key is null))` |
| `meta` | `jsonb` | not null | `'{}'` | Small details; `check (octet_length(meta::text) <= 2048)`. Never secrets, codes, cookies or study content |
| | | | | BRIN index (`created_at`): tiny, for the monthly clean-up by date |
| | | | | index (`subject_identity_id`, `id desc`): one student's history |
| | | | | index (`action`, `id desc`): "all failed recoveries this week" |
| | | | | index (`ip_hash`, `id desc`) where `ip_hash is not null`: one address making many identities |

`cat_app` can only insert and read here (default privileges of schema `audit`). Rows older than 400 days are deleted by a monthly job run as the owner. At about 50,000 rows a month no partitioning is needed; revisit above 10 million rows.

**Actions written from B2:** `identity.created`, `device.created`, `device.revoked`, `sync.rejected` (bad kind, too big, over a limit, rate limited). From B4: `recovery.created`, `recovery.used`, `recovery.failed`, `link.created`, `link.used`, `link.failed`. B5: `data.exported`, `identity.deleted`. B7: `account.created`, `account.signed_in`, `account.adopted`, `account.switched`. Admin: `role.granted`, `role.revoked`, `identity.suspended`, `feedback.resolved`.

### 5.6 Not in tables
- **Rate limits** (5 new identities an hour per IP, sync pushes per device) are kept in the server's memory: Render runs one instance, and a restart forgetting them is harmless.
- **Turnstile** answers are checked and forgotten.

### Helper: `app.touch_updated_at()`
One trigger function that sets `updated_at = now()` before an update, attached to every table with `updated_at`. Its `search_path` is empty (`00003`).

---

## 6. Planned later (not created in B2)

| Branch | Table | Main columns | Link |
|---|---|---|---|
| B4 | `account.recovery_codes` | `identity_id` PK (FK cascade), `code_hash` unique (32 bytes, hidden from `cat_readonly`), `created_at` | One per identity; a new code replaces the row |
| B4 | `account.link_codes` | `code_hash` PK, `identity_id` (FK cascade), `created_by_device_id` (FK set null), `created_at`, `expires_at`, `used_at`, `used_by_device_id` (FK set null) | Deleted a day after expiry |
| B6 | `support.feedback` | `id` identity, `created_at`, `updated_at`, `identity_id` null (FK set null), `page`, `item_id`, `kind`, `note` (≤ 1,000), `status` (`new`, `seen`, `fixed`, `wont_fix`), `handled_by` (FK → `account.users` set null; **added with B7**, since users do not exist yet), `handled_at` | Survives identity deletion with the link removed. **Built 23 Oct 2026** in `00009_feedback.sql`: cat_app may only insert; `note` hidden from cat_readonly. `seen` means it went out in a daily digest (B6b) |
| B7 | `account.users` | `id` v7, `identity_id` unique (FK restrict: delete the user first), `email`, `email_verified`, `display_name`, `last_sign_in_at`, `created_at`, `updated_at`; unique index on `lower(email)` | **An account owns exactly one identity** |
| B7 | `account.oauth_accounts` | PK (`provider`, `subject`), `user_id` (FK cascade), `email`, `created_at` | Google first; more providers need no change |
| B7 | `access.*` | §4 | Grants belong to accounts |
| later | `account.profiles` | `identity_id` PK (FK cascade), `nickname` (unique, case-insensitive), `display_name`, `exam_year`, `target_percentile`, `city`, `visibility` (`private`, `friends`, `public`), `created_at`, `updated_at` | Per **identity** (D15), so a student without an account can still pick a leaderboard nickname. Study settings stay in `sync.records` (they work offline) |
| 3b | `ai.cache`, `ai.runs`, `ai.usage`, `ai.budget` | As in `docs/architecture.md` §8 | |
| 9 | `game.daily_scores` | `date`, `identity_id` (FK cascade), `marks`, `secs`; unique (`date`, `identity_id`) | Re-scored by the server |

---

## 7. Data lifecycle

| Data | Kept | Removed by |
|---|---|---|
| Records | Until the student deletes them | `DELETE /v1/me` (cascade) or "delete everywhere" |
| Tombstones | With the records | Same |
| Revoked devices | 90 days after revocation | Monthly job |
| Link codes | 1 day after expiry | Daily job |
| Audit events | 400 days | Monthly job |
| Server request logs (IPs) | 7 days | Render log retention (Hobby plan) |
| Backups | Weekly encrypted `pg_dump` to R2, kept 8 weeks | `docs/plan.md` 2I |

Deleting an identity: one `delete from account.identities where id = $1`. Its devices, head, records, recovery and link codes go with it; audit rows and feedback keep the event with the link set to null; an `identity.deleted` event is written first. From B7, deleting an account deletes the user (grants and OAuth links go with it), then its identity.

---

## 8. Supabase setup (owner, once)

1. Region **Singapore (ap-southeast-1)**, next to the server on Render; Postgres 17. Untick "Automatically expose new tables". Save the database password (letters and numbers only, `openssl rand -hex 20`) in a password manager. **Done 21 Oct 2026**, project `99ile`.
2. **Switch off the Data API** (Project Settings → Data API), since 99ile talks to Postgres only through the Go server. Even if it were on, none of our schemas are exposed and every migration revokes them from `anon`, `authenticated` and `service_role`.
3. Use the **session pooler** connection string (IPv4, works with prepared statements) for the server, with the `cat_app` user.
4. Do not create tables in the dashboard; everything comes from migrations.

---

## 9. Migrations

| File | Branch | Creates |
|---|---|---|
| `00001_baseline.sql` | B1 | Nothing: the first version for the runner to record |
| `00002_roles_and_schema.sql` | B1 (**built**) | `cat_app` and `cat_readonly` (login, no password), schema `app`, read on `goose_db_version`, nothing for Supabase's `anon`, `authenticated` and `service_role`, `touch_updated_at()` |
| `00003_pin_function_search_path.sql` | B1 (**built**) | `touch_updated_at()` gets an empty `search_path` (Supabase security advisor 0011) |
| `00004_account.sql` | B2 | Schema `account` and its grants; `identities`, `devices`; `secret_hash` hidden from `cat_readonly` |
| `00005_sync.sql` | B2 | Schema `sync` and its grants; sequence `rev`; `heads`; `records` with the pull index and the `updated_at` triggers; `records.data` hidden from `cat_readonly` |
| `00006_audit.sql` | B2 | Schema `audit` with `cat_app` limited to `insert` and `select`; `events` and its indexes |
| `00007_records_data_room.sql` | B3 | `records.data` check widened to 32 KB of stored jsonb (the 16 KB limit stays on what is sent) |
| later | B4, B6, B7 | `account.recovery_codes`, `account.link_codes`; schema `support`; `account.users`, `account.oauth_accounts`, schema `access` with its seed |

Schema `app` stays as built (migrations only add); from B2 it holds only the shared trigger function. After the B2 migrations, `npm run db:generate` writes `server/schema.sql` (the whole schema in one file) and the `sqlc` code.

---

## 10. Decisions (answered 22 Oct 2026, as the database design; owner confirms)

| # | Question | Answer | Why |
|---|---|---|---|
| D12 | Roles and permissions as tables? | **Yes, in schema `access`, created in B7** with the first admin endpoint. Permission keys are Go constants checked by a test | Grants are data with a history; permissions are reviewed in migrations. Until B7 no code would read them, and you are admin through DBeaver |
| D13 | Admin powers only for a signed-in account? | **Yes, enforced by the database:** `access.grants.user_id` → `account.users` | A rule in a foreign key cannot be forgotten in code; a stolen device cookie can never carry a role |
| D14 | `records.data` hidden and no one holds `records.read`? | **Yes**, and secret hashes are hidden from `cat_readonly` too | Browsing the database must never show answers or usable secrets |
| D15 | Profiles per identity, not per account? | **Yes** | A nickname works without an account; an account owns one identity, so it reaches the profile anyway |
| D16 | A keyed hash of the IP, not the IP? | **Yes**, with `ip_key` saying which yearly key made it | Spots one address making 100 identities without storing addresses (DPDP); rotating the key makes old hashes unlinkable |
| D17 | Where do tables live? | **One schema per area** (`account`, `sync`, `audit`; later `access`, `support`, `ai`, `game`); `app` keeps only helpers; Data API off | Grouping, grants per area (audit append-only by default), room to grow. Schemas cannot be nested in Postgres |
| D18 | New: serialise each identity's pushes on `sync.heads`? | **Yes** | Without it a pull can skip a row for good (§5.3) |
