# 99ile: implementation (implement)

Branch-by-branch work for the features in `docs/feature.md`, in the order of `docs/plan.md`.
Each entry is small enough for one pull request. The owner commits and pushes; each entry gives the branch and the commit message.
Last updated 21 Oct 2026 (step 3 re-planned).

**Every branch, before it is called done:**
- `npm run typecheck`, `npm test`, `npm run build`, `npm run size` (and `npm run catalog` after content changes).
- Server branches also: `cd server && go vet ./... && go test ./...` (integration tests with `TEST_DATABASE_URL` once B1 lands).
- Playwright check at 412 and 1440 wide, light and dark, no console errors, no sideways scroll.
- Design rules: no text under 14px, no monospace, no all-caps labels, sentence case, tone not borders, one filled button per screen, highlighter only for what matters most, 44px tap targets, animations stop under reduced motion.
- New records: an `id`, an `updatedAt`, read through `normalize()` (old backups load with an empty list), included in backup and restore, and counted in `activityDays` when they are study.
- Tick the tasks here and add a "Built" line to `docs/plan.md` Part 3.

**Entry template**
```
### <id>. <name>  (feature F<n>)
Branch · Commit message
Why: one line.
Data: new or changed records.
Files: new and changed.
Tasks: [ ] …
Tests: …
Done when: …
```

---

## Step 2f: mock analysis and the weekly review

### 2f-1. Mock analysis wizard (F12, with the F43 record)
`feat/mock-review` · `feat: guided mock analysis with where the marks went`

**Why.** Turn a mock score into at most three actions with evidence.

**Data** (`src/lib/state.ts`):
```ts
/** What happened to the student on a question they missed. Shared by the mock review and, from 2g, the Error log. */
export type Cause = "misread" | "qualifier" | "beyond" | "trap" | "method" | "slip" | "guess" | "select" | "time";
export interface MockQ {
  st: "right" | "wrong" | "skip" | "unseen";
  type: string;                 // "rc" or a VA kind ("ps", "pj", "oso", "si"); DILR and Quant add theirs
  slow?: boolean;               // right, but too slow
  cause?: Cause;                // wrong answers
  could?: boolean;              // skipped or not reached: could I have got it?
  solved?: boolean;             // doable skip, re-solved untimed after the mock
  secs?: number;                // known for in-app sectionals
}
export interface MockReview {
  id: string; d: string; updatedAt: number;
  mock: string;                 // the Mock row it explains (mocks chart stays the one place for scores)
  sec: string;                  // "VARC"
  from: "manual" | "sectional"; att?: string;  // sectional id when from the app
  name: string;
  layout: { rc: number[]; va: string[] };     // e.g. rc [4,4,4,4], va ["ps","ps","si","si","oso","oso","pj","pj"]
  planned?: number;             // attempts planned before the mock
  qs: MockQ[];
  recs: string[];               // recommendation ids kept at the last step
}
export interface Recommendation {
  id: string; d: string; updatedAt: number;
  from: "mock" | "week" | "next"; src?: string;    // the review it came from
  sec: string;
  skill: { kind: "type" | "trap" | "cause" | "pace" | "redo"; key: string };
  text: string;                 // "Drill 6 para jumbles this week"
  to?: string;                  // where to do it, e.g. "/practice/va?type=pj&n=6"
  why: string;                  // "3 of 4 para jumbles wrong, 2 of them marked careless"
  status: "open" | "done" | "dismissed";
  before?: { c: number; n: number };          // accuracy on the skill when made
  after?: { c: number; n: number; d: string }; // filled by 2g (F43)
}
```
`AppState` gets `mockReviews: MockReview[]` and `recs: Recommendation[]`. `CAUSES` labels go in `src/data/traps.ts` next to `TRAPS`:
misread the passage, missed a qualifier, read too much into it, fell for the trap, ran out of time, guessed, did not know the method, careless slip.

**Files**
- New `src/practice/mockreview.ts`, pure:
  - `defaultLayout(sec)`: VARC 4 × 4 RC and 8 VA (2 of each kind; the student can change any cell's type).
  - `fromSectional(att, content)`: a filled `MockReview` from a `SectionalAttempt` (status, type and seconds per question).
  - `marksLost(review)`: lost marks per cause and per type, careless marks (wrong + knew), skips worth trying (skip + time), not reached.
  - `proposeActions(review, history)`: up to 3 `Recommendation` drafts, each needing at least 2 questions of the kind; ranked by marks lost. Uses `before` from the report's accuracy functions.
  - `toErrors(review)`: Error log entries for wrong questions, source "Mock: <name>, Q<n>".
- New `src/pages/tracker/MockReview.tsx`: the 5-step wizard (basics, grid, where the marks went, actions, save). Route `/progress/mock-review` and `/progress/mock-review/:id` (read-only view of a saved one) in `App.tsx` and `TITLES`.
  - Grid: `PaletteCell` from `pages/practice/common.tsx`; tapping a cell opens a bottom sheet (phone) or popover (laptop) with status, cause and "Could I have got it?" chips.
  - Draft in `lib/draft.ts` under `mockreview:new`.
- Entry points: "Analyse a mock" in Progress → Mocks and target (one secondary button); "Analyse this sectional" on the sectional review page; after logging a mock in Log, a text link "Analyse it".
- `src/pages/tracker/Mocks.tsx`: list of past reviews under the chart (name, date, careless marks, actions kept).

**Tasks**
- [x] Types, `normalize()` for `mockReviews` and `recs`, `CAUSES`.
- [x] `mockreview.ts` with tests.
- [x] Wizard page, draft, routes, titles, search index entry.
- [x] Entry points (Mocks tab, sectional review, Log).
- [x] Saving writes the Mock row (or links the existing one), the review, the kept recommendations, and optional Error log entries in one `update`.
- [x] `activityDays` counts a review day.

**Tests**
- `marksLost` covers every lost question once; 3 × right − wrong MCQ equals the mock's score; TITA wrong costs nothing.
- `proposeActions` returns nothing for a kind with 1 question; at most 3; ranked by marks.
- `fromSectional` matches the sectional's own scoring (`scorePaper`).
- Old backups load with empty `mockReviews` and `recs`.

**Built 21 Oct 2026** on `feat/mock-review`: `practice/mockreview.ts` (13 tests), `pages/tracker/MockReview.tsx` (wizard and saved view), `pages/tracker/MockReviews.tsx` (Mocks tab section), links from Log and the sectional review. Playwright: the full flow at 412 and 1440 in both themes, and from an in-app sectional. Differences from the plan: step 3 "Re-solve" added from research; the grid uses an editor card under the palette, not a sheet; a manual review also writes practice rows by type; unreached questions count as time, without "could you have got it?".

**Done when** a VARC mock with 6 wrong and 3 skipped can be reviewed on a phone in under 3 minutes of tapping, the actions show their evidence, and the review appears under the mocks chart.

### 2f-2. Weekly review (F13, with the light-week check F19)
`feat/weekly-review` · `feat: weekly review with one focus for next week`

**Data:**
```ts
export interface WeekReview {
  id: string;                   // the Monday of the week reviewed, "2026-10-19"
  d: string; updatedAt: number;
  focus?: string;               // recommendation id, or undefined for "No focus this week"
  light?: boolean;              // the student chose a lighter week
  closed: boolean;              // card dismissed
}
```
`AppState.weekReviews: WeekReview[]`.

**Files**
- New `src/practice/week.ts`, pure:
  - `weekStart(d)` (Monday), `weekFacts(state, monday)`: days studied, minutes done vs planned (`doneMinutes`, `budgetFor`), questions and accuracy (from `practice` rows, the same rows the report uses), improved and slipped types (10+ points, 6+ questions both weeks), top trap, redo cleared and due, last focus's questions and accuracy change.
  - `suggestFocus(state, monday)`: the weakest skill with enough evidence, else an open mock action, else none; plus two alternatives.
  - `needsLightWeek(facts)`: minutes fell by half or more, or 3 missed days in a row.
- New `src/pages/Review.tsx` at `/review` (and `/review/:monday` for past weeks): week in numbers, improved and slipped, top trap, redo, last focus, light-week note, focus picker (one filled button: "Set this focus").
- Card "Your week in review" on Today and in Home's today panel, Saturday 18:00 to Monday 23:59, until closed.
- `src/planner/engine.ts`: when an open focus recommendation exists for the current week, add a 15-minute `focus` block on the first three study days of the week, taking minutes from the last optional block. Links:
  - VA kind → `/practice/va?type=<kind>&n=6`; CR type → `/practice/cr?type=<type>&n=6`;
  - RC question type → the type guide and the next untried set with 2 or more questions of that type (a drill of RC questions by type does not exist yet; see 2g-5);
  - redo → `/practice/redo`; pace → `/practice/speed`.
- `src/data/roadmap.ts`: regroup by outcome (complete the learning loop, complete the three sections, the coach, sync and community) and move 2f items to "Just shipped" (A8).

**Tests**
- `weekFacts` equals the report card's numbers for the same dates.
- A week with no practice gives "no practice" facts and `needsLightWeek` true after a busy week.
- The focus block appears on exactly three days, never pushes the day over its budget, and disappears when the focus is "No focus" or dismissed.

**Built 21 Oct 2026**: `practice/week.ts` (10 tests), `practice/weekopen.ts` (the two helpers Home needs, kept apart so the main script stays small), `pages/Review.tsx` at `/review` and `/review/:monday`, the card and the "Focus of the week" row on Today, a line on Home, "Weekly review" in the menu, footer and search. Playwright with the clock set to Sunday and Tuesday: card, review, focus, save, focus row, mark done, at 390 and 1440 in both themes. Differences from the plan: the focus is a row on Today until done three times, not a block inside the planner engine (same effect, no risk to the timetable); the light-week check links to Plan rather than changing minutes itself; the review follows the exam-wrapper order from research and ends with an optional "what will you do differently?" line. Midweek the page opens on "this week so far" (numbers only, plus this week's focus and days done); the focus for next week is picked from Saturday 18:00, when the week is complete, and minutes are compared only for a full week.

**Done when** on a Sunday the card appears, the review fits two phone screens, and choosing a focus changes the next three study days.

---

## Step 2g: the learning loop

**Built 21 Oct 2026, one branch `feat/learning-loop`** (all five parts; they share `state.ts`, `record.ts` and the players). Research in `docs/research/step-2g.md` changed: "fixed" needs 12 questions after and a rise of 15 points (was 8 and 10); patterns rank trap labels from the content above causes the student picked; the next step shows one suggestion with "Something else", never a list.
Files: `practice/types.ts` (`contentHash`, `rcVersion`, `vaVersion`, `v` in the catalog), `practice/versions.ts`, `practice/record.ts` and `sectional.ts` (store `v`, `unsure`, `lucky`), `practice/report.ts` (`patterns`, `luckyGuesses`, `drillForType`, stale attempts skipped by kind), `practice/recs.ts`, `practice/next.ts`, `pages/practice/common.tsx` (`NotSure`, `ErrorCause`), the RC, VA and CR players, `pages/Errors.tsx` (patterns, edit trap and cause), `pages/tracker/Fixing.tsx` (three answers, weak spots you are fixing), `pages/Today.tsx` (Start here), `pages/Settings.tsx` (Practice: show or hide "Not sure"). Tests: `versions`, `notsure`, `patterns`, `recs`, `next` (27 new). Not done from the plan: cause chips are under logged wrong answers in RC, VA and CR reviews, not in the sectional or redo reviews; the next step is on Today only, not Home (keeps the main script small); an RC drill by question type (2g-5 optional) is still to do.

Five small branches, any order after 2f, except 2g-4 needs 2f-1's `Recommendation`.

### 2g-1. Content versions on attempts (F46)
`feat/content-versions` · `feat: remember which version of a set each attempt answered`
- `scripts/catalog.ts`: a short hash (first 8 hex of SHA-256 over questions, options and answers) per RC set, VA paragraph and CR item, written to the catalog as `v`.
- Attempts get an optional `v` (RC: one per attempt; VA and CR: one per item). Recording functions in `practice/record.ts` and the sectional store it.
- Review pages: if the stored `v` differs from the catalog, show the score and "This set was rewritten after you took it" instead of the old answers.
- `practice/report.ts`: by-type and by-kind rows skip mismatched attempts; totals keep them.
- Tests: changing one option changes only that hash; attempts without `v` count as matching.

### 2g-2. Error causes and patterns (F42)
`feat/error-patterns` · `feat: error causes, corrections and patterns`
- `ErrorEntry` gets `cause?: Cause`, `trapWas?`, `causeWas?` (kept when the student corrects one).
- Review screens (RC, VA, CR, sectional, redo): one row of cause chips under each wrong answer; a suggestion is pre-selected when the data shows one (answered in under 20 seconds → careless slip; flagged "Not sure" (2g-5) → guessed); the student can change it.
- `src/pages/Errors.tsx`: edit an entry's trap and cause.
- `practice/report.ts`: `patterns(errors, practice, days=30)`: top type × trap and type × cause pairs with counts, minimum 4 errors and 6 questions of the type, and a sentence for each.
- Patterns block at the top of the Error log and in the report card, each with a one-tap drill (same links as the focus block).
- Tests: thresholds; a correction moves the count at once; old entries without cause still count by trap.

### 2g-3. Next step (F41)
`feat/next-step` · `feat: one next step on Today and Home`
- New `src/practice/next.ts`: `nextStep(state, today, drafts)` returns `{ title, mins, to, why? }` from the ranked rules in F41.
- A "Start here" row at the top of Today and in Home's today panel; it is the screen's one filled button (other buttons there become secondary).
- When followed, a `Recommendation` with `from: "next"` is recorded only if a weakness drove it (not for plain plan blocks), so history stays small.
- Tests: one test per rule, the order, and "never something already done today".

### 2g-4. Fixing and the three questions in Progress (F43, F44)
`feat/progress-fixing` · `feat: show which weak spots are getting fixed`
- `practice/recs.ts`: `measure(rec, state)` fills `after` from the next 12 questions of that skill or 14 days; `fixedState(rec)` → working on it, fixed (+10 points, 8+ questions after), not yet.
- Progress opens on three answers (improving, fixing, exam ready) above the existing tabs.
- Tests: `before` and `after` use `accuracy()` from the report; nothing "fixed" on fewer than 8 questions.

### 2g-5. Not sure (F45), and RC drill by question type
`feat/not-sure` · `feat: mark answers you were not sure of`
- A quiet "Not sure" toggle beside each question in the RC, VA and CR players and the sectional; stored per question in the attempt (`unsure?: number[]`, question indexes).
- Right and not sure → into the redo queue once (`queueMiss`). The report shows lucky guesses by type.
- Setting to turn it off (`lib/prefs.ts`).
- Optional in the same branch, or its own (`feat/rc-type-drill`): an RC drill that serves questions of one type across sets, each with its passage, so focus drills for RC types have a real target.

---

## Step 3: backend v1 (re-planned 21 Oct 2026)

Research: `docs/research/step-3.md`. Spec: `docs/feature.md` step 3 (F50, F33/F47, F39, privacy page). Design: `docs/architecture.md` §5, §6, §9, §10.
Decisions this plan assumes (owner to confirm, `docs/analyze.md` §5): **D8** server order with `baseRev`, **D9** Google first, **D10** Supabase with Neon as fallback, and **D11** the server host (later changed to Render and Singapore, see B1).

**Order and target dates.** Each line is one pull request. Students see nothing of sync until B5 is merged: until then the Sync section is behind `VITE_API_ENABLED`, which is off in production.

| # | Branch | What | Target |
|---|---|---|---|
| S5 | `feat/sync-ledger` | Records, merge rules, ledger, longer ids, F50 (keep data safe) | 22–28 Oct |
| B1 | `feat/server-foundation` | Config, errors, database, migrations, CI, deploy | 29 Oct–5 Nov |
| B2 | `feat/sync-rc-slice` | Identity + RC attempts synced end to end (dev only) | 6–14 Nov |
| B3 | `feat/sync-all-records` | Every kind, first sync, restore-merge, delete choice | 15–22 Nov |
| B4 | `feat/device-link` | Recovery code, link a device, device list | 23–29 Nov |
| B5 | `feat/data-export-delete` | Export, delete everywhere, privacy page; **sync on for students** | 30 Nov–4 Dec |
| B6 | `feat/feedback-inbox` | Report a problem to the server | 5–7 Dec |
| B7 | `feat/google-sign-in` | Google sign-in, "save this device's progress" | 8–18 Dec, or after DILR if DILR slips (`docs/analyze.md`, R1) |

**Every server branch** also runs `cd server && go vet ./... && go test ./...`, and from B1 the integration tests against the compose Postgres (`TEST_DATABASE_URL`, never a real database).

---

### S5. Sync ledger and keeping data safe (prep, F50)
**Built 21 Oct 2026** on `feat/sync-ledger`. Files: `src/lib/sync/records.ts` (`toRecords`, `fromRecords`, `mergeRecord`, `applyRecords` with this device's deletions, `mergeBackup`, `parseKey`), `src/lib/sync/ledger.ts` (`track`, `dirty`, `records`, `receive`, hybrid clock `stamp`/`saw`, own key `cat-prep-sync`), `src/lib/sync/background.ts` (loaded through `whenIdle` from `store.tsx` after saves: updates the ledger 1.5 s after the last change, asks for persistent storage once there is progress), `src/lib/keep.ts`, `src/lib/backup.ts` (`downloadBackup`, `hasProgress`), `src/components/KeepHint.tsx` (on every score card and in Settings), `src/lib/date.ts` (`uid` with 10 crypto characters), Settings (size line from 2 MB, warning from 4 MB; Install card says the Home Screen app starts empty). Tests: `src/lib/sync/sync.test.ts`, 53 (40 seeded two-device runs of three rounds each with clock skew up to a day; mutation-checked: dropping local deletions or the block merge fails them). Main script 132.4 KB (+0.2). Differences from the plan: device time is a **hybrid clock** instead of a clamp (the clamp still let a fast clock win); the Home Screen advice includes moving progress, because iPhone keeps the app's data apart from Safari (research finding 16). The ledger runs even with sync off, so settings and days carry real change times when a device first links; deletions are kept only while sync is on.
`feat/sync-ledger` · `feat: track changes for sync and keep progress safe on this device`
**Why.** Sync needs every row as a record with a last-seen `rev`, merge rules, and deletions kept as tombstones, without changing every reader of `AppState` (A5). F50 helps every student now, server or not.
**Data.** No change to `AppState` (stays version 4). New localStorage key `cat-prep-sync` (ledger), not part of backups.
**Files.**
- New `src/lib/sync/records.ts`: `toRecords(state)` → `{ kind, id, data }[]` for every kind in `docs/architecture.md` §6.1; `applyRecords(state, records)` merging by kind (newest stamp wins; `redo` by tries; `day` field by field; tombstones remove).
- New `src/lib/sync/ledger.ts`: `{ on, cursor, hi, rows: { "<kind>:<id>": [hash, stamp, rev, serverHash] } }`, stamps from a hybrid clock (`hi`). `diff(state, ledger)` → dirty rows (new or changed hash → `updatedAt = now`) and tombstones (missing). Rows that carry their own `updatedAt` (sectionals, summaries, mock reviews, recommendations, week reviews) use it.
- `src/lib/sync/restore.ts`: `mergeBackup(state, backup)` = `applyRecords(state, toRecords(normalize(backup)))`, used by Settings restore when sync is on (B3 wires the choice).
- `src/lib/date.ts`: `uid()` random part 10 characters from `crypto.getRandomValues` (old ids untouched).
- `src/lib/storage.ts` (or in `pwa.ts`): `persistOnce()` after the first finished practice; `isIosSafariTab()`; `stateBytes()`.
- `src/pages/Settings.tsx`: the iPhone line (dismissible, pref `iosHint`), size line above 2 MB, warning with "Download backup" above 4 MB.
- No network code. Nothing in the main script that the first page does not need: the sync files load with Settings or after idle (`lib/idle.ts`).
**Tasks.** [ ] records and merge [ ] ledger and diff [ ] backup merge [ ] uid [ ] persist + iPhone line + size warning [ ] tests
**Tests.**
- Round trip: `applyRecords(blank, toRecords(s))` equals `normalize(s)` for a seeded big state.
- Two-device property test (fast-check style, hand-rolled if no dependency is wanted): random edits on two copies, exchange records both ways in random order, both end equal, and no ticked block or attempt is lost.
- Clock skew: a device whose clock is a day ahead edits a row; the other device pulls it, edits later with a normal clock, and its edit wins (hybrid clock `hi` in the ledger).
- A deleted row becomes one tombstone; restoring an old backup through `mergeBackup` deletes nothing.
- `uid()` 100k calls, no repeats; old 6-character-random ids still load.
**Done when** the tests pass, Settings shows the iPhone line only in iOS Safari (Playwright with an iPhone user agent), and `npm run size` is within budget.

### B1. Server foundation and deploy
**Re-planned 21 Oct 2026 (owner): local first.** Development runs on the Mac: Postgres 17 in Docker (same major version as Supabase) on port **5433** (5432 belongs to the local-llm-gateway project), the Go server with `go run`. Supabase and the server host (Render, see below) are for the live site and come at the end of B1, once the accounts exist (D10, D11); nothing in the code depends on them. Versions checked that day: Go 1.27, `pgx` v5.11.0, `goose` v3.29.0, `postgres:17-alpine`, `gcr.io/distroless/static-debian12:nonroot`. `sqlc` waits for B2, the first branch with queries. The skeleton (`GET /healthz`) is the first commit on this branch.
**Local part built 21 Oct 2026** on `feat/server-foundation`: `internal/config` (every problem reported at once; prod needs an https origin), `internal/httpx` (error shape, router with JSON 404/405, request id, access log without query strings, recover, 64 KB body limit, same-origin check), `internal/store` (pgx pool of 5, retry at start, goose with a Postgres lock), `migrations/00001_baseline.sql`, `GET /readyz`, `-migrate` flag, `docker-compose.yml` (Postgres 17, port 5433, `cat` and `cat_test`), `Makefile`, `Dockerfile` (distroless, 21 MB, no shell, non-root), CI job `server` (vet, race tests, integration on Postgres 17, image build). Tests: 21 Go tests incl. 3 integration; checked by hand: every route, readyz 503 while Postgres is stopped and 200 when back, the image against the local database. **Changed 21 Oct 2026 (owner's review):** the API no longer migrates at start. `cmd/migrate` applies migrations with the owner's connection (`MIGRATE_DATABASE_URL`) as a separate step; the API runs as `cat_app` (`DATABASE_URL`) and `/readyz` answers 503 when the schema is behind. Migration `00002_roles_and_schema.sql` (roles without passwords, schema `app`, default privileges, `touch_updated_at`) moved from B2 into B1. The timestamp rule is written down in `docs/database.md` §1.1. **Supabase set up 21 Oct 2026:** project `99ile` in Singapore (`ap-southeast-1`, next to the server on Render, which has no India region), Postgres 17, Data API off; migrations 00001–00003 applied as `postgres` through the session pooler; `cat_app` and `cat_readonly` passwords set by hand; security advisor clean after `00003_pin_function_search_path.sql`. **Render live 21 Oct 2026:** `https://nine9ile-api.onrender.com` (Singapore, Docker, free, auto-deploy off); `/healthz` and `/readyz` answer 200. **Keep-awake (decided 21 Oct 2026):** Render spins a free service down after 15 minutes without inbound requests and bills hours while it runs, not per request, so the ping count costs nothing; one service awake all month is about 744 of the 750 free hours. cron-job.org (free, any interval, 30 s timeout, start times can drift by seconds, a job is switched off after more than 25 failures in a row): job 1 `GET /healthz` every 5 minutes, which never touches the database, so a database outage cannot switch the keep-awake off, and it still holds if two pings in a row are lost; job 2 `GET /readyz` every hour, which keeps Supabase from its 7-day idle pause and emails on failure. Not chosen: 14-minute pings (one late or lost ping and it sleeps), UptimeRobot (free plan personal and non-commercial only since Oct 2024, 5-minute minimum), GitHub Actions cron (runs late or is skipped under load), self-ping from the server (cannot wake itself once asleep). **Deploy workflow built 21 Oct 2026:** `.github/workflows/deploy-api.yml` (see `docs/database.md` §2); `/healthz` now also reports `commit`. Needs repository secrets `MIGRATE_DATABASE_URL` and `RENDER_DEPLOY_HOOK`. **First automatic deploy 22 Oct 2026:** commit `79d4fce` live, `/readyz` ready. Docs moved from Cloud Run and Mumbai to Render and Singapore. **B1 done.**
`feat/server-foundation` · `feat: server config, database, migrations and deploy`
**Why.** Everything after needs config, errors, a database and a deploy that runs on every merge.
**Files.**
- `server/go.mod`: `go 1.27`. Dependencies: `github.com/jackc/pgx/v5`, `github.com/pressly/goose/v3`, `golang.org/x/time/rate`. `sqlc` as a dev tool (`sqlc.yaml`, generated code committed).
- `internal/config`: `PORT`, `DATABASE_URL`, `ALLOWED_ORIGIN`, `LOG_LEVEL`, `ENV`; fail at start with a clear message when one is missing.
- `internal/httpx`: router on `http.ServeMux`, middleware (request id, recover, access log without bodies or cookies, body limit 64 KB, origin check on unsafe methods), `writeJSON`, `writeError(code, message)` with the `{ error: { code, message } }` shape.
- `internal/store`: pgx pool (session pooler URL in production), `Tx` helper; `migrations/` embedded with `//go:embed`, run by goose at start behind a Postgres advisory lock (two instances starting together).
- `cmd/api/main.go`: keep the existing graceful shutdown; add `GET /readyz` (pings the database with a 2 s timeout).
- `docker-compose.yml` (Postgres 16 on 5432, a `cat_test` database), `Makefile` (`run`, `test`, `test-int`, `migrate`, `sqlc`), `Dockerfile` (multi-stage, `golang:1.27` builder, distroless static, non-root).
- `.github/workflows/ci.yml`: a `server` job (setup-go from `go.mod`, `go vet`, `go test`, integration with a `postgres:16` service).
- Deploy (as built): `.github/workflows/deploy-api.yml` after CI passes on `main` and only when `server/` changed since the live commit; migrate with the owner's link, then Render's deploy hook for that commit, then wait for `/healthz` to report it. Secrets: GitHub repository secrets and Render environment variables. Database: Supabase in Singapore (D10).
- `server/README.md`: run, test, migrate, deploy.
**Tests.** Config errors; error shape; request id echoed and logged; body over the cap → 413 with the JSON error; unsafe method from another origin → 403; `readyz` 200 with the database and 503 without.
**Done when** the deployed `/readyz` answers from the production database, and a pull request touching `server/` runs the Go checks.

### B2. One vertical slice: RC attempts synced end to end
`feat/sync-rc-slice` · `feat: sync RC attempts between devices`
**Why.** Prove the whole path (browser → proxy → Go → Postgres → other browser) on one kind before doing all of them.
**Server.**
- Migrations `00004_account`, `00005_sync`, `00006_audit` (`docs/database.md` §5, §9): `account.identities`, `account.devices`, `sync.heads`, sequence `sync.rev`, `sync.records` with the pull index, `audit.events`. Every push locks the identity's `sync.heads` row first (§5.3).
- `internal/identity`: `POST /v1/identity` (Turnstile check, rate limit 5 an hour per IP) creates identity + device, sets the `__Host-dev` cookie (`httpOnly; Secure; SameSite=Lax; Path=/`, 1 year, renewed on use). Middleware resolves the cookie to `(identity, device)`; a revoked or unknown cookie → 401.
- `internal/sync`: `POST /v1/sync/pull`, `POST /v1/sync/push` as in `docs/architecture.md` §6.2, accepting only kind `rc` for now (others → 400 `unknown_kind`). Compare-and-set in one statement; identical data gets no new `rev`.
- Dev-only `POST /v1/dev/join {identityId}` (only when `ENV=dev`) so a second browser can join by hand; removed in B4.
**Proxy.** `functions/api/[[path]].ts`: forwards `/api/*` to `API_ORIGIN` (Pages env var), passes cookies and `X-Request-Id`, strips hop-by-hop headers, 10 s timeout → 503 JSON.
**Browser.**
- `src/lib/api.ts`: `fetch` wrapper for `/api/v1`, JSON errors to typed results, never throws into React.
- `src/lib/sync/client.ts`: the round from §6.2 (pull → merge → push → stale), triggers (load, 30 s after a change, online, hidden with `keepalive`, focus after 5 min), backoff; state in the ledger.
- `src/pages/settings/Sync.tsx` (lazy): turn on (dev), "Synced just now"; only when `VITE_API_ENABLED` is set.
**Tests.** Go integration: push twice → one row and one `rev`; stale `baseRev` → row in `stale`; pull after a cursor returns only newer rows; another identity sees nothing; a revoked device gets 401. Browser: client against a fake server (offline, 401, 503, stale) with Vitest.
**Done when** an RC set done offline in one browser appears in a second browser joined by hand, and the server down leaves every page working.

**Built 22 Oct 2026** on `feat/sync-rc-slice`. Server: migrations `00004_account`, `00005_sync`, `00006_audit` (plus `app.lock_out_api_roles()`); `internal/account` (turn on, `__Host-dev` cookie, `Require`, dev join), `internal/syncapi` (pull, push, head lock, limits 20,000 rows and 8 MB per identity, 120 calls a minute per device), `internal/audit`, `internal/reqinfo` (`/v1` gate: `PROXY_SECRET`, `X-Client-Ip`, HMAC of the address with `IP_HASH_KEY`), `internal/ids` (uuid v7), `internal/limit`. In prod `/v1` answers 503 until `PROXY_SECRET` and `IP_HASH_KEY` are set on Render, so merging changes nothing for students. Proxy: `functions/api/[[path]].ts` forwards only `/api/v1/*`, drops any client-sent `X-Proxy-Secret`/`X-Client-Ip`, adds the secret and `CF-Connecting-IP`, 10 s timeout → 503 JSON (Pages variables `API_ORIGIN`, `PROXY_SECRET`). Browser: `lib/api.ts`, `lib/sync/client.ts` (round, turn on, dev join, `canon` so Postgres's key order never looks like a change), `lib/sync/runner.ts` (triggers, backoff 1/5/15/60 min, status), `components/SyncRunner.tsx` (merges through the store's new `transform`, reads state only once committed), `components/SyncCard.tsx` in Settings; `.env.development` sets `VITE_API_ENABLED=1`, production builds contain no sync code. **Moved to B5:** the Turnstile check (it needs the widget on the page, which ships when sync opens to students) and the Settings header line "Nothing is sent to a server", which must change then. **Tests:** Go end to end as `cat_app` (turn on twice, push twice = one rev, stale base, pull after cursor, other identity, revoked → 401, bad pushes audited, per-identity limit, concurrent pushes never hide a row: fails 4 of 8 runs without the head lock); Vitest client against a fake server that reorders JSON keys (10, two caught by deliberate mutations) and the proxy (3); by hand with two Chrome profiles: attempts travel both ways, server down leaves every page working.

### B3. All records
`feat/sync-all-records` · `feat: sync all progress`
- Server accepts every kind in `docs/architecture.md` §6.1 (an allow-list; `data` capped at 16 KB a row).
- Browser: first sync (pull all, merge, push all in batches of 200), paging with `more`, progress text "Copying your progress… 340 of 1,200".
- Settings, sync on: restoring a backup merges (`mergeBackup` from S5) and says so; "Delete all my data" asks this device only or everywhere (everywhere needs B5's endpoint; until then only "this device").
- Settings header copy changes only when sync is on: "Saved in this browser and synced to your other devices." (A10).
**Tests.** End to end with two browser contexts in Playwright against the local server: each kind created on one appears on the other; two offline devices tick blocks on the same day and both ticks survive; a redo item practised on both keeps the higher tries.
**Done when** the checks in `docs/plan.md` Verification pass for every kind.

**Built 22 Oct 2026** on `feat/sync-all-records`. Every kind syncs: `SyncKinds` in `server/cmd/api/main.go` and `SYNC_KINDS` (= `KINDS`) in `lib/sync/client.ts`, kept equal by a Go test that reads `records.ts`. The push loop sends batches of 200 until nothing is dirty (stops if the server takes nothing from a batch) and reports "Copying your progress… 340 of 1,200" when there are more than 200 rows. Settings with sync on: the header says "Saved in this browser and synced to your other devices."; restore asks "Add this backup to your progress?" and merges with `mergeBackup` through the store's `transform`; "Delete all my data" becomes "Delete from this device", which turns sync off first so the wipe never travels (everywhere waits for B5). Settings imports the ledger and runner only behind `API_ENABLED`, so production builds still contain no sync code. **Tests:** Vitest with the fake server: errors, words, ticks and profile travel; two offline devices ticking the same day keep both blocks; redo keeps the higher tries; unticking travels; a 450-row first sync goes in batches with progress; a wipe with sync off sends no deletions (fails if sync is not turned off first). By hand with two Chrome profiles: RC, error, word, tick and a shared day all reach both sides; a restored backup adds an attempt and removes nothing; wiping one device leaves the other and the server untouched.

**Negative and ACID tests, 22 Oct 2026.** Server (`cmd/api/v1_negative_int_test.go`, real Postgres as `cat_app`): one student's head lock never delays another; an abandoned push leaves no rows, no open transaction and no lock; two writers on one record from one base: exactly one wins, 20 rounds; heads equal the sums of their rows after 180 random concurrent writes from three devices; a pull never sees half a push; malformed, oversized, cross-site and forged-cookie requests refused with the error shape; suspended → 403, deleted identity → 401 with nothing left. They found three ways to get stuck, now fixed: a record just under 16 KB failed the jsonb size check with 500 (migration `00007`); one bad record failed the whole push forever; a full identity refused even deletions (both now refused per row). Browser (`client.test.ts`, `runner.test.ts`): a round that throws left the runner "syncing" forever (now caught, the next round runs); a refused row was resent every round (now skipped until changed); another device writing the same record during every push made 1,001 calls in one round (now stops after three stale-only pushes); malformed answers crashed (now validated); two tabs could run rounds at once (now one at a time with the Web Locks API). Each fix was checked by undoing it and watching its test fail.

### B4. Recovery code and linking devices (F47)
`feat/device-link` · `feat: link devices with a code and get progress back with a recovery code`
- Migration: `recovery_codes`, `link_codes`. Codes: Crockford base32 from `crypto/rand` (recovery 16 characters = 80 bits; link 8 characters, 10 minutes, once); SHA-256 stored, compared in constant time.
- Endpoints: `POST /v1/identity/recovery-code`, `POST /v1/identity/link-codes`, `POST /v1/identity/link`, `POST /v1/identity/recover`, `GET /v1/devices`, `DELETE /v1/devices/{id}`, `DELETE /v1/devices/me`. Rate limits: 10 link or recover tries an hour per IP, 5 failures in a row lock that IP for an hour. Audit events for each.
- Browser: the turn-on flow with the recovery code screen (copy, download, "I've saved it"); "Link a device" with the QR (SVG from `uqr`, lazy) and the 8-character code under it at every width, "New code" when it expires; "Scan the code" (`src/pages/settings/LinkScan.tsx`, lazy: rear camera through `getUserMedia`, `BarcodeDetector` when present, else `jsqr` loaded on open; accepts only `https://<site>/link#<CODE>`; camera refused → type the code); a `/link` route that reads the code from the fragment and warns iPhone Safari users who study from the Home Screen app; `public/_headers` `camera=(self)`; "I use 99ile on another device" with code entry, "Use a recovery code instead", and "Add this device's progress?"; device list with remove; "Turn off sync on this device" with keep or clear. Remove the dev join endpoint.
**Tests.** Codes are single use and expire; an old recovery code fails after a new one is made; brute force hits the limit; a removed device gets 401 and keeps its copy; the scanner's parser accepts only our link format; Playwright: link phone and laptop contexts by typed code and by a fake camera stream showing the QR (`--use-file-for-fake-video-capture`), both see each other's sets; neither QR library appears in the main script (`npm run size`).
**Done when** a fresh browser gets everything back from the recovery code, and the flows read well at 390 and 1440 wide in both themes.

**Built 22 Oct 2026** on `feat/sync-all-records` (with B3). Server: migration `00008_link_and_recovery` (`account.recovery_codes`, `account.link_codes`, hashes hidden from `cat_readonly`); `internal/codes` (Crockford base32, forgiving input, SHA-256); turning on returns the recovery code once; `POST /v1/identity/recovery-code`, `/link-codes` (10 minutes, at most 5 open), `/link` (single use in one `UPDATE … RETURNING`, so two browsers racing for one code cannot both get in), `/recover`, `GET /v1/devices`, `DELETE /v1/devices/{id}` and `/me`; 10 tries an hour per address and 5 wrong codes in a row lock it for an hour; linking a browser that synced as another identity revokes its old device; the dev join is gone. Found on the way: `httpx.Router` called handlers directly, so `r.PathValue` was always empty (now served through the mux, with a test). Browser: `lib/sync/codes.ts` (same rules, `parseLink` accepts only `https://<site>/link#CODE`), `link()`/`leave()` in the client (a wrong code changes nothing; "start fresh" clears this device only after the code worked and sends no deletions), `components/sync/` (JoinForm with add-or-start-fresh and a backup offer, LinkPanel with the QR from `uqr`, LinkScan with `BarcodeDetector` or `jsqr`, RecoveryPanel with copy and download, DeviceList), `pages/Link.tsx` at `/link` (API builds only), `camera=(self)`. Neither QR library nor any sync code is in the production build. **Tests:** Go: single use, expiry, the race for one code, recovery and replacement, brute force cut-off, removal, switching identity, open-code cap; Vitest: recovery code returned and never stored, start fresh deletes nothing, a wrong code changes nothing, recovery to a fresh browser, the scan parser. By hand in Chrome: turn on → recovery code → link a phone by typed code, by `/link#CODE`, and by a fake camera showing the QR (both `BarcodeDetector` and `jsqr`); remove a device (it turns sync off and keeps its copy); a wrong then right recovery code on a fresh browser.

**Two tabs (22 Oct 2026, `lib/tabs.ts`).** Saving works like booking a seat: each save writes a version next to the state and checks, in the same synchronous step, that the stored version is still the one this tab last saw (compare-and-set). If another tab saved in between, the two copies are merged record by record against that base (a three-way merge with the sync merge rules), so both tabs' edits are kept; the same merge runs when the other tab's save arrives while this tab has an unsaved edit. Web Locks were left out: localStorage may be cached per process, so a lock would not make the check stronger. Tests: six two-tab cases including 40 interleaved saves; four fail when the version check is removed.

### B5. Export, delete and the privacy page
`feat/data-export-delete` · `feat: export or delete synced data and a privacy page`
- `GET /v1/me/export`: every record as JSON in the same shape as the local backup (so it restores with the existing import). `DELETE /v1/me`: deletes the identity (cascade), logs an audit event without the id's records, clears the cookie.
- `/privacy` page (lazy) and a footer link; Settings "Delete everywhere" wired; the recovery screen links the privacy page.
- Request logs (IPs) kept 7 days: Render's Hobby plan keeps logs 7 days.
- **Switch sync on for students:** `VITE_API_ENABLED=true` in the Pages build; Roadmap entry moves to shipped.
**Tests.** Export restores into a blank browser and equals the synced state; after delete, no rows remain for the identity and its devices get 401.
**Done when** export and delete work for a linked pair and the privacy page says what the code does.

**Built 22 Oct 2026** on `feat/data-export-delete`. Server: `GET /v1/me/export` (identity, devices, live records; audit `data.exported`), `DELETE /v1/me` (audit `identity.deleted` written first with the id as `target_id`, then one cascading delete; cookie cleared); Turnstile on `POST /v1/identity` (`internal/turnstile`, fails closed, `TURNSTILE_SECRET` now a third prod requirement for `/v1`); `cmd/cleanup` and `.github/workflows/cleanup.yml` (daily: link codes a day after expiry, devices 90 days after removal, audit events after 400 days), so the privacy page's retention is what the code does. Browser: `lib/turnstile.ts` (script loads on the tap, `interaction-only`, test keys in dev), "Download what the server has" (a backup file that Restore reads, plus a `server` part), "Delete all my data" offers Only this device / Everywhere (the device clears only after the server confirmed), `/privacy` (DPDP notice: data and purposes, where, how long, rights, grievance contact 99ile.team@gmail.com, the Data Protection Board; sync for 18 and over, stated next to "Turn on sync"), footer and search links, CSP allows `challenges.cloudflare.com`, Roadmap moves sync to shipped only in builds with `VITE_API_ENABLED`. **Open legal point:** DPDP Rules 2025, Rule 8(3), from 13 May 2027, may require keeping processing logs for a year; the audit log keeps 400 days, request logs 7 days (Render). Check before May 2027. **Tests:** Go: export contents, delete everywhere leaves no rows and logs the event, both devices get 401, the recovery code dies, Turnstile pass/fail/unreachable against a stand-in, clean-up keeps recent rows; Vitest: export restores to the same progress, delete clears only after the server confirmed. By hand: Turnstile through Cloudflare with its always-pass test keys, export download, delete everywhere with a linked device (it stops syncing and keeps its copy), the privacy page.

**To switch sync on for students** (owner):
1. Cloudflare dashboard → Turnstile → add a widget for `99ile.pages.dev` (managed) → copy the site key and the secret key.
2. Render → environment: `PROXY_SECRET` and `IP_HASH_KEY` (`openssl rand -hex 32` each), `TURNSTILE_SECRET`.
3. Cloudflare Pages → Settings → Variables (production): `API_ORIGIN=https://nine9ile-api.onrender.com`, `PROXY_SECRET` (same value), `VITE_API_ENABLED=1`, `VITE_TURNSTILE_SITE_KEY`.
4. Redeploy Pages; check `/settings#sync` on a phone and a laptop.

**Sync UX polish, 22 Oct 2026** (`feat/sync-ux`). Sync comes up where students look and when it helps, never as a popup: a "Sync devices" row with its status ("Not set up", "Synced 2 minutes ago", a green or amber dot) under Search in the sidebar and at the top of the phone menu (`components/SyncNav.tsx`, reading `lib/sync/status.ts`, a tiny store in the main script that reads the ledger at start, so the row is right before the sync code loads); on Today and Home, an empty device is asked once "Already studying on another device?" (→ `/link`), and a device with 5 or more attempts that does not sync is asked once "Study on a phone and a laptop?" (→ `/settings#sync`), each with "Not now" remembered (`components/SyncPrompt.tsx`, `promptKind` tested); the iPhone install guide and Settings' iOS steps point to linking instead of a backup when sync is on; the sidebar's last line says progress syncs when it does. No permanent header icon: the phone header is full at 390 px, a chain icon reads as "copy link", and most students use one device. Main script with sync on: 135.9 KB.

### Next, after sync (planned 22 Oct 2026): F52, then F51
| Branch | Builds | Notes |
|---|---|---|
| `feat/error-links` (**core built 22 Oct 2026**: `q`/`att` on new entries, old entries matched from their text, "See the question" opening the RC/VA/CR review at that question (`?q=`, `useStartQuestion`, scrolled into view after the layout's own scroll), "Try it again" (`/practice/redo?k=`, `redoNow` puts it back in the queue due today), "Last time, <date>, you noted: <cause>" plus what was chosen after every redo answer; tests on real content; checked on a phone. **Still to do:** Error log filters and the Progress cross-links) | F52: `q`/`att` on new entries; match old RC/VA/CR entries by title and date (at display time, nothing rewritten); "See the question" (review opened at that question: `#q<n>` anchors in RC, VA, CR and sectional reviews); "Try it again" (`/practice/redo?k=<key>`, one question, answer hidden); Error log filters; Report card rows link to filtered entries | Tests: each builder writes `q`/`att`; old entries match; links resolve for every kind; a deleted attempt falls back to the set without review |
| `feat/history` | F51: `practice/history.ts` (pure: days from state, newest first, per month), `pages/History.tsx` (lazy), the 12-week strip, filters, "Done today" on Today, search entries for passage titles | Tests: every kind of item appears on its day with its link; minutes match Today; a year of data builds in under 50 ms |

### B6. Feedback inbox (F39)
`feat/feedback-inbox` · `feat: send problem reports to the server`
- Migration: `feedback(id, at, page, item_id, kind, note, identity_id null)`. `POST /v1/feedback` (rate limit 10 an hour per IP, note ≤ 1,000 characters). No admin page: a saved SQL query in `server/README.md`.
- "Report a problem" in `pages/practice/common.tsx` posts when the API is on, else opens the GitHub issue as today.
**Tests.** Rate limit; long note refused; works without sync turned on.

### B7. Google sign-in, with "save this device's progress" (F47, level 3)
`feat/google-sign-in` · `feat: sign in with Google and save your progress to your account`
- Migration: `users(id, identity_id unique, email, name, created_at)`, `oauth_identities(provider, subject, user_id)`.
- `GET /v1/auth/google/start` and `/callback` (code flow with PKCE and `state`, ID token verified with `go-oidc`), `POST /v1/auth/adopt` (the account takes this device's anonymous identity), `POST /v1/auth/switch` (this device moves to the account's identity; the old anonymous identity is deleted after its push completes), `POST /v1/auth/logout`.
- Browser: "Sign in with Google" in the Sync section; the three cases of `docs/architecture.md` §5.2; "Save this device's progress?" reuses the first sync from B3 and the merge from S5, so no new merge code. Sign-out asks keep or clear.
- Privacy page gains the account section (email stored, why, how to delete).
**Tests.** Each row of the §5.2 table end to end with a fake OIDC provider; a merge where both devices edited the same day keeps both blocks; "No" offers the backup file before switching.
**Email sign-in** (password with argon2id, verify and reset through Resend) is a later branch, `feat/email-sign-in`, when students ask (D9).

---

## Later steps
Full entries are written here when a step comes within two steps of being built: AI v1 (3b: F35, F36), DILR with the one daily budget (4: F21–F23, F27), Quant (5: F24–F26), step 6 items, AI v2 and the coach (7: F34, F48).
