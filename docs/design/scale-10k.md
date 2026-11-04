# Scaling to 10,000 students (4 Nov 2026)

Decision D80 in `docs/analyze.md`. Phases 0 and 1 built 4 Nov 2026 (§7). The owner asked: "will we be able to handle 10k users", and then: "not just scaling up the server: through the codebase — sharding, db caching, optimisation techniques; think like a tech architect, system design and db design, with better memory use for users." This note reads the real code, finds where 10,000 students would hurt first, and orders the fixes by what they buy. Paying for bigger machines is the last step, not the first.

## 1. The system today (read from the code)

- **Site:** static on Cloudflare Pages. All scoring, plans and content run in the browser (D2), so the site keeps working when the server is down; only sync stops. This part already scales to 10,000 and far beyond.
- **API:** one Go service on Render (free: 512 MB, 0.1 CPU), behind a Cloudflare Pages function proxy. Stateless except an in-memory rate limiter.
- **Database:** Supabase Postgres 17 (free: 500 MB), pool of 5 connections (`store.Open`).
- **Sync model:** `sync.records`, one row per record (`identity_id, kind, rec_id` primary key; `(identity_id, rev)` unique index for pulls), `data jsonb`, tombstones kept; `sync.heads` per identity, locked on every push so revs commit in order.
- **Browser storage:** the whole state is one JSON string in `localStorage`. Every edit `structuredClone`s the whole state and `JSON.stringify`s it into storage (`lib/store.tsx`, `lib/tabs.ts`), on the main thread.
- **Sync traffic:** a round (pull then push) 30 s after a change, when the tab hides, and on focus after 5 minutes; no polling (`lib/sync/runner.ts`).

## 2. Load at 10,000 students (estimate, to be measured in phase 0)

| Quantity | Light student (≈120 study days) | Serious student (≈300 days, daily practice) |
|---|---|---|
| Rows a year | ≈500 | ≈3,500 |
| Stored size (jsonb + row overhead + two indexes) | ≈250 KB | ≈1–2 MB |

Measured from the real record shapes (an RC attempt is about 330 bytes of JSON, an LR attempt with the calculator log about 630, a day record 285, a practice row 273). With 8,000 light and 2,000 serious students: **≈10 million rows and 5–6 GB**, and on an evening peak roughly **10 sync calls a second** (3,000 daily students × 30 calls, a third of them in two hours). The plan's earlier "100 KB a student" was too low.

## 3. Where it breaks first, in order

| # | Bottleneck | Why (in the code) | Effect at 10k |
|---|---|---|---|
| 1 | **Database size** | 500 MB free; ≈250 bytes of row and index overhead on every small record; jsonb under 2 KB is never compressed (TOAST starts at about 2 KB) | Full at about 300 serious or 2,000 light students |
| 2 | **Push round trips** | Each change is two queries (`select … for update`, then `insert`/`update`) inside one transaction holding the student's head lock: a 200-change push is ≈400 round trips, ≈0.4–0.8 s on one of only 5 connections | Pool exhausted at peak; pushes queue; first syncs of a big history time out |
| 3 | **Phones: whole-state saves** | One `localStorage` string: every tick clones and stringifies 1–2 MB on the main thread; `localStorage` is capped near 5 MB per site | Jank on cheap phones after months of use; a serious student hits the cap in two to three years, and the save then fails |
| 4 | **Empty pulls** | Most pulls find nothing new but still run the records query | Wasted database time on every focus and every round |
| 5 | **Auth lookup per request** | Every `/v1` call reads the device and identity from Postgres | One extra query per call |
| 6 | **Free compute** | 0.1 CPU; one instance | Fine for 10 calls a second once 2, 4 and 5 are fixed; tight before |

What is **not** a bottleneck at 10k: the static site, the CDN, the proxy, Postgres's ability to hold 10 million rows (it holds billions), or the indexes (both are the right ones).

## 4. Principles

1. **Measure before and after every change** (phase 0): a load test that replays 10,000 students' real traffic, and the database's own statistics.
2. **Fewer round trips beats a bigger server.** Batch work into set-based SQL.
3. **Store less before storing cheaper:** do not sync what can be derived; pack old, never-changing records so Postgres compresses them.
4. **Cache only what is read often and changes rarely**, in the process, with short lifetimes. No Redis while there is one server.
5. **No sharding at this size.** One Postgres holds this load with room for 50 times more. Shard keys are already in place (`identity_id` everywhere), so partitioning later is a migration, not a rewrite.
6. **The browser is the main database for a student** (local-first): its storage must stay fast at three years of use.

## 5. The plan

### Phase 0: measure (2 days)
- **Load test** (`server/cmd/loadtest`, Go, run against a staging database): 10,000 synthetic identities with a realistic history (a 3,500-row serious student and a 500-row light one), then a two-hour evening peak: first syncs, small pushes after a set, empty pulls on focus. Reports p50, p95 and p99 latency per endpoint, errors, and pool waits.
- **Targets (service levels):** push p95 under 300 ms, pull p95 under 150 ms, errors under 0.1% at 3× the peak.
- **Database facts:** `pg_stat_statements` (time per query), table and index sizes (`pg_total_relation_size`), bytes per identity from `sync.heads.data_bytes` (readable by `cat_readonly`), without reading any student's answers.

### Phase 1: the server's hot path (3–4 days)
- **Set-based push.** Read every changed row in one `select … where (kind, rec_id) in (select * from unnest($kinds, $ids)) for update`, decide in Go as now, then write all inserts in one `insert … select from unnest(…)` and all updates in one `update … from unnest(…)`. About 4 round trips whatever the batch size, instead of 2 per change. Same rules (base rev, stale, limits), same tests, plus a test that a 200-change push makes at most 5 queries.
- **Empty-pull shortcut.** Before the records query, compare the cursor with the head: `select rev from sync.heads where identity_id = $1` (a primary-key read). Equal means nothing to send. Later, an in-process map of head revs makes most pulls touch no table at all.
- **Auth cache.** Device → identity and status in an in-process LRU (about 50,000 entries, 60-second lifetime), dropped at once on revoke and sign-out in this process. Saves one query per call. The lifetime bounds how long a revoked device stays valid on another instance, if there are ever two.
- **Pool and timeouts.** Pool sized to the plan (10–15 through Supabase's pooler), a 5-second statement timeout on sync queries, connection idle limits.
- **Compressed responses.** gzip or brotli on `/v1` JSON (pulls compress 5 to 10 times): less mobile data for students on slow plans, faster first syncs.

### Phase 2: store less (4–5 days, its own design doc first)
- **Stop syncing what can be derived.** The `practice` rows written for every on-site attempt ("Practice: <title>") repeat the attempt; the browser can rebuild them from attempts. Only rows a student logs by hand stay. About a quarter of all rows go.
- **Pack old records.** RC, VA, CR, LR, drill, Arena, speed, sectional and mock-review records never change once written (`WRITE_ONCE` in `lib/sync/records.ts`). Once a month, the browser seals those older than 60 days into one pack per kind and month: a single record of kind `pack` holding the list. A pack is a few kilobytes, so Postgres compresses it (set `lz4`): about 20 times fewer rows for old history and 2 to 4 times less space. Devices unpack on pull; a pack replaces its members with tombstones, so offline devices converge. Needs its own design doc and property tests (two devices, offline months, the same month packed twice).
- **Purge old tombstones** once every device of the identity has synced past them, or after 180 days (`cmd/cleanup`).
- **Cold storage for the inactive.** Identities with no sync for 18 months are exported to object storage (the same JSON as `/v1/me/export`) and removed from the hot database; a returning student's first sync restores them.

### Phase 3: the browser (3–4 days)
- **IndexedDB instead of one localStorage string.** One object store per kind; a save writes only the records that changed (the sync ledger already knows which). No 5 MB cap in practice, and no whole-state stringify on the main thread.
- **Structural sharing instead of `structuredClone`.** An update copies only the arrays and objects it touches (copy-on-write helpers, or Immer if the bundle budget allows), so a tick on Today costs microseconds, not a 2 MB clone.
- **Keep recent data in memory.** The last 6 months of attempts load at start; older ones load when History, Progress's "All the numbers" or a review asks. Progress keeps running totals so it does not re-read years of attempts.
- **A size check.** Settings shows the local data size; a warning at 3 MB before anything fails.

### Phase 4: scale up only then
- **Paid plans when phase 0 says so:** a database plan with room (the 5–6 GB estimate becomes ≈2 GB after phase 2) and an always-on instance with more CPU. Check current prices at the time.
- **Horizontal scaling** when one instance passes 60% CPU at peak: the API is stateless except the rate limiter and the caches; the head lock is in Postgres, so two instances stay correct. Then the rate limiter moves to a shared store (Postgres or Redis) and the caches keep short lifetimes.
- **Partitioning** `sync.records` by hash of `identity_id` (8 to 16 partitions) when it passes about 50 million rows: smaller indexes and faster vacuum, the same queries. **Sharding** across databases (Citus or by identity range) only beyond about a million students.

## 6. What it buys

| After | Database at 10k | Push of 200 changes | A tick on a 2 MB state (mid phone) |
|---|---|---|---|
| Today | 5–6 GB, 10 M rows | ≈400 round trips | clone + stringify of 2 MB on the main thread |
| Phases 1–3 | ≈2 GB, ≈3 M rows | ≈4 round trips | a few changed records written in the background |

The numbers in this table are estimates until phase 0 measures them; each phase ends with the load test run again and the result written here.

## 7. Phases 0 and 1, as built and measured (4 Nov 2026)

**The load test** (`server/cmd/loadtest`): seeds 10,000 students (2,025 serious) into a separate local database, `cat_load`, the way sign-up makes them, then replays a peak through the real API: pulls that find nothing new, pushes after a set (new attempts plus an update to the day record), and new devices pulling their whole history. A proxy in front of Postgres adds 1 ms to every read (`-lag`), so round trips cost about what Render to Supabase costs. The API ran on one core (`GOMAXPROCS=1`).

**Database size, measured:** 10.7 million records, **5.5 GB** (table 3.7 GB, indexes 1.8 GB), **563 KB a student on average**, 538 bytes a record. The JSON the browsers send is only 1.7 GB; the rest is row and index overhead. Phase 2 is aimed at exactly that overhead.

**Phase 1 as built:**
- **Set-based push** (`internal/syncapi`): one query reads and locks every row a push names (`unnest` joined to `sync.records`, `for update of r`), the rules are decided in Go in the order sent, then one `insert … select from unnest` and one `update … from unnest` write everything. About 5 round trips whatever the size of the push, instead of 2 per change. Every existing test passes, including concurrent pushes never hiding a row, limits and stale copies; two new tests cover a mixed push in order and a second device seeing a push at once. One difference at the edge: within one push, the per-identity byte limit counts earlier new rows by the size sent rather than the size Postgres stores (the head is corrected to stored sizes before it is written).
- **"Last synced" written at most once a minute** per device from memory (`internal/syncapi/recent.go`), so most calls no longer make that extra write.
- **`DB_MAX_CONNS`** sets the pool (default 5; `.env.example`), and **every `/v1` call has a 10-second limit** (`deadline` in `cmd/api/main.go`), so a slow database cannot pile up waiting requests.

**Measured, before and after** (same data, 1 ms lag, one core):

| | Before | After |
|---|---|---|
| A push of 200 records (a long history turning sync on) | 1,103 ms | **31 ms** |
| Push p95 at the expected 10k peak (12 sessions a second) | 83 ms | **30 ms** |
| Push p95 at 150 sessions a second | 6,055 ms (every call queued) | **24 ms** |
| Where it saturates (pool of 5) | about 150 sessions a second | about 250 |
| At 250 sessions a second with `DB_MAX_CONNS=10` | | **push p95 23 ms, no errors** |

250 sessions a second is about 20 times the expected peak of 10,000 students. Render's free plan has far less CPU than the core used here, so the real ceiling is lower; the next check is the same load test against a staging service on Render.

**Tried and not kept, with reasons:**
- **A login cache** (device lookups in memory for a minute). It broke a test that matters: a student suspended or deleted directly in the database must be refused at once, and the cache kept them for up to a minute (a deleted one even got a server error). Clearing it from outside the API needs Postgres notifications, which Supabase's transaction pooler does not carry. It would save one round trip a call; not worth weaker security now.
- **Answering empty pulls from memory.** Browsers pull on focus after five minutes; an entry trusted longer than about 30 seconds would delay sync between devices once there is a second server, and at 30 seconds it almost never hit. No measured gain, so removed.
- **gzip in the API.** Cloudflare already compresses responses to students; it would only shorten the hop from Render to Cloudflare.

**For the owner, on Render:** set `DB_MAX_CONNS=10` (Supabase's free plan allows far more connections than that).
