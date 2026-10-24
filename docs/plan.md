# 99ile: full plan after Phase A (features + Go backend)

The site was called CAT Prep Hub until 18 Oct 2026. Storage keys keep the old `cat-prep-` names on purpose, so students keep their data.

## How we work (from 21 Oct 2026)
Every step goes specify → plan → analyze → implement:

| Step | Document | What it holds |
|---|---|---|
| Specify | `docs/feature.md` | Each feature: the problem, the story, scope and acceptance checks. Numbers match Part 1 below |
| Plan | this file (order and dates), `docs/architecture.md` (how it is built, decisions) | When and on what |
| Analyze | `docs/analyze.md` | Spec vs plan vs code, the research review, risks, open decisions. Redone at the start of each step |
| Implement | `docs/implement.md` | Branch by branch: data, files, tasks, tests, commit message |

Research notes live in `docs/research/`; what is adopted from them is recorded in `docs/analyze.md`.

## Context
Phase A is built on `feat/rc-practice`: an RC player, 20 RC sets, a daily VA drill, a speed test, streaks and the VA-mix fix.
Asked for:
- Everything still pending, plus more student features that make us different.
- Free AI generation (Groq, Ollama).
- A backend with optional sign-in: email/password and Google. Guests keep working without an account.
- The backend in Go and Postgres, hosted for free.

Target exam: CAT 2027 (late Nov 2027). Today is 17 Oct 2026. Students start serious prep from Jan to Mar 2027, so DILR, Quant and sign-in should be live by then.

Ground rule kept: **local-first.** The site works fully with no account and no internet, from localStorage as today. Sign-in only adds sync, the leaderboard and AI quotas.

---

## Part 1: Student features

### 1A. Gaps left by Phase A
1. **Para summary drills.** CAT asks 2–3 per slot and we have none. Add a `ps` kind in `src/practice/va/build.ts`, with hand-written options.
2. **More content.** Grow to 60 RC sets and 60 VA paragraphs. Drafts are made free with Ollama on the owner's Mac (see 3E), and a person checks every one.
3. **Answer-key check.** A second reader checks every set. Add a "Report a problem" link per question, which posts to `/v1/feedback`, or a mailto before the backend exists.
4. **Roadmap page refresh** in `src/data/roadmap.ts`, to match this plan.

### 1B. VARC tools (no backend)
5. **Timed VARC sectional.** 40 minutes, 4 RCs + 8 VA, on a CAT-style screen with a question palette, mark for review and a timer.
6. **Report card in Progress.** Accuracy by question type, genre and difficulty, wpm trend, and the traps that cost you most.
7. **Percentile estimator.** Turns a score into a percentile using past tables, plus an attempts × accuracy grid. It feeds the target in Plan.
8. **Past-paper catalogue (2021–25).** Year, slot, topic and question types, with links to free, legitimate solutions and no copied text. Ticking one marks it done in the plan.
9. **Library filters** by question type (inference, tone, main idea), on top of genre.
10. **SEO:** pre-rendered routes, a sitemap and structured data.

### 1C. What makes us different (NEW)
11. **Redo queue.** Wrong questions return after 1, 3 and 7 days until you get them right. Built from the Error log.
12. **Mock analysis wizard.** After any coaching mock, a 20-minute guided review: time per question, skipped vs wrong, and traps. The result adjusts next week's plan.
13. **Sunday review.** A weekly report (what improved, weakest area, next focus), after which the plan updates itself.
14. **Reason before reveal.** Optionally type why you chose an option, then compare it with the explanation. This trains the thinking, not only the answer.
15. **Focus timer.** A Pomodoro tied to Today's blocks that logs real minutes against planned minutes.
16. **Working-professional mode.** A 30-minute weekday plan and a "commute set" (one RC on the phone). **Now part of 82.**
17. **Flashcards from mistakes.** Every error-log entry and saved word becomes a card. Cards are shown again on a schedule: the more often you get one right, the longer the gap before it comes back.
18. **Share card.** A streak or score image for WhatsApp and Instagram. Free growth.
19. **Rest-day and burnout check.** If streaks drop or accuracy falls for three days, suggest a light day instead of guilt.
20. **Hindi explanations** (later). Big content cost, but rare in this market.

### 1D. DILR section
21. Learn tab: set types (arrangement, games and tournaments, DI charts, Venn, networks, scheduling) and how to pick sets.
22. Plan blocks, resources and videos, using `src/sections/varc/` as the template. Defaults are already set to weekdays 45 min, weekends 90 min.
23. **DILR set player:** one data set with 4–6 questions, MCQ and TITA. Reuses the RC player shell, scoring, review and error log. Start with 20 sets. **LR first (D37):** research `docs/research/lr.md`, format `docs/content/lr-format.md`.
83 to 88. **LR skills beyond sets** (not games): clue translator (83), must/could/cannot (84), first move (85), set post-mortem (86), what if one clue changes (87), draw it first (88).

### 1E. Quant section
24. Learn tab with topic weightage by year, plus a printable formula sheet for each topic.
25. Plan blocks and resources.
26. Topic drills and timed 10-question sets, with TITA input. Maths is shown with KaTeX, loaded only when needed.

### 1F. Across all sections
27. **One daily budget.** "I have 2 h today" splits time across sections, with more for the weakest. This extends `buildDay` in `src/planner/engine.ts`.
28. **Mock tracker upgrade** with section-wise analysis.
29. **Install as an app and work offline (PWA)** with vite-plugin-pwa, plus a daily reminder.
30. **Calendar export** as an `.ics` file.
31. **B-school shortlist calculator** using the IIM composite formulas.
32. **Exam calendar** (CAT, XAT, SNAP, NMAT, IIFT) with deadlines.

### 1G. Needs the backend (Part 2)
33. Accounts and sync, phone ↔ laptop.
34. **AI: article → RC set.**
35. **AI: "Explain my mistake"**, which says why your chosen option is wrong. Uses a small model and few tokens.
36. **AI: para summary feedback.** You write a one-line summary and the AI grades it against the key idea.
37. Shared daily leaderboard for the RC of the day.
38. Accountability partner: a read-only progress link for a friend or mentor.
39. Feedback inbox. Later, a story submission form.
40. A "Practice this article" bookmarklet, after item 34.

### 1H. The learning loop (from the research review, 21 Oct 2026)
Product line: **a free CAT coach that learns from every mistake and tells you what to do next.** Keep the structure in the system and show the student one action. Code computes; AI only explains. Full specs in `docs/feature.md`.
41. **Next step.** One "Start here" on Today and Home with its time and reason, from ranked rules over local data.
42. **Error causes and patterns.** What happened to the student (misread, missed a qualifier, ran out of time, guessed…) kept apart from the option's trap; entries can be corrected; patterns like "7 of 12 inference misses were extreme wording" with a one-tap drill.
43. **Recommendations with outcomes.** Every suggestion is saved with its evidence and the accuracy before and after, so "fixed" is measured, not assumed.
44. **Progress around three questions:** am I improving, are my weak spots getting fixed, am I exam ready. The current tabs stay one tap away.
45. **Not sure.** An optional flag on any answer; a right guess still comes back in the redo queue.
46. **Content versions on attempts.** A hash per set stored with each attempt, so a rewritten set does not change the meaning of old attempts.
47. **Sync without sign-up, then accounts** (decided 21 Oct 2026). Three levels: the backup file (live), anonymous sync with a recovery code and device linking, then Google or email sign-in, where the student can save all of the device's progress into Postgres (merged with any progress already in the account). See `docs/architecture.md` §5.
48. **AI coach and weekly narrator** on top of 41–44 (step 7).
49. **Usage counts** without per-student data, to learn which features are used (open decision D5).
50. **Keep my progress safe on this device** (from the step 3 research): ask the browser to keep the data, tell iPhone Safari students to add 99ile to the Home Screen (Safari clears a site's data after a week without a visit), warn before storage fills.

### 1I. Later
- WAT and PI prep: now F72 and F73 in 1J (after the exam).
- Community: now F67 to F71 in 1J.
- A no-code updates editor (Decap CMS on git, no server).

### 1J. Beyond practice (owner's proposals, 23 Oct 2026)
Review in `docs/research/beyond-cat.md`; specs in `docs/feature.md`. CAT Coach stays the product: nothing here moves DILR or Quant.
56. **Set Selection Arena** (DILR): rank four sets before solving, compare with what happened; selection accuracy on Progress.
57. **DILR Replay**: an interactive board for scheduling, grouping and tournaments; a tested solver replays the deductions.
58. **Quant Debugger**: find the first wrong step; Quant error causes join the patterns (42).
59. **Estimate first**: a range or eliminated options before working; a 3-minute warm-up.
60. **Why this method?**: method, the faster way and when it fails; "same maths, different world".
61. **Thinking Arcade**: one daily puzzle in four DILR-like kinds, generated and proved unique by the 57 solver.
62. **Data Detective**: what a chart does and does not support.
63. **Reality to DILR**: tables on a web page become caselets in the extension (53); answers computed by code.
64. **Inbox**; 65. **study reminders and streak protection** (web push, one a day at most); 66. **restart plan** after missed days.
67. **Discuss this question** (opens after an attempt); 68. **doubt forum** with "ask from a mistake"; 69. **study groups** (absorb 37 and 38); 70. **safety and moderation**; 71. public communities, later.
81. **"You", a profile page**: account, your CAT basics (exam year, target, attempt, student or working), your study so far, devices and data in one place (with B8); a public side, off by default, with community (6b).
80. **Personal home** for a returning student: greeting, next step, what is due, yesterday, streak; the pitch below (step 4b).
82. **A plan that fits you**: a one-minute setup (exam year, studying or working, time, target per section, attempt, level) that sets daily time, the section split and the pace; part 1 in step 4b, part 2 (exam year, commute set, reality check after mocks) in step 6. Absorbs 16.
72 to 78. **The manager track**, after CAT 2027. Season 1, getting in (Dec 2027 to Mar 2028): the 60-second brief (72), PI prep from your own story (76), GD practice (77), mini case interview (74). Season 2, ready for the MBA (Apr to Jun 2028): MBA-ready basics (78), manager's daily dilemma (73), founder simulator (75). Each is researched when it comes up.

---

## Part 2: Backend plan (Go + Postgres, free hosting)

**Since 21 Oct 2026, `docs/architecture.md` is the detailed design** for where logic runs, identity, sync, history and the server layout. Decided that day: anonymous sync before email and Google (changes the order of 2B and 2C; sign-in can then save all of a device's progress into the account), domain logic stays in TypeScript, content hashes on attempts, and merge rules per record kind (2D). Hosting (2I), AI budgets (2E) and the security checklist (2J) stay here.

### 2A. Shape
```
Browser (React, Cloudflare Pages)
   │  same-origin /api/*  (Pages Function proxy → httpOnly cookie works, no 3rd-party cookie issues)
   ▼
Go API (Render free, Singapore)
   ├── Postgres (Supabase free, Singapore; Neon fallback)
   ├── Groq API (prod AI)  /  Ollama (local dev AI)
   ├── Resend (verify + reset emails)
   └── Cloudflare Turnstile (bot check for guests + signup)
```
The proxy is why we need no custom domain: the cookie stays first-party on `*.pages.dev`. It is a Pages Function at `functions/api/[[path]].ts` that forwards to the Render URL (`https://nine9ile-api.onrender.com`).

### 2B. Two modes
| | Guest (default) | Signed in |
|---|---|---|
| Data | localStorage only, as today | localStorage + synced to Postgres |
| Works offline | Yes | Yes (syncs when back online) |
| AI | 1 RC generation/day per device (Turnstile) | 3/day + "Explain my mistake" 20/day |
| Leaderboard | View only | Appears on it (nickname) |

On first sign-in, ask: "Move this device's progress into your account?" If yes, the device pushes all its records.
On sign-out, ask: "Keep a copy on this device, or clear it?"

### 2C. Auth
**Re-planned 21 Oct 2026 (proposed D9):** Google sign-in first (B7), email and password later. The design below stays for when email comes.
- **Email + password:**
  - Passwords hashed with argon2id (`golang.org/x/crypto/argon2`), minimum 8 characters.
  - Email verification and password-reset links: 32-byte random tokens, stored hashed, expiring in 1 h. Sent with Resend.
  - Rate limits on login and signup, with Turnstile on signup.
- **Google:**
  - The server does the OAuth code flow with PKCE (`golang.org/x/oauth2`) and verifies the ID token (`github.com/coreos/go-oidc/v3`).
  - The account is linked by verified email, so one user can have both a password and Google.
- **Sessions:**
  - An opaque random token in an `httpOnly; Secure; SameSite=Lax` cookie. Only its SHA-256 is stored, the same pattern as hashed API keys.
  - 30 days, sliding. Logout deletes the row.
  - Unsafe methods require an `Origin` check (CSRF).
- **Account control:** export my data (JSON) and delete my account, as required by India's DPDP Act 2023. There will be a privacy page.

### 2D. Sync design (local-first)
**Superseded in part 21 Oct 2026:** the protocol is now pull → merge → push with compare-and-set on `baseRev` (proposed D8, `docs/architecture.md` §6.2). The points below that use device time for conflicts are replaced.
- Every record already has an id (`uid()`); days are keyed by date. Add `updatedAt` and `deleted` (a tombstone) to each record, with a state version bump and migration in `src/lib/state.ts`.
- Postgres keeps one generic `records` table, so a new feature needs no new migration.
- `POST /v1/sync { cursor, changes[] } → { cursor, changes[] }`:
  - The server gives each write a rising `rev` from a sequence, so clock skew does not matter.
  - The client pulls everything with `rev > cursor`.
- Conflicts: last write wins per record. Most records are append-only attempts, so real conflicts are rare. Settings are a single record.
- The client keeps a dirty set and syncs on load, on change (debounced 5 s), on regaining a connection and on tab close.

### 2E. AI design
- **One client for both providers.** Groq and Ollama both speak the OpenAI-compatible `/v1/chat/completions`. Config picks the base URL and model:
  - **Dev:** Ollama on the Mac (`http://localhost:11434/v1`). Free and private.
  - **Prod:** Groq free tier. Ollama cannot be hosted free (it needs a GPU or lots of RAM).
  - Fallback chain: Groq large model → Groq small model → "try later". A Gemini free key can be added later as a third option.
- **Budget reality** (Groq free limits are per organisation, so check Console → Limits):
  - The 70B-class model is about 1,000 requests and 100K tokens a day. One RC set is about 5K tokens, so **about 20 generations a day in total.**
  - The 8B model allows about 14,400 requests a day, which is plenty for "Explain my mistake" and summary grading.
  - So keep a global daily counter in Postgres and cap at about 80% of the limit. Return a friendly "AI is busy today, try a library set" message.
- **Quality gate.** The model must return JSON. Go checks it:
  - 4 or 5 questions, each with 4 options and exactly one answer (the sectional uses the first 4).
  - An explanation for every option.
  - The text must be 300–1,200 words.
  - On failure, retry once, then give up.
- **Cache** by SHA-256 of (text + settings), so the same article costs nothing twice.
- **Kill switch:** the env var `AI_ENABLED=false`.
- **Offline authoring (free, no server):** `server/cmd/author` runs on the owner's Mac against Ollama to draft library RC/VA/DILR sets as JSON. A person checks them and then commits them to `content/` as JSON. This is how content reaches 60+ sets for ₹0.

### 2F. Data model (Postgres)
- `users` (id, email, email_verified, name, nickname, created_at)
- `password_credentials` (user_id, hash)
- `oauth_identities` (provider, subject, user_id)
- `sessions` (token_hash, user_id, expires_at, user_agent)
- `email_tokens` (hash, user_id, kind: verify|reset, expires_at)
- `records` (user_id, kind, rec_id, data jsonb, rev bigint, updated_at, deleted). Primary key (user_id, kind, rec_id), index (user_id, rev).
- `ai_cache` (hash, kind, output jsonb, model, tokens, created_at)
- `ai_usage` (subject: user or device, day, kind, count) and `ai_budget` (day, model, tokens)
- `daily_scores` (date, user_id, marks, secs). Unique per date and user.
- `feedback` (id, user_id null, page, item_id, text, created_at)

### 2G. API (`/v1`, camelCase JSON, errors `{ error: { code, message } }`)
- Auth:
  - `POST /auth/signup | login | logout | verify | forgot | reset`
  - `GET /auth/google/start | callback`
- Account: `GET /me`, `PATCH /me`, `GET /me/export`, `DELETE /me`
- Sync: `POST /sync`
- AI: `POST /ai/rc`, `POST /ai/explain`, `POST /ai/summary`
- Leaderboard: `GET /leaderboard/:date`, `POST /leaderboard/:date`. The server re-scores answers from its own copy of the answer key, so nobody can fake a score.
- Feedback: `POST /feedback`
- Health: `GET /healthz`

### 2H. Go stack and layout
- Go 1.23+, stdlib `net/http` routing, `pgx/v5` + `sqlc` (typed SQL), `goose` migrations, `log/slog`, `golang.org/x/time/rate`.
- Layout:
  ```
  server/
    cmd/api/main.go        cmd/author/main.go
    internal/config  internal/httpapi (handlers, middleware)  internal/auth
    internal/sync    internal/ai (client.go, prompts, validate.go)
    internal/store (sqlc output)  migrations/  queries/
    Dockerfile (distroless, ~15 MB)  Makefile  docker-compose.yml (postgres + ollama for dev)
  ```
- It lives in the same repo under `server/`, and the frontend stays in `src/`.
- Frontend additions:
  - `src/lib/api.ts` and `src/lib/sync.ts`.
  - Sign-in page, an Account section in Settings, and `/practice/generate`.
  - Everything checks `VITE_API_ENABLED` so the static build still works with no backend.

### 2I. Free hosting
| Piece | Service | Free limit | Catch |
|---|---|---|---|
| Frontend + proxy | Cloudflare Pages + Pages Functions | Unlimited static traffic, 100K function requests a day | none |
| Go API | **Render free web service**, Singapore (D11, changed 21 Oct 2026) | 750 instance hours a month per workspace | Sleeps after 15 minutes without requests and takes about a minute to wake, so cron-job.org pings `/healthz` every 5 minutes; awake all month is about 744 hours, so only one free service. No card. Cloud Run is the fallback |
| Fallback API (no card) | Render free | 750 h a month | Sleeps after 15 min, 30–50 s to wake. OK, because sync runs in the background |
| Postgres | **Supabase free** (D10), used as plain Postgres | 500 MB, no compute-hour cap, Singapore region beside the server | Pauses after 7 days with no use (not an issue once live). About 5,000 students at 100 KB each |
| Postgres fallback | Neon free | 0.5–1 GB, 100 CU-hours a month (about 400 h), Singapore | Compute stops for the rest of the month when the hours run out |
| Email | Resend free | about 100 a day | Use for verify and reset only |
| Bot check | Cloudflare Turnstile | free | none |
| AI | Groq free tier; Ollama locally | see 2E | Daily caps |
| Backups | Weekly `pg_dump`, encrypted with `age`, to Cloudflare R2 | 10 GB free | Runs in GitHub Actions |
| CI/CD | GitHub Actions: CI, then `deploy-api.yml` migrates and calls Render's deploy hook for the exact commit | 2,000 minutes a month for a private repo | none |

Total running cost: ₹0 at launch. A custom domain (about ₹800 a year) is optional, and the proxy makes it unnecessary.

### 2J. Security checklist
- Turnstile on signup and guest AI.
- Rate limits per IP and per user.
- Request body cap (64 KB, or 20 KB of text for AI).
- Strict CORS: same origin only.
- CSP on the frontend.
- No secrets in the repo; Groq, Google and Resend keys live in Render's environment variables; the owner's database link only in GitHub secrets and `server/.env.prod`.
- Logs never contain passwords, tokens or pasted article text.

---

## Part 3: Order and timing

**Decided 18 Oct 2026:** step 2 first, then backend v1, then small AI right after it (3b). Article → RC set stays in April 2027.

| Step | When | Build |
|---|---|---|
| 1 | Oct–Nov 2026 | Gaps 1–4, PWA (29), redo queue (11), focus timer (15). **Built 17 Oct 2026:** para summary, report link, roadmap, PWA with calendar reminder, redo queue, focus timer. **Follow-up:** stable daily rotation (`since` dates), content loaded as a separate chunk via a generated catalog, 40 RC sets and 50 VA paragraphs (60 each still to come) |
| 2a | Oct 2026 | **Built 18 Oct 2026:** a Learn guide per VARC question type (method, traps, worked example, three links, "drill 6 here"), Practice banks grouped by type, home page redesign |
| 2 | late Oct–Nov 2026 | Small branches: **2b** sectional (5) plus 30 more VA paragraphs (80 total), **built 19 Oct 2026**, new paragraphs as JSON in `content/va/`, and the 40 RC sets moved to JSON in `content/rc/` on 18 Oct 2026; **2c** report card (6) and percentile (7), **built 18 Oct 2026**: Progress has Report card, Mocks and target and Log tabs; the percentile estimator reads `src/data/percentiles.ts`: for CAT 2023, 2024 and 2025 the average of the tables Cracku, IMS and iQuanta built from the results (no official table exists; pre-exam "expected" tables are left out, and a site that repeats another counts once), and it shows a range across the three years; the VARC target (90, 95, 97 or 99 percentile, default 99) lives in `state.targets` and is set in Plan or Progress; **2d** critical reasoning drill, 30 original items, **built 18 Oct 2026**: `content/cr/items.json`, a drill at `/practice/cr` (type and count picked in Practice or from the CR guide), with its own `crAttempts`, redo keys `cr:<id>`, Error log entries, a practice row and a "by kind" list in the report card; **2e** summary writing with a model summary and checklist, **built 20 Oct 2026, see "Step 2e" below**; **2f** mock wizard (12) and Sunday review (13), with the recommendation record (43): **2f-1 mock analysis built 21 Oct 2026** (`/progress/mock-review`: basics, question grid with causes, re-solve doable skips, where the marks went, up to three actions saved as recommendations; research in `docs/research/step-2f.md`); **2f-2 weekly review built 21 Oct 2026** (`/review`: the week in numbers, what moved, what cost you, last week's focus and note, and one focus for next week, saved as a recommendation and shown on Today until done three times; a card on Today and a line on Home from Saturday 18:00 to Monday). **Step 2 is complete** apart from the content debt in 2x. New records get `updatedAt` from day one, ready for sync |
| 2x | 18–19 Oct 2026 | **Built alongside step 2:** renamed to **99ile** with a new logo and app icons; CI on every pull request (typecheck, tests, build, catalog check, `npm run size` budget) and deploy on Cloudflare Pages with security headers in `public/_headers`; real CAT past paper PDFs (Bodhee Prep, 39 files, `src/data/papers.ts`) as a "Real CAT papers" row in Practice and a direct link in the timed paper task; economics, humanities and mind RC sets rewritten at CAT length (about 470–540 words, subtler wrong options); RC sets may have 4 or 5 questions (mind has 5; the sectional uses the first 4); the dropdown moved to `components/Select.tsx` to keep the main script under budget; mobile fixes (row buttons stay on the right, one filled button per screen). **24 Oct follow-up:** five AI and technology sets in `content/rc/ai&technology.json`, bringing the library to 50 and 9 genres, including a dedicated AI and technology category; with `since` 25 Oct, they join the daily rotation in its first cycle starting on or after that date. **Still to do:** rewrite science and society the same way, then grow to 60 RC sets |
| 2y | 20–21 Oct 2026 | **Built on main:** speed pass (below); home page redesign with a site header and footer; site search palette with a short tour; confirmation before leaving unfinished practice; light-theme button fix. Started: Go API skeleton in `server/` with `GET /healthz` (not committed yet) |
| 2g | Nov 2026 | **Built 21 Oct 2026** on `feat/learning-loop` (research in `docs/research/step-2g.md`): content versions on every attempt (46), "Not sure" with lucky guesses back in the redo queue (45), error causes, corrections and patterns (42), weak spots you are fixing and three answers on Progress (43, 44), one next step on Today (41). Planned as: **The learning loop (41–46):** content versions, error causes and patterns, next step, fixing in Progress, not sure. Small branches in `docs/implement.md`; 44 and 45 may slip to step 6 so DILR keeps its date. Then **S5**, the sync ledger |
| D | Oct–Nov 2026 | **Redesign on Tailwind CSS v4 + shadcn/ui, before the rest of step 2.** Plan and phases D0–D5 in `docs/design/redesign-plan.md` |
| 3 | 22 Oct–18 Dec 2026 | **Backend v1, re-planned 21 Oct 2026** (research `docs/research/step-3.md`; branches in `docs/implement.md`): **S5** sync ledger and keep-data-safe (50), no server, **built 21 Oct 2026** (hybrid clock, two-device property tests, iPhone Home Screen note with backup); **B1** foundation and deploy (Go 1.27, Render and Supabase in Singapore), **done 22 Oct 2026**; **B2** RC attempts synced end to end, to 14 Nov; **B3** all records, restore merges, delete asks where, to 22 Nov; **B4** recovery code and device linking (47), to 29 Nov; **B5** export, delete and the privacy page, then **sync switched on for students**, to 4 Dec; **B6** feedback inbox (39) and **B6b** and **B6c** a daily digest of reports, emailed to the team with notes and posted to a GitHub issue without them, **built 23 Oct 2026**; **B7** Google sign-in with "save this device's progress" (D1, D9), to 18 Dec, or after DILR if step 3 runs late; then **B8** admin page (79), reports and counts for staff, and the private part of **You** (81), **built 24 Oct 2026** |
| 3b | Dec 2026 | **AI v1:** summary feedback (36) and "explain my mistake" (35) on the Groq 8B model, Ollama in dev |
| 4a | Nov 2026 | **Logical reasoning first (D37):** **DILR page opened 24 Oct 2026** with Learn (format, set types, topic table, eight concept guides), resources (34 links) and toppers, not yet in the timetable; the LR set format and the owner's sets in `content/lr/` (2–3 days); the LR set player with set post-mortem (23, 86; **built 24 Oct 2026 for arrangement sets**, the owner's five arrangement sets live, other categories one at a time); the LR Learn tab, concepts and resources (21, 22); then clue translator (83), must/could/cannot (84) and first move (85). The DILR page goes live with LR |
| 4 | Dec 2026–Jan 2027 | DILR: **DI sets** join the player (21–23). Use `cmd/author` + Ollama for set drafts. **One daily budget (27) moves here** from step 6, because this is when two sections are first live. **Set Selection Arena (56)** once 32 sets exist, and **DILR Replay (57)** for scheduling, grouping and tournaments, with the solver as its core |
| 4b | Jan 2027 | **Habit, as students arrive:** a plan that fits you, part 1 (82: setup, time and section split from the answers), a personal home for returning students (80), restart plan (66, no backend), inbox (64), study reminders and web push (65), the daily puzzle in four kinds (61, reuses the 57 solver). About two weeks; may run beside Quant content writing |
| 5 | Jan–Mar 2027 | Quant (24–26), with **Quant Debugger (58)**, **estimate first (59)** and **why this method (60)** built into the player |
| 6 | Mar 2027 | Mock upgrade (28), calendar export (30), flashcards (17), a plan that fits you, part 2 (82: exam year as a choice, commute set, diagnostic for repeaters, reality check after mocks; absorbs professional mode 16) |
| 6b | Apr–May 2027 | **Community, needs B7 accounts:** safety and moderation first (70), the public side of profiles (81), then discuss this question (67), the doubt forum (68), then study groups (69), which replace the global leaderboard (37) and partner link (38). A legal check of the IT Rules duties before launch |
| 7 | Apr 2027 | **Reality to DILR (63)** in the extension after article → RC. **AI v2:** article → RC set (34), and the AI coach and weekly narrator (48) reading the computed review |
| 8 | May–Jun 2027 | Catalogue (8), filters (9), SEO (10), share card (18), more Arcade kinds (61), Data Detective (62) |
| 9 | Jun–Jul 2027 | Burnout check (19). Leaderboard and partner link moved into study groups (69); feedback (39) is in step 3; the bookmarklet (40) became the extension (53) |
| 10 | Oct 2027 → | B-school calculator (31), exam calendar (32). **Manager track, season 1 (Dec 2027–Mar 2028):** brief (72), PI prep (76), GD (77), mini case (74). **Season 2 (Apr–Jun 2028):** MBA-ready basics (78), daily dilemma (73), founder simulator (75), each only if the season before was used. Public communities (71) only if moderation keeps up. Hindi when there is help |

Each step ships as its own branch with a Conventional commit message. The user commits and pushes.

## Step 2e: summary writing (planned 19 Oct 2026)

**Status 20 Oct 2026:** branches 1 and 2 built: the `summaries` record, the writing card, compare and checklist (`components/Summary.tsx`, `practice/summary.ts`), the step after RC sets with Skip, resume after a reload (`sumfor:<set>` draft), the folded summary in the review, and model summaries for all 45 sets (`summary` in `content/rc/*.json`, each checked by `content.test.ts` against the same rules the student ticks). The same day the owner added a sixth genre, **arts** (`content/rc/arts.json`, 5 sets of 5 questions: perspective, concert halls, forgery, photography, montage), which takes the library to 45 RC sets; the literature genre's label became "Literature" so it no longer overlaps with "Arts". Branches 3 and 4 built the same day: the article sheet (`components/ArticleSummary.tsx`: bottom sheet on a phone, side sheet on a laptop, source chips from the reading block's links, an optional title or link, an inline "How to write one", the self-check once there are 5 words, "Save and finish block" ticks the block), the Reading journal at `/journal` under Track (filters, model on demand for RC entries, delete with undo, "Add an article summary" for reading outside the plan), and "Summary habits" in the Progress report card (`summaryHabits` over the last 10, with one line on the check missed most, shown only when missed twice or more). Step 2e is complete.

**Why.** Para summary and RC main-idea questions test one skill: finding what the author claims and how strongly. Students lose marks by dropping the qualifier ("often", "partly") or by adding their own view. 2e builds a 2-minute habit with feedback on exactly those mistakes, and a journal they can reread before the exam. It does not mark grammar.

**Shared parts**
- **Writing card**, one component used everywhere: a summary box with a live word count ("18 of 25 words", amber past 25), and a tone row of tap chips (Analytical, Critical, Sceptical, Appreciative, Cautionary, Ironic, Optimistic, Neutral, Other). An unfinished summary survives a reload through `lib/draft.ts`.
- **Checklist**, 4 items; the number ticked is the score out of 4:
  1. Main claim: the same point as the author's.
  2. Qualifier kept ("often", "partly", "in rich countries").
  3. No examples or figures.
  4. Nothing added: no outside opinion.
- **Record:** a new `summaries` list in state: `{ id, d, src: "rc" | "article", set?, from?, title?, url?, text, tone, checks: boolean[4], words, updatedAt }`. It is in backup and restore, counts for the streak (`activityDays`), and is ready for sync and for AI grading in 3b. Old backups load with an empty list.

**Place 1: Practice, after an RC set (the main training)**
- Appears **after Submit and before the review**, because the main-idea answer would give the summary away. The score shows first, then "Before the answers, sum up the passage in 25 words." "Skip" is always there.
- Applies to library sets and the RC of the day.
- Flow:
  1. Write. On a laptop, the passage on the left and the card on the right (the existing `Split`). On a phone, one column with a "Show passage" toggle (the existing pane switch).
  2. Compare. Yours above the model on a phone, side by side on a laptop. The model's claim and qualifier carry the yellow highlighter.
  3. Tick the checklist. Each item shows the model's version, e.g. "Model's qualifier: *partly*". Score out of 4.
  4. See the answers: the normal review, which also gets a collapsible "Your summary and the model".
- **Content:** each RC set gets `"summary": { "model": "≤25 words", "tone": "sceptical", "claim": "…", "qualifier": "…" }`. Claude drafts the 40 model summaries from the passages, and the owner checks them. Tests check: model ≤ 25 words, and claim and qualifier appear in the model. A set without a summary skips the step. Science and society summaries are written after those genres are rewritten.

**Place 2: Today, after "Read one article"**
- A secondary "Write your summary" button on the read block, next to its links. Ticking the block without a summary still works.
- Opens a sheet: a full-height bottom sheet on a phone (the box takes focus and the save button stays above the keyboard), a side sheet on a laptop so the article tab stays in view.
- In the sheet: "Where from" chips with that day's sources (Aeon, The Hindu…) plus an optional title or link; the writing card; the same checklist as a self-check (there is no model answer for an outside article); a "How to write one" link to the summary-writing guide. The button is "Save and finish block": it saves the summary and ticks the block.
- In 3b the AI fills in the checklist for these.

**Place 3: Reading journal and summary habits**
- **Reading journal** page at `/journal`, under Track in the menu: every summary, newest first, filters All, Articles and RC sets. Each card shows the date, source, summary, tone and score; RC cards expand to show the model. It is for rereading in the last weeks before CAT.
- **Summary habits** in the Progress report card: how often each checklist item was ticked over the last 10 summaries, with one plain line on the weakest, e.g. "You dropped the qualifier in 6 of your last 10. Look for words like often, partly, some."

**Design rules**
- The summary box uses 16px text, so iPhones do not zoom. No text under 14px. Chips and checklist rows are at least 44px tall.
- One filled button per screen ("Compare", then "See the answers"). The highlighter only on the model's claim and qualifier.
- Every animation stops under reduced motion. Checked in light and dark at 412 and 1440 wide.

```
PHONE (412)                      LAPTOP (1440)
┌────────────────────┐           ┌──────────────────┬─────────────────┐
│ 3 of 4 correct     │           │ Passage          │ Sum it up in 25 │
│ Sum it up in 25    │           │ (scrolls)        │ ┌─────────────┐ │
│ words  [Passage ▾] │           │                  │ │             │ │
│ ┌────────────────┐ │           │                  │ └─────────────┘ │
│ │                │ │           │                  │ 18 of 25 words  │
│ └────────────────┘ │           │                  │ Tone: chips     │
│ 18 of 25 words     │           │                  │ [Compare] Skip  │
│ Tone: [chips wrap] │           └──────────────────┴─────────────────┘
│ [Compare] Skip     │
└────────────────────┘
```

**Branches, in order**
1. `feat/rc-summary-step`: the `summaries` record, the writing card and the step after RC sets.
2. `content/rc-model-summaries`: the 40 model summaries (can run alongside 1).
3. `feat/article-summary`: the Today sheet.
4. `feat/reading-journal`: the journal page and summary habits in Progress.

**Tests:** the content rules for model summaries; old backups load with an empty `summaries` list; summaries count for the streak; the score is the number of ticks. Each branch also passes `npm run typecheck`, `npm test`, `npm run build` and `npm run size`, with a Playwright check at 412 and 1440 in both themes.

**Decided 19 Oct 2026:** the summary step runs after the RC of the day as well as library sets; the journal is its own page; Claude drafts the model summaries and the owner checks them.

## Speed pass (20 Oct 2026, before 2f)
Measured on a production build, cold cache, 1.6 Mbps with 150 ms latency and the CPU slowed 4× (Lighthouse's "mobile" profile):

| Page | Before: first paint, largest paint, downloaded | After |
|---|---|---|
| Home | 1.20 s, 1.58 s, 416 KB, layout shift 0.107 | 1.04 s, 1.39 s, 262 KB, shift 0 |
| RC passage | 1.14 s, 3.16 s, 593 KB | 1.01 s, 2.06 s, 297 KB |
| Today | 1.14 s, 2.14 s | 1.03 s, 2.02 s |

What changed: self-hosted fonts without the serif's optical-size axis and the unused italic (165 KB → 94 KB, no Google round trips, size-matched fallbacks; not preloaded, which tested slower); practice content split per file (`bank.ts` loaders, `RC_FILE` in the catalog, `useContent(need)`); main script 131 → 110 KB (resource list, menu sheet, streak note, toasts and target constants moved out); advance fetching waits for idle (`lib/idle.ts`) and skips Data Saver and 2G; the home teaser reserves its paragraph's height. `npm run size` now also budgets the largest content file (70 KB) and the two font files (100 KB).

## Where data lives
| Data | Examples | Where |
|---|---|---|
| Content: the same for every student, written and checked by the owner | RC sets, VA paragraphs, guides, links, updates | In the repo. New content goes in as JSON (`content/*.json`) so the Go server can read the same files later |
| User data: different per student | attempts, redo queue, streak, errors, words, settings | localStorage now; a synced copy in Postgres (`records`) after backend v1 |
| Made at run time | AI output, leaderboard scores, problem reports | Postgres (`ai_cache`, `daily_scores`, `feedback`) |

Content stays out of the database because:
- It is served free and fast from the CDN, and works offline.
- Tests check every answer key before it ships.
- The free database and the free server sleep when idle, so a page that reads content from the database would wait for a cold start.

Move it to the database only when someone who isn't a developer needs to edit it, or when AI-made sets join the shared library.

`server/cmd/author` (Ollama on the owner's Mac, no hosting) can draft VA and CR content any time, even before the backend. A person checks every draft.

## Open decisions
- 21 Oct 2026: D1 to D3 decided (see `docs/analyze.md` §5). Still open, with recommendations: D5, D7, and for step 3 **D8** (sync order from the server), **D9** (Google first), **D10** (Supabase), **D11** (server host). S5 needs none of them; B1 needs D10 and D11. Later the same day: Render in Singapore for D11 and Supabase moved to Singapore beside it.
- AI daily limits (defaults above).
- Who checks answer keys for DILR and Quant.
- Leaderboard nicknames: public, or only visible to signed-in users.

## Verification
- **Frontend, every step:**
  - `npm run typecheck`, `npm test`, `npm run build`, and check bundle size.
  - Playwright at 1366 and 390 wide: no console errors, no sideways scroll.
- **Backend:**
  - `go vet ./...` and `go test ./...` for unit tests (validator, sync merge, token hashing).
  - Integration tests on a local Postgres via docker compose, using a separate `TEST_DATABASE_URL`.
  - `httptest` for each handler.
- **End to end:**
  - Sign up, verify, add progress, then sign in on a second browser and see the progress appear.
  - Go offline, add progress, come back online, and check it syncs.
  - Google sign-in.
  - Delete the account, then check the rows are gone.
- **AI:**
  - Run against local Ollama in dev.
  - Push a bad JSON fixture and check the validator rejects it.
  - Hit the cap and check the friendly message shows.
