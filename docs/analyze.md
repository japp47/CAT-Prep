# 99ile: analysis (analyze)

Checks that the spec (`docs/feature.md`), the plan (`docs/plan.md`, `docs/architecture.md`) and the code agree, before the next step is built.
Redo this check at the start of each step; add findings at the top of section 3 with the date.
Last updated 24 Oct 2026 (content, sidebar navigation and You page updates; step 3 analysis remains below).

---

## 1. Where we are (21 Oct 2026, start of step 3)

**Committed:** step 2 is complete. 2f (`7dfbd63`, mock analysis and weekly review) and 2g (`68bff65`, the learning loop) are on `feat/learning-loop`. Content debt from 2x stays open (rewrite science and society RC sets, grow to 60).

**Not committed:**
- `server/`: Go module with `GET /healthz` and two tests; `go.mod` says `go 1.23`, the Mac has Go 1.27.3.
- `README.md`: a "Go API" section.

**Step 3** is re-planned in this pass: research in `docs/research/step-3.md`, spec in `docs/feature.md` (F50, F33/F47, F39, privacy page), design in `docs/architecture.md` §5, §6, §9, §10, branches S5 and B1–B7 in `docs/implement.md`.

**Content today:** 50 RC sets, 80 VA paragraphs, 30 CR items, 39 real paper PDFs.

---

## 2. Review of the research (`docs/research/upcoming-feautres-research.md`)

The research is a product review (sections 1 to 8), a backend plan, and a note on sync without accounts. Overall it is sound and fits 99ile. Its best idea is the one-line product: **"A free CAT coach that learns from every mistake and tells you what to do next."** It is now the product line in `docs/feature.md`.

### 2.1 Adopted
| Research point | Where it went |
|---|---|
| One learning loop: practise → understand → pattern → next step → revisit → verify | `docs/feature.md` §1, and step 2g (F41 to F46) |
| "Structure in the system, not in the student's face" | Principle 1 in `docs/feature.md` |
| Progress answers three questions: improving, weaknesses fixed, exam ready | F44 |
| Error intelligence: question level, pattern level, outcome level; student can correct a diagnosis | F42 (causes and patterns), F43 (outcomes) |
| Recommendation records with evidence and outcome | F43; the record is built in 2f so the mock wizard and weekly review use it from day one |
| Deterministic code computes, AI interprets; AI never blocks practice | Principle 3; `docs/architecture.md` §3 and §8 |
| Bring the one daily budget forward | F27 moved from step 6 to step 4, with DILR, the first time two sections are live |
| Confidence signal to tell guessing from knowing | F45 (optional "Not sure") |
| Content versions so history keeps its meaning | F46, as a build-time hash (see 2.2) |
| Anonymous sync with recovery code and device link; accounts later | F47; `docs/architecture.md` §5, decided (D1) |
| Idempotent writes, records not whole-state overwrite, merge rules | `docs/architecture.md` §6 |
| Modular monolith, stdlib or chi, pgx, one migration tool, no Redis or queues yet | Already the plan; confirmed in `docs/architecture.md` §4 |
| Audit trail that explains decisions, not every click | `docs/architecture.md` §7 |
| First backend milestone is one vertical slice | B2 in `docs/implement.md`: RC attempts synced end to end first |
| Validate that features are used and help | Outcome numbers per student in F43; usage counts as open decision D5 |

### 2.2 Adapted
| Research point | Change and why |
|---|---|
| Move the learning engine (attempts, scoring, redo, progress) into Go, server authoritative | **Keep it in TypeScript.** It exists and is tested; offline needs it in the browser anyway; a Go copy would drift; free-tier cold starts would slow pages. The server stores and syncs records and re-scores only the leaderboard (`docs/architecture.md` §3) |
| A table per entity (`attempts`, `error_entries`, `review_items`, …) | **One generic `records` table** for sync, as planned. A new feature then needs no migration. Typed tables only for what the server itself reads (identity, AI, leaderboard) |
| `questions` / `question_versions` tables | Content stays in the repo. A **content hash per set** stored on each attempt gives the same guarantee for far less |
| Audit history for everything, append-only | Bounded: attempts, error corrections and recommendations in the browser (5 MB limit); account, device and AI events on the server. No UI events |
| AI study coach as a top priority | **After the loop works without AI.** The next step card, patterns and weekly review are rules over data first (2f, 2g). The AI narrator reads the computed review in step 7 |
| Online writes server-authoritative in the first backend release | Not needed: the browser already holds the truth and sync is records-based, so offline writes work from the first release |

### 2.3 Not adopted
| Research point | Why not |
|---|---|
| "Migrate the existing frontend functionality" to the backend as a phase | Nothing needs migrating except storage; the frontend keeps working with the backend switched off (`VITE_API_ENABLED`) |
| Rating the idea 8.5 / 10 and differentiation 7 / 10 | Opinions, not evidence. Kept out of the docs; F43 and D5 are how we would measure instead |

### 2.4 Things to fix in the research file itself
- It is pasted from a chat page: there is a long block of Mermaid CSS around line 183 and a stray "Copy checklist" line. Worth cleaning if the file is kept.
- Some links carry `utm_source=chatgpt.com`.
- Its worry that the product "feels too structured" is answered by principle 1 (hide the structure, show one action), not by removing features.

---

### 2.5 Owner's proposals, 23 Oct 2026 (`docs/research/beyond-cat.md`)
Thinking practice (Arcade, Manager Lab, DILR and Quant ideas), community, and reminders. **Adopted** as F56 to F78 with these changes: CAT Coach first, nothing moves DILR or Quant; the Arcade is one daily puzzle in four DILR-like kinds, generated and proved unique by code; Manager Lab becomes the manager track after CAT 2027, in two seasons (getting in, then ready for the MBA), with PI, GD and MBA-ready basics added; community starts from discussions under our own questions with a spoiler gate, then the doubt forum, then private groups, public communities last; reminders go to the inbox first and web push only where it works. **Not adopted:** Sudoku and chess, direct messages, a social feed, image uploads at first, public communities at launch, more than one reminder a day.

## 3. Consistency check: spec vs plan vs code

### 24 Oct 2026, RC content addition and category
| # | Finding | Impact | Fix (where) |
|---|---|---|---|
| A29 | `content/rc/ai&technology.json` was discovered by the lazy loader but not included in the RC catalog source | Its five sets were missing from the library dropdown and daily rotation | Include the file in `practice/rc/index.ts`; regenerate the catalog and leads (`npm run catalog`) |
| A30 | The new AI and technology passages were categorized as society | Students could not filter them under a dedicated topic | Add the `technology` genre with the label "AI and technology"; categorize all five sets under it |
| A31 | The desktop sidebar had a sync/account row near Search and a separate disabled user icon at the bottom | Sign-in and profile navigation appeared in two places, while the bottom icon did nothing | Remove the upper row and make the bottom account icon use the existing sign-in/profile destination logic |
| A32 | The You page put account, CAT preferences and study totals in one narrow vertical column | On wide screens, the profile felt sparse and made key information harder to scan | Use a responsive account hero, a two-column CAT/study layout on wide screens, and grouped stat tiles that stack naturally on small screens |

### 21 Oct 2026, step 3 (backend v1)
| # | Finding | Impact | Fix (where) |
|---|---|---|---|
| A17 | Sync used the device's `updatedAt` for "newest wins" | A phone with a wrong clock wins or loses every conflict | Server `rev` with compare-and-set on `baseRev`; `updatedAt` only a clamped tiebreak (D8, `docs/architecture.md` §6.2) |
| A18 | Settings restore replaces the whole `AppState` | With sync on, an old backup would delete newer rows on every device | Restore merges when sync is on (`mergeBackup`, S5; wired in B3) |
| A19 | "Delete all my data" is `replace(blankState())` | With sync on it would wipe every device | Ask "this device only" or "everywhere" (B3, B5) |
| A20 | `uid()` has 4 random characters after the time | Fine on one browser; ids from several devices now share one space | 10 random characters from `crypto.getRandomValues` (S5) |
| A21 | Safari deletes a site's storage after 7 days of Safari use without a visit; nothing asks for persistent storage | iPhone students can lose everything after a week off, before any server exists | F50 in S5: `navigator.storage.persist()`, an iPhone home-screen line, a size warning |
| A22 | Neon free compute stops for the month after about 400 hours | Sync would fail for the last days of each month once students use it | Supabase free Postgres in Mumbai, Neon the fallback (D10) |
| A23 | `go.mod` says `go 1.23`, out of support | Security fixes stop | `go 1.27` in B1 (closes A3) |
| A24 | B2 put recovery and link codes in its migration, and no point was set where students first see sync | Unclear launch | Recovery and link tables in B4; students see sync from B5, after export and delete exist |
| A25 | Drafts, prefs and `redoSeeded` are per device | Syncing them would move a half-done set between devices mid-question | Listed as not synced (`docs/architecture.md` §6.3b) |
| A26 | Unticking a block on one device can come back from another device's copy (merge keeps the larger minutes) | A rare tick reappears | Accepted and noted |
| A27 | `docs/plan.md` 2C, 2F and 2I still describe email first and Neon | Two truths | `docs/plan.md` points at D9 and D10 |
| A28 | `public/_headers` sends `Permissions-Policy: camera=()`; the QR scanner needs the camera. The phone's camera app opens links in Safari, apart from the Home Screen app | A camera-app scan can link the wrong copy; the in-app scanner would be blocked | In-app scanner, `camera=(self)`, decoder loaded only when scanning (B4; `docs/research/step-3.md` 11–15) |

### 21 Oct 2026, before step 2f
| # | Finding | Impact | Fix (where) |
|---|---|---|---|
| A1 | `server/` and the README change are untracked on `main` | Easy to lose; CI does not see them | Commit on a branch (`feat/go-api-skeleton`), see the end of this file |
| A2 | Go is not in CI | A broken server would merge | B1: a `server` job with `go vet` and `go test` |
| A3 | `go.mod` says `go 1.23`; local is 1.27 | None now; the server image must match | Pin the Docker builder to the `go.mod` version in B1 |
| A4 | A `Mock` row is `{ id, d, sec, n, k, c, w }`: no per-question data | The wizard cannot be built on it alone | F12 adds a separate `mockReviews` list that points at the mock row |
| A5 | Only `sectionals` and `summaries` have `updatedAt`; `redo`, `days`, `ticks`, `settings` are maps or keyed rows without timestamps | Sync cannot merge them | A sync ledger beside `AppState` (S5 in `docs/implement.md`), before B2; no change to the state shape |
| A6 | Attempts store option indexes, not content versions; economics, humanities and mind sets were rewritten on 19 Oct 2026 | Old attempts on those sets now show the wrong question in review, and count under the new question's type in the report | F46 (2g). Until then, the review is wrong only for attempts before 19 Oct |
| A7 | The Error log can add and delete entries but not correct one | A wrong auto trap stays wrong | F42 adds editing with the old value kept |
| A8 | `src/data/roadmap.ts` "Next up" lists sign-in before DILR and Quant, and is grouped by feature, not by outcome | Students read a backlog | Regroup by outcome (complete the loop, complete the sections, coach, sync and community) in the 2f branch |
| A9 | The report card counts traps but not trap × type pairs | No "7 of 12" pattern sentence | F42 |
| A10 | Settings says "Nothing is sent to a server" | Must change when sync ships | B2 updates the copy, and only when sync is on |
| A11 | Plan Part 3 put the one daily budget in March 2027, after Quant | Two live sections in January with two separate timetables | Moved to step 4 (`docs/plan.md`) |
| A12 | No way to know whether students use a feature | Cannot validate the research's success measures | D5 |
| A13 | CSP is `connect-src 'self'` | Good: forces the same-origin proxy. Any analytics script would need a CSP change | Keep; note in D5 |
| A16 (21 Oct) | Main script 132.2 KB after 2g: the content version in each catalog row adds about 1.7 KB | Still 18 KB under budget | Lazy-load the search palette (A15) before DILR |
| A15 | Main script is 130 KB (budget 150); it was 110 KB after the speed pass on 20 Oct. The search palette, header and footer merges added about 19 KB; the mock review adds under 1 KB gzipped | 20 KB of headroom left before DILR | Check what the palette pulls into the first download (lazy-load it on first open, like the menu sheet) |
| A14 | `docs/plan.md` Part 2 and `docs/architecture.md` overlap | Two truths | `docs/plan.md` Part 2 now points to `docs/architecture.md` for identity, sync and logic placement; hosting, budgets and security stay in the plan |

---

## 4. Risks
| Risk | Likelihood | Effect | What we do |
|---|---|---|---|
| Step 2f + 2g + backend v1 do not fit before DILR (Dec 2026) | high | DILR launches late, in the months students start | 2g pieces are small and independent; F45 and F44 can slip to step 6. DILR keeps its date over 2g |
| DILR and Quant answer keys are wrong | medium | Trust lost fast | Tests per set as for RC; a second reader (open decision in the plan); "Report a problem" on every question |
| Recommendations based on too little data look silly | medium | Students ignore the coach | Minimum counts (6 questions per skill, 8 after) in every rule; say "not enough data yet" |
| localStorage fills up after a year of heavy use | low | Saves fail silently | `saveState` already returns false; add a size check in S5 and warn at 4 MB |
| Free tiers change (Render, Supabase, Groq) | medium | Cost or downtime | Sync and AI are optional; the site works without them; Cloud Run and Neon as fallbacks |
| Lost recovery code means lost data | medium | Angry student | Said plainly when sync is turned on; export still works; accounts later |
| Abuse: scripts create identities or burn the AI budget | medium | Costs, slow service | Turnstile, rate limits, global AI budget, kill switch |
| R1. Step 3 runs past mid-December and pushes DILR into January, when students start serious prep | medium | DILR late | B7 (Google sign-in) is last and can move after DILR; B1–B5 are the minimum. Sync is optional, DILR is not |
| R2. A sync bug deletes or duplicates progress | low | Trust and data lost | Compare-and-set, tombstones only from real deletes, merge on restore, the two-device property test (S5), end-to-end tests (B3), backups still downloadable |
| R3. The free database fills (500 MB) or its terms change | low | Sync stops | Size check in the weekly backup job; Neon or a paid plan as fallback; the site works without sync |
| R4. Students lose recovery codes | medium | Lost progress on a lost device | Plain words on the code screen, download as a file, backup offered, Google sign-in in B7 |
| R5. The new ideas pull time from DILR and Quant | high | The sections students come for arrive late | Arena and Replay are part of step 4, Debugger and methods part of step 5; habit (4b) is two weeks; community waits for step 6b; Manager Lab for after the exam |
| R6. An empty or spammy community | medium | Looks dead or cheap; trust lost | Start with discussions under questions that already have traffic; unanswered first; new-account limits; hide on reports; public groups only when moderation keeps up (F70, F71) |
| R7. Legal duties of a forum (IT Rules 2021 grievance officer, takedowns; DPDP for minors) | medium | Notices, forced shutdown | 18 and over; published rules and grievance contact; 24-hour acknowledgement, 15-day resolution; legal check before 6b |
| R8. Reminders annoy, or push silently fails on iPhone | medium | Students turn everything off, or never get it | Off by default; one a day at most; quiet hours; inbox and calendar reminder as fallbacks; say plainly that iPhone needs the Home Screen app |
| R9. Arena needs more DILR sets than step 4 plans (rounds repeat) | medium | Arena feels stale | Opens at 32 sets; `cmd/author` drafts; difficulty recalibrated from real times |
| R11. The repository is public (checked 23 Oct 2026), so GitHub issues and `docs/` are public | medium | A student's note or an internal detail published | The public digest never includes notes, only question ids, kinds and counts (notes go only to the team's email); secrets never in the repo (checked before the docs push); the issue text is tested for notes |
| R10. Free-tier limits with community content and a reminder job | low | Database grows, job misses runs | Text only; size check in the weekly backup; job every 15 minutes is idempotent so a missed run is caught by the next |

---

## 5. Open decisions (need the owner)
| # | Question | Recommendation |
|---|---|---|
| D1 | Anonymous identity first, email and Google later (F47)? | **Decided 21 Oct 2026:** backup file (done) → anonymous sync → account; on sign-in the student can save all the device's progress into Postgres |
| D2 | Domain logic stays in TypeScript; the server only stores, syncs and re-scores the leaderboard? | **Decided 21 Oct 2026:** yes |
| D3 | Content hash on attempts (F46) instead of question tables? | **Decided 21 Oct 2026:** yes |
| D4 | "Not sure" flag (F45): build in 2g, or leave for later? | **Built 21 Oct 2026** with the owner's go-ahead for 2g; on by default, can be hidden in Settings |
| D5 | Usage counts: none, Cloudflare Web Analytics (cookieless, needs a CSP change), or our own counter on the API after B2 | Our own counter after B2: page and feature names only, no ids |
| D6 | Mock wizard: also for full mocks with DILR and Quant before those sections ship? | **Decided 21 Oct 2026:** VARC only for now; a full mock is reviewed by its VARC part, and the screen says so. DILR and Quant reviews ship with those sections |
| D7 | Weekly review day: Sunday, or the student's chosen day? | Sunday by default, changeable in Settings later |
| D8 | Sync order: the server's `rev` with compare-and-set on `baseRev`, device clocks only a tiebreak? | **Accepted 21 Oct 2026** ("let's proceed"). Phone clocks are often wrong; Replicache works this way; it costs one `WHERE rev = $base` |
| D9 | Accounts: Google sign-in first, email and password later? | **Accepted 21 Oct 2026.** No email sending, passwords or reset flow; nearly every student has a Google account |
| D10 | Database: Supabase free Postgres instead of Neon? | **Accepted 21 Oct 2026, Neon as fallback. Region changed to Singapore (`ap-southeast-1`) on 21 Oct 2026** with D11: the server runs in Singapore, and every request makes several database round trips, so the database sits next to it (about 1 ms each instead of 60 ms to Mumbai). Neon stops for the month after about 400 hours; Supabase has no hour cap. Only `DATABASE_URL` changes |
| D11 | Cloud Run needs a card on the Google billing account (stays free with max 2 instances and a ₹100 alert). OK, or Render (no card, about a minute to wake)? | **Changed 21 Oct 2026 (owner): Render free web service in Singapore** (Render has no India region), no card. The one-minute wake is avoided with a keep-awake ping every 5 minutes (`docs/implement.md` B1); one service awake all month is about 744 of the 750 free hours, so only one free service |
| D12–D17 | Database design: roles and permissions as tables, admin only for signed-in accounts, no one reads students' data, profiles per identity, hashed IPs in audit, schema `app` with the Supabase Data API off | Proposed 21 Oct 2026 in `docs/database.md` §10; owner to confirm before B2 |
| D18 | Order of the new work: Arena and Replay inside step 4, habit as step 4b (Jan 2027), Quant ideas inside step 5, community as step 6b (Apr 2027), Manager Lab after CAT 2027 | Recommended 23 Oct 2026; owner to confirm |
| D19 | Community needs a Google account (B7), not an anonymous sync identity; 18 and over | Recommended: yes. Posts need someone accountable, and DPDP needs parental consent for under-18s |
| D20 | Discussion under a question opens only after an attempt (spoiler gate) | Recommended: yes; it is principle 9 |
| D21 | Global daily leaderboard (37) replaced by a leaderboard inside study groups | Recommended: yes |
| D22 | Arcade: four DILR-like kinds generated by code; no Sudoku or chess | Recommended: yes |
| D23 | Reminders: off by default, inbox first, web push opt-in, email only for the weekly review after accounts | Recommended: yes |
| D24 | Scheduled reminders run where? A GitHub Actions cron every 15 minutes calling a protected endpoint, or a goroutine ticker in the API (Render free stays awake with the ping) | Recommended: a ticker in the API with a Postgres advisory lock, idempotent; GitHub cron as a backup trigger. Decide in 4b |
| D25 | How does the owner hear about reports? | **Decided 23 Oct 2026 (owner):** a daily digest emailed to 99ile.team@gmail.com with notes (B6c) and posted to one GitHub issue without notes (B6b), an admin page after B7 (B8, F79) |
| D26 | Does History or search need the server? | **Decided 24 Oct 2026:** no. Both read the device's own synced data; Postgres full-text search comes only with community posts (F67, F68) |
| D27 | Sign-in session: a new session cookie, or the device cookie? | **Decided 24 Oct 2026:** the device cookie. An account owns one identity; signing in only points this device at it, so sync needs no change |
| D28 | `access` roles in B7 or with the admin page? | **Decided 24 Oct 2026:** B8, where they are first read (`docs/database.md` §4 rule 5: no tables without code) |
| D29 | What happens to the anonymous identity a device leaves at sign-in? | **Decided 24 Oct 2026:** kept while any device uses it; deleted 30 days after it has no account and no active device |
| D30 | Google flow: redirect code flow, or the Google Identity Services button? | **Decided 24 Oct 2026:** code flow with PKCE through our own origin. No Google script on our pages (CSP and privacy), works in every browser and in the installed app |
| D31 | Practice sets past their target time: keep counting, or submit? | **Decided 24 Oct 2026 (owner):** submit. 60 seconds of warning at the target with Keep going; a hard stop at three times the target |
| D32 | Admin page: close reports one by one, or a question at a time? | **Decided 24 Oct 2026:** a question at a time. `POST /v1/admin/reports/status` takes up to 100 report ids and one status; each report still gets its own audit event. A typo reported by six students is one fix |
| D33 | How does staff reach `/admin`? | **Decided 24 Oct 2026:** an "Admin" row in the account menu, shown only when `GET /v1/admin/me` answers 200. Everyone else gets 404 from every admin route, and the page shows "Page not found" |
| D34 | Exam year on the You page: a choice? | **Decided 24 Oct 2026, until F82 part 2 (D36):** not yet. Phases, the plan and the countdown are built for CAT 2027 only; a year picker that changes nothing would mislead. It becomes a choice when the plan can follow another year |
| D35 | Sync and devices: Settings or You? | **Decided 24 Oct 2026:** You (`/you#sync`), as F81 says. Settings keeps a link, and `/settings#sync` forwards so old links and bookmarks work |
| D36 | Personalization: when, and by rules or AI? | **Decided 24 Oct 2026 (owner asked; research later):** F82, rules written down and tested, never the model. Part 1 in step 4b (Jan 2027), after the daily budget (F27, step 4) exists to split, and as CAT 2027 students arrive; part 2 in step 6 (Mar 2027) makes the exam year a choice, replacing D34 |
| D37 | DILR: LR and DI together, or LR first? | **Decided 24 Oct 2026 (owner):** LR first, from November (step 4a). The owner has LR sets ready, and LR or numbers-driven LR made up four of five sets in CAT 2025 slot 1. DI joins in December. Research `docs/research/lr.md` |
| D38 | Whose sets can go on the site? | **Decided 24 Oct 2026:** only original sets or sets used with the writer's permission (`source` in every set). CAT papers and coaching sets are linked, never copied, as for RC and VA |
| Older | Cloud Run needs a card; AI limits; who checks DILR and Quant keys; leaderboard nicknames | As in `docs/plan.md` |

---

## 6. What to commit now
- 2f and 2g are committed.
- The Go skeleton and README: branch `feat/go-api-skeleton`, message `feat: add Go API skeleton with a health check`. B1 builds on it.
- The `docs/` files are git-ignored and stay local.
