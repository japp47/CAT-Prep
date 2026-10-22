# 99ile: features (specify)

What 99ile does and will do, for whom, and how we know each feature works.
This is the first of four documents. Read them in this order:

| Step | Document | Answers |
|---|---|---|
| Specify | `docs/feature.md` (this file) | What and why: the student's problem, the feature, its acceptance checks |
| Plan | `docs/plan.md` (order and dates), `docs/architecture.md` (how it is built) | When, in what order, on what technology |
| Analyze | `docs/analyze.md` | Do the spec, the plan and the code agree? What is missing or risky? |
| Implement | `docs/implement.md` | Branch by branch: files, data changes, tasks, tests, commit message |

Feature numbers match the numbered list in `docs/plan.md` Part 1 (1 to 40). Features added on 21 Oct 2026 from the research review are 41 to 49; F50 came from the step 3 research.
Last updated 21 Oct 2026.

---

## 1. Product

**One line.** A free CAT coach that learns from every mistake and tells you what to do next.

**Who it is for.**
- **The self-studier.** A final-year student or a fresher preparing alone, with no coaching or with only a mock series. Needs a plan, honest practice and someone to say what to fix.
- **The working professional.** 60 to 90 minutes on a weekday, more at the weekend, often on a phone. Needs short sessions that still add up.
- **The coaching student.** Already has classes and mocks. Uses 99ile for daily VARC, the redo queue and to analyse mocks properly.

**What makes it different.** Other CAT sites have more questions. 99ile is built around one loop:

```
practise → see why each wrong option is wrong → the mistake comes back (redo)
   ↑                                                        ↓
next step ← pattern found (trap, type, pace) ← the mistake is logged with its reason
```

Every feature either feeds this loop or makes it easier to start the day.

**Principles** (they decide arguments):
1. **Structure in the system, not in the student's face.** Keep the records, schedules and logs, but show a recommendation and a button. Detailed analytics open on demand.
2. **No sign-up to start.** Everything works as a guest, offline, on one device. Sync and AI are additions, never a gate.
3. **Code counts, AI explains.** Scores, accuracy, schedules and recommendations are computed by tested code. AI only explains and drafts, its output is checked, and practice never waits for it.
4. **Evidence before advice.** A recommendation names its evidence ("7 of your last 12 inference misses were extreme wording") and is not shown with too little data (under 6 questions on a skill).
5. **Original content, checked by tests.** Every answer key is tested before it ships. Real CAT papers are linked, never copied.
6. **Fast on a cheap phone on 4G.** Budgets in `npm run size`; see `docs/wiki/Performance.md`.
7. **Free to run.** ₹0 hosting at launch (see `docs/architecture.md`, hosting).

**Status words used below:** Live, Building, Next (the step after the one being built), Planned, Later.

---

## 2. Live today (22 Oct 2026)

Short on purpose: the code and its tests are the spec for these.

| Area | Feature | Notes |
|---|---|---|
| Start | Home page | Today's passage hero with the countdown and phase, study tools, the three sections, today panel, about, latest updates, the exam. Site header and footer, theme toggle on every page |
| Start | Site search | Command palette over pages, guides, RC sets and updates, with a short tour; Back closes it first |
| Plan | Today | Blocks per section from the phase template and minutes, catch-up of a missed core task, focus timer (15), must-do links, article summary sheet |
| Plan | Plan and time | Minutes per weekday and weekend, per-day overrides, phase view, VARC target percentile, calendar reminder (`.ics`) |
| Practice | RC player | 45 original sets (8 genres), every option explained with a trap label, RC of the day with a stable rotation, summary step after the set |
| Practice | VA drill | 80 paragraphs: para summary (1), sentence insertion, odd sentence out, para jumbles. Daily mix or one type |
| Practice | Critical reasoning drill | 30 items, six types |
| Practice | Timed VARC sectional (5) | 40 minutes, 4 RCs and 8 VA, CAT-style palette, mark for review, draft survives reload |
| Practice | Reading speed test | wpm with two recall questions |
| Practice | Real CAT papers | 39 PDFs linked from Bodhee Prep |
| Practice | Leave confirmation | Leaving an unfinished set, drill, sectional or speed test asks first |
| Loop | Redo queue (11) | Misses return after 1, 3 and 7 days until right three times in a row |
| Loop | Error log | Auto entries from practice (chosen option, its trap, the fix) and manual entries |
| Loop | Summaries | Model summary and 4-point check after RC sets; article summaries; Reading journal at `/journal` |
| Progress | Report card (6) | Accuracy by type, RC question kind, genre, difficulty; pace trend; top traps; summary habits; focus lines |
| Progress | Mocks and target (7) | Logged mocks chart, target band, percentile estimator from CAT 2023 to 2025 tables |
| Progress | Streak | Activity days with two shields a month |
| Learn | VARC guides | One guide per question type with method, traps and a worked example |
| App | PWA | Installs, works offline, self-hosted fonts |
| Data | Backup | Export and import of all progress as a file (Settings) |
| Loop | Mock analysis (12) | `/progress/mock-review`: VARC part of a mock, question by question, where the marks went, up to three actions |
| Loop | Weekly review (13) | `/review`: the week in numbers, what moved, what cost you, one focus for next week shown on Today |
| Loop | Next step (41) | "Start here" on Today: one action with its time and reason, "Something else" for the next |
| Loop | Patterns and causes (42) | Cause chips on wrong answers, corrections kept, patterns at the top of the Error log |
| Progress | Three answers and fixing (43, 44) | Improving, weak spots getting fixed, exam ready; each weak spot measured before and after |
| Practice | Not sure (45) and content versions (46) | Lucky guesses come back once; rewritten sets do not change old results |
| Practice | Practice hub and RC library | Today's picks, the library with best score and last attempt per set, redo count, sectional entry |
| Practice | A finished attempt survives a reload | A submitted RC, VA or CR attempt goes into the address (`?review=`), so a reload, Back or a phone dropping the tab shows the answers, never a fresh copy |
| Learn | Words | Words saved from passages, with spaced-repetition flashcards |
| Learn | Reading journal | RC and article summaries in one place (`/journal`) |
| Explore | Updates, exams, guides, stories, roadmap | Important updates marked official or expected, the CAT pattern and timeline, other MBA exams, guides, topper stories, what is coming |
| App | Install guide (F50) | Install button on wide screens and iPad; step-by-step sheet for Safari, Chrome, Edge and Firefox on iPhone and iPad |
| Data | Keep my progress safe (F50) | Asks the browser to keep the data, a Safari 7-day note, storage size line and warning |
| Data | Two tabs at once | Saves are versioned and merged record by record, so two open tabs never overwrite each other's edits |
| Sync | Sync between devices (F33) | No sign-up: every kind of progress syncs through the server; merges by kind, never overwrites; works offline and catches up |
| Sync | Link a device (F47) | QR code or 8-character code (10 minutes, once), scanned inside 99ile or with the phone camera (`/link`); "add this device's progress" or "start fresh" |
| Sync | Recovery code and device list (F47) | 16-character code shown once, can be replaced; device list with remove; turn off with keep or clear |
| Sync | Status and prompts | "Sync devices" with its status in the sidebar and menu; one invite on an empty device, one nudge after real practice; search finds sync |
| Data | Export and delete everywhere | Download what the server has (also a backup); delete from the server and this device |
| Data | Privacy page | `/privacy`: what is stored, where, how long, rights, grievance contact; sync for 18 and over |
| Loop | From a mistake back to its question (F52) | "See the question" opens the old attempt at that question; "Try it again" with the answer hidden; "Last time" shows the old reasoning after a retry |
| Security | Bot check | Cloudflare Turnstile before sync is turned on; rate limits on codes; only hashes of secrets stored |

---

## 3. Built in step 2, being built and next

Steps 2f and 2g below are live; their entries stay as the spec the code was built to. Step 3 is next.

### Step 2f: mock analysis and the weekly review

#### F12. Mock analysis wizard — Live (21 Oct 2026)
**Problem.** Students take a coaching mock, look at the score, and move on. The marks they could have saved (silly errors, skips they could do, time sinks) are never counted, so the next mock repeats them.

**Story.** As a student who just finished a mock, I want a 15 to 20 minute guided review that shows where my marks went and gives me at most three things to change, so the next mock is better.

**Scope.**
- Works for: a coaching mock or real past paper taken outside 99ile (entered by hand), and an in-app timed sectional (filled in from its record).
- VARC only at launch; the record allows DILR and Quant so they plug in when those sections ship.
- Steps:
  (Researched 21 Oct 2026, `docs/research/step-2f.md`.)
  1. **Basics.** Name, date, kind, and the layout (passages and questions in each; VA questions by type). Default: CAT 2024–25 VARC, 4 passages × 4 questions, then 2 para summary, 2 sentence insertion, 2 odd sentence out, 2 para jumbles; odd sentence out and para jumbles are TITA (no negative mark). Optional: the attempts you planned before the mock.
  2. **Question grid.** One cell per question, all "right" by default. Tap a cell to set right, wrong, skipped or not reached. A right answer can be marked **slow**. A wrong answer gets one cause: misread the question, missed a qualifier, read too much into it, fell for a trap option, did not know the method, careless slip, guessed, should have skipped it, ran out of time. A skipped or unreached question gets "Could you have got it?" yes or no; "no" is a **good skip**.
  3. **Re-solve.** The doable skips are listed; the student tries them now, untimed, before reading solutions, and ticks the ones solved. This step can be skipped.
  4. **Where the marks went.** Computed: the score; marks lost by group (careless, reading the options, method, choices, time, doable skips), good skips, slow right answers; by type; attempts against the plan; for in-app sectionals, time on right, wrong and given-up questions; this mock against the last three; and "with no careless slips and the doable skips solved, you would have scored X".
  5. **Three actions at most.** Proposed from the findings, each with its reason and evidence (e.g. "Para jumbles: 3 wrong of 4, two marked careless. Drill 6 para jumbles this week."). The student keeps, edits or removes each. Kept actions become recommendations (F43), and one can become the focus of the week (F13).
  6. **Optional:** add the wrong questions to the Error log in one tap (source "Mock: name, Q7").
- Saving also adds the usual row to the mocks chart (or updates the logged row it explains), so nothing is logged twice. A review of a mock taken elsewhere also adds practice rows by type, so the report card sees it.
- The Mocks tab lists logged mocks not yet analysed ("Analyse it"), and once there are two or more reviews, marks lost by group across the last five.

**Acceptance.**
- A full VARC review with 6 wrong and 3 skipped takes under 3 minutes of tapping on a phone (grid plus causes), not counting reflection.
- "Where the marks went" adds up: right × 3 − wrong MCQ = the score shown; careless + time + did not know + not reached covers every lost question.
- From an in-app sectional, the grid is filled (status and seconds per question, question type) and only the causes are asked.
- No actions are proposed from fewer than 2 questions of a kind; the student can always write their own.
- Works offline, survives a reload mid-way (draft), and is in backup and restore. Old backups load with no reviews.
- One filled button per step; 44px tap targets; no text under 14px; both themes; 412 and 1440 wide.

**Not in scope.** Importing mock PDFs or scraping coaching portals; DILR and Quant question types (the record allows them).

#### F13. Weekly review (Sunday review) — Live (21 Oct 2026)
**Problem.** Daily practice hides the trend. Students do not notice that one type keeps slipping, or that last week's plan was never followed.

**Story.** As a student, once a week I want a two-minute review of what improved, what slipped and one focus for next week, so my week has a direction without me planning it.

**Scope.**
- Opens from Saturday evening to Monday night as a card on Today and Home ("Your week in review"), and any time at `/review`. Past reviews are kept.
- Content, all computed:
  - The week in numbers: days studied, minutes done against planned, questions answered, accuracy against the week before (only with 20+ questions in each week).
  - Improved and slipped: question types whose accuracy moved 10 points or more, each with at least 6 questions in both weeks.
  - The trap that cost most this week.
  - Redo queue: cleared this week, due next week.
  - Last week's focus: was it practised (questions on that skill), and did accuracy on it move.
  - A light-week check (F19): if minutes fell by half or more, or 3 days in a row were missed, suggest a lighter week instead of guilt.
- **Next week's focus.** One suggested focus (the weakest skill with enough evidence, or a mock action from F12), with two alternatives and "No focus this week". The choice is saved as a recommendation (F43).
- **The plan uses it.** Through the coming week, Today shows a "Focus of the week" row with a link to the drill, until the student marks it done on 3 days. (Built 21 Oct 2026 as a row rather than a planner block.)
- **One reflection line**, optional: "What will you do differently next week?", shown again in the next review.

**Acceptance.**
- With no practice that week, the review says so in one line and offers to set a lighter week; it never shows empty charts.
- Numbers match the report card for the same dates (same functions, tested).
- Choosing a focus changes Today for the next week; "No focus" leaves Today as it was.
- Dismissing the card hides it until next Saturday.
- In backup and restore; old backups load with no reviews.

### Step 2g: the learning loop (from the research review, 21 Oct 2026)

#### F41. Next step — Live (21 Oct 2026)
**Problem.** Today lists several blocks across sections. A student opening the app for 20 minutes needs one answer: what now?

**Story.** As a student, I want one "Start here" with the time it takes and the reason, at the top of Today and on Home.

**Scope.** A ranked rule list, first match wins, all from local data:
1. A practice in progress (draft): "Finish your sectional, 23 minutes left."
2. The focus drill of the week, if planned for today and not done.
3. Redo items due (5 or more): "8 questions are due for redo, about 10 minutes."
4. The RC of the day, not done.
5. The first unfinished block of today's plan.
6. Nothing left: "Today is done. Optional: one RC from the library."

The reason line names the evidence when a weakness drove the choice. The student can open the full plan in one tap.

**Acceptance.** Exactly one filled button. The rules are a pure function with tests for each rule and the order. Never recommends something already done today.

#### F42. Error causes and patterns — Live (21 Oct 2026)
**Problem.** The Error log records the trap of the chosen option (what the option did), but not what happened to the student (misread, rushed, guessed). The report counts traps but cannot say "your inference misses are mostly extreme wording".

**Story.** As a student, I want each mistake to say why it happened, and I want to see the pattern across mistakes, so I fix the habit, not just the question.

**Scope.**
- Each error gets an optional **cause**, separate from the trap: misread the passage, missed a qualifier, read too much into it, fell for the trap, ran out of time, guessed, did not know the method, careless slip. One tap in the review; a suggested cause is pre-selected when the data shows it (answered in under 20 seconds: careless slip; marked "not sure": guessed).
- The student can change the cause and the trap of any entry (corrections are kept, see F43 history).
- A **Patterns** view in the Error log and the report: the top pairs of question type and trap or cause over the last 30 days, written as a sentence with counts ("7 of your last 12 inference misses: options that go beyond the passage"), each with a one-tap drill.

**Acceptance.** Patterns need at least 4 errors in the pair and 6 questions of the type. Changing a cause updates the pattern at once. Old entries without a cause still count by trap.

#### F43. Recommendations with outcomes — Live (21 Oct 2026)
**Problem.** Advice that is never checked cannot improve. We do not know whether a focus helped.

**Story.** As a student, I want to see whether the things I worked on actually got better.

**Scope.**
- A `recommendations` record: what was suggested, why (evidence), by what (mock review, weekly review, next step), the skill it targets, its status (open, done, dismissed), the accuracy on that skill before, and after (measured on the next 12 questions of that skill, or after 14 days).
- **Fixing** in Progress: "Working on it" (open), "Fixed" (accuracy up 10 points or more on enough questions), "Not yet" (no change), each with before and after numbers.

**Acceptance.** Before and after use the same accuracy function as the report. Nothing is called fixed on fewer than 8 questions after. A dismissed recommendation is never shown again but stays in history.

#### F44. Progress around three questions — Live (21 Oct 2026)
Progress opens on three short answers, with the current tabs one tap away:
1. **Are you improving?** Accuracy trend (4 weeks), consistency (days studied), timed score trend from sectionals and mocks.
2. **Are your weak spots getting fixed?** The Fixing list (F43).
3. **Are you exam ready?** Last three mocks against the target band, pace against exam pace, percentile range (as an estimate, never a promise).

**Acceptance.** Each answer is one sentence plus one number or chart; no screen shows more than one chart before the student asks.

#### F45. Sure or not sure — Live (21 Oct 2026)
An optional one-tap "Not sure" on any question while practising. A right answer marked "not sure" counts as right but also goes to the redo queue once, and the report shows "lucky guesses" by type. Default on, can be turned off in Settings.

**Acceptance.** Scores are unchanged by the flag. The flag is stored per question in the attempt.

#### F46. Content versions on attempts — Live (21 Oct 2026)
**Problem.** Attempts store the index of the chosen option. When a set is rewritten (as economics and humanities were on 19 Oct 2026), old attempts point at new questions, and the review and the report mix the two.

**Scope.** The catalog build gives every RC set, VA paragraph and CR item a short content hash. New attempts store it. A review of an attempt whose set has changed shows the score only, with "This set was rewritten after you took it". The report skips such attempts in by-type and by-kind accuracy (the overall score stays).

**Acceptance.** Editing one option of one set changes only that set's hash (test). Attempts from before this feature are treated as matching.

### Step 3: keep progress safe and on every device (backend v1)
Research: `docs/research/step-3.md`. How it is built: `docs/architecture.md` §5 and §6. Branches: `docs/implement.md`, step 3.

**What a student gets from step 3, in their words.**
- "I can use 99ile on my phone on the bus and my laptop at night, and both show the same progress."
- "I didn't have to make an account or give my email."
- "When I got a new phone, I typed my code and everything came back."
- "If I want, I can sign in with Google so I never need the code."

#### F50. Keep my progress safe on this device — Live (21 Oct 2026)
**Problem.** Progress lives only in the browser. On an iPhone, Safari deletes a site's data after 7 days of Safari use without a visit, so a student who takes a week off can come back to nothing. Other browsers can clear data when the phone is low on space.

**Scope.**
- Ask the browser to keep 99ile's data (`navigator.storage.persist()`), quietly, after the student's first finished practice.
- On iPhone and iPad in Safari (not installed): one dismissible line on the score card after a set and in Settings: "On iPhone, Safari can clear this site's data if you don't visit for a week. Add 99ile to your Home Screen to keep it." The Home Screen app starts empty (iPhone keeps its data apart from Safari), so when there is progress the line says so and offers **Download backup**, to restore in the app; after sync ships it says to link the app instead. Never a popup.
- The Install card in Settings says the same about bringing progress across.
- **Install guide on iPhone and iPad** (added 21 Oct 2026). A web page cannot open an install prompt there (Apple has no `beforeinstallprompt`; the new `<install>` element is Chrome and Edge only, WebKit has no position), so the install button opens a small sheet instead: three steps with the real Share and Add icons, worded for the browser in use (Safari, Chrome, Edge, Firefox), and when there is progress, "Download backup" first because the Home Screen app starts empty. No arrow pointing at the screen: Share sits in different places across iOS versions (iOS 26 puts it under ⋯), so a fixed arrow would point wrong for some students. Profiles (`.mobileconfig`) and an App Store wrapper were considered and dropped (scary warning; $99 a year and review).
- Settings shows how much space progress uses once it passes 2 MB, and a warning with "Download backup" above 4 MB (localStorage holds about 5 MB).

**Acceptance.** No prompt or popup on any browser; the iPhone line shows only in Safari, not in the installed app, and stays dismissed; the size warning appears at 4 MB in a test.

#### F33 and F47. Sync without sign-up, then accounts — Live without sign-up (22 Oct 2026); Google sign-in next
**Problem.** Progress lives in one browser. Students use a phone and a laptop, change phones, and clear site data.

**Story.** As a student, I want my progress on my phone and my laptop without making an account, and a way to get it back if I lose a device.

**Scope (decided 21 Oct 2026, D1).** Three levels, each optional: the backup file (live), anonymous sync, then an account. Everything below lives in a **Sync** section at the top of Settings, plus one quiet status line; nothing interrupts practice.

1. **Turn on sync.**
   - Settings, sync off: "Use 99ile on your phone and laptop. No sign-up and no email. Your progress is copied to our server so it is safe if this browser is cleared." Button: **Turn on sync**.
   - Next screen, the **recovery code**: 16 characters in four groups (letters and digits that are hard to confuse, no O/0 or I/1). "This code is the only way to get your progress back if you lose this device. Write it down or save it somewhere safe. We can't see it or reset it." Buttons: **Copy**, **Download as a file**, then **I've saved it** (the one filled button). Also offers "Download backup" as a second safety net.
   - After that, sync runs by itself. Settings shows "Synced just now" and the device list.
2. **Link another device, with a QR code.**
   - On the device that has sync: **Link a device** shows a QR code and, under it, the same 8-character code. Valid for 10 minutes, usable once; **New code** makes another. Shown at every screen size (phone to phone works too).
   - On the new device: Settings → **I use 99ile on another device** → **Scan the code** (opens the camera inside 99ile) or **Type the code**. A laptop types the 8 characters; a phone scans.
   - Why scan inside 99ile and not with the phone's camera app: on iPhone the camera opens Safari, which keeps its data apart from 99ile on the Home Screen. The QR still holds a link, so on Android or a laptop opening it also works; the link page checks whether it opened in the right place and says what to do if not.
   - Scan screen copy: "Point your camera at the code on your other device. Only scan a code shown on your own device." Camera refused: "Camera is off for 99ile. Type the code instead."
   - If the new device already has progress: "This device has progress too (12 sets, 30 errors). Add it to your synced progress?" **Add it** merges both; **Start fresh here** keeps only the synced progress (offers a backup file of this device first).
   - Every linked device then shows the new one in its device list ("Chrome on Android, linked just now").
3. **Get it back with the recovery code.** On any device: **I use 99ile on another device** → "Use a recovery code instead" → type the code → progress comes back, merged with anything on that device as above. A new recovery code can be made from Settings; the old one stops working at once (with a confirm).
4. **Devices.** Settings lists devices by a name the browser suggests ("Chrome on Android", "Safari on Mac"), with "last synced". **Remove** stops that device syncing (it keeps its own copy).
5. **Status.** One line in Settings and under the Today header only when something is wrong: "Last synced 3 hours ago. Your progress is safe on this device. Try again." Offline is not an error; sync catches up when the connection is back.
6. **Turning sync off on this device:** "Keep a copy here, or clear this device?" Synced progress stays on the server for the other devices.
7. **Import and clear, while sync is on.** Restoring a backup file **adds** its progress to the synced progress instead of replacing it (replacing would delete things on every device). "Delete all my data" asks: **This device only** or **Everywhere** (this device, the server and every linked device, after typing DELETE).
8. **Account (B7).** "Sign in with Google" in the Sync section, for students who would rather not keep a code. On sign-in, "Save this device's progress to your account?" Yes imports everything the device has into Postgres. If the account already has progress from another device, the two are merged, never overwritten. A device that already syncs anonymously moves under the account with everything linked to it. Email sign-in follows later (D9). Details: `docs/architecture.md` §5.2.

**Words used on screen.** "Sync", "recovery code", "link a device". Not "identity", "token", "cursor" or "server" outside one sentence of explanation.

**Acceptance.**
- Phone and laptop both offline each record a set; when both come online, both sets appear on both, nothing lost or doubled.
- Two devices tick blocks on the same day offline: after sync, both ticks are there.
- The same push sent twice stores one copy; an edit made after syncing beats the copy it replaced, even when the other phone's clock is a day ahead.
- Recovery code on a fresh browser restores everything; a used link code and an old recovery code are refused.
- Phone to phone and laptop to phone link by scanning the QR inside 99ile, including an iPhone Home Screen app; phone to laptop links by typing the code.
- Restoring a backup while synced adds, and never deletes on other devices.
- A removed device stops syncing and keeps its copy.
- Sync never blocks a page or a practice set; with the server down, every page works and the status line says when it last synced.
- Signing in with Google on a device with local progress and choosing "Save" puts every record in the account; a second device signing in sees it all, plus its own merged in.
- Export my data and delete my data work for a synced student (DPDP Act 2023 and Rules 2025).

#### F39. Report a problem and feedback inbox — Next (step 3)
"Report a problem" on a question goes to `POST /v1/feedback` when the server is on (question id, what is wrong from four choices, an optional note; no personal data), and stays a prefilled GitHub issue when it is not. The owner reads reports from a simple list (a SQL view first, no admin page).
**Acceptance.** A report arrives with the set and question id; sending ten in a minute is refused politely; with the server off, the GitHub link still works.

#### Privacy page — Live (22 Oct 2026)
A plain page at `/privacy`: what is stored on this device, what sync sends (progress only, no name, no email until an account), what the server logs and for how long (IP addresses kept 7 days), how to export and delete, and who to contact. Linked from the footer and the Sync section.

### AI (step 3b and step 7)
All AI features follow principle 3. They need the backend (the API key stays on the server) and they all have a fallback that does not need AI.

| # | Feature | Step | Input | Output, checked by code | Fallback |
|---|---|---|---|---|---|
| 35 | Explain my mistake | 3b | the question, the chosen and right options, their written explanations | 2 to 4 sentences on the gap between the two, naming passage evidence | the written explanation, which already exists |
| 36 | Summary feedback | 3b | passage or article, the student's summary, the model summary | the four checklist items filled in, with one line each | the self-check, as today |
| 34 | Article to RC set | 7 | an article the student pastes | 4 or 5 questions in the library's JSON shape, every option explained | the library |
| 48 | Coach and weekly narrator | 7 | the computed weekly review and recommendations, not raw history | a short paragraph in plain words, with the numbers it was given | the computed review |
| 53 | Quiz me on this article (Chrome extension) | 7 | the article the student is reading on any site (text they select, or the page's main text), sent only on a tap | 3 to 5 RC-style questions with explanations, answered in a side panel; results saved to 99ile and its Reading journal | "Save this article" to the Reading journal for a summary, as today |

**F53 in more detail.** The student reads an editorial on a news site, taps the 99ile button, and gets CAT-style questions on that very passage: main idea, inference, tone, the author's view. It turns everyday reading (the advice every topper gives) into practice and checks comprehension, not only speed. It replaces the "Practice this article" bookmarklet (40). Needs: the AI service (step 3b), a Manifest V3 extension with a side panel, the page text read only after a tap (`activeTab`), a daily cap, and the article never stored on the server, only the questions and answers. It works signed in by sync (the extension links like a device). Open questions: copyright of long excerpts (send only what is needed, never republish), and which sites block text extraction.

**Acceptance for all.** Output must pass a schema check or it is not shown. Each result records the model and prompt version. Students can flag a bad answer. Daily caps per student and in total.

### Sections (steps 4 and 5)

#### F52. From a mistake back to its question — Live (22 Oct 2026): links, "Try it again" and "Last time"; filters and Progress links next
**Problem.** An Error log entry says "Climate economics, Q3 (Practice)" and the reasoning, but not the question itself. A week later the student has forgotten the passage and cannot go back to it: the entry keeps only text, no link (`ErrorEntry.src`). Error-log advice from GMAT tutors (Magoosh, Manhattan Prep, Target Test Prep, GMAT Club) agrees: a log is useful when it is reviewed, and the best review is re-solving the question without looking at the explanation; Duolingo built its "Mistakes" practice after learners asked to revisit past errors.
**What the student gets.**
- Every entry made from practice (RC, VA, CR, sectional) has **See the question**: the review of that attempt, opened at that question, with the passage, what they chose and the explanation.
- **Try it again**: the same question with the answer hidden, as the redo queue shows it; the result counts in the redo queue.
- Old entries are linked too where possible (RC, VA and CR entries are matched by title and date); hand-written and mock entries stay as they are.
- Filters on the Error log: question type, trap, cause, and "still happening" (a pattern seen in the last 2 weeks) vs "fixed".
- From Progress, a weak spot ("Inference, 45%") leads to its entries in the Error log, and "Practise these" to those questions in the redo queue.
**Data.** `ErrorEntry` gains optional `q` (question key: `rc:<set>:<i>`, a VA item key, `cr:<id>`) and `att` (the attempt id, or `sectional:<id>`), written by `rcError`, `vaError`, `crError` and the sectional review. They sync like any field. No server change.
**Done when** an RC, VA, CR and sectional mistake each open their question from the Error log, on a phone, offline.

#### F51. History: what I did each day — Next (after F52)
**Problem.** Every attempt, drill, test and minute is saved, but scattered: Today shows only today, the RC library shows best scores, the Report card shows totals. There is no answer to "what did I do on Tuesday?" or "which passages have I done?". Students also lose heart when a streak breaks; keeping the record visible after a break is what habit apps do.
**What the student gets.**
- `/history` (Progress group in the menu): days, newest first. Each day: minutes studied (focus timer and ticked blocks) and every item done, with its score and time: RC sets by passage title, VA and CR drills, speed tests, sectionals, mocks logged, summaries written, words added, mistakes logged. Each item opens its review.
- At the top, the last 12 weeks as a strip of days, shaded by minutes; tap a day to jump to it. A missed day is simply empty, never red.
- Filters: section and kind. Search (⌘K) finds a passage by title and opens it in History.
- On Today, "Done today: 2 RC sets, 1 VA drill, 54 min" links to today in History.
**Data.** None new: built from what is already saved, so it works offline and syncs as it is. Built per month, lazily, so a year of history stays fast on a phone.
**Done when** a student can find a passage they did a month ago in under 10 seconds, on a phone.

#### F21 to F23. DILR — Planned (step 4, Dec 2026 to Jan 2027)
- Learn: set types (arrangement, games and tournaments, DI charts, Venn, networks, scheduling) and how to pick sets to attempt.
- Plan blocks and resources, with the existing default minutes (45 weekday, 90 weekend).
- Set player: one data set with 4 to 6 questions, MCQ and TITA, on the RC player's shell (palette, timer, review, redo, Error log). 20 original sets to start.
- **Acceptance.** Every set's answers are checked by tests, TITA answers compare as numbers, and the redo queue, report card, mock wizard and weekly review include DILR without new code paths beyond the section's types.

#### F27. One daily budget — moved to step 4 (was step 6)
Once two sections are live, "I have 90 minutes today" must split itself: by phase, by the weakest section (from the report), and by what is due (redo, focus drill). The student can still set minutes per section.
**Acceptance.** The split always adds up to the budget, gives every live section at least 15 minutes when the budget allows, and is a tested pure function.

#### F24 to F26. Quant — Planned (step 5, Jan to Mar 2027)
Learn tab with topic weightage, a formula sheet per topic, plan blocks, topic drills and timed 10-question sets with TITA input. Maths shown with KaTeX, loaded only on Quant pages.

---

### Learning loop, next ideas (22 Oct 2026)

#### F54. Weak-spot drill — Planned (after F51)
"10 minutes on inference with extreme wording": a short drill built from the student's own pattern (F42) mixing their old misses of that kind (answer hidden) with new questions of the same type and trap. Ends with "before and after" on that skill (F44). No AI needed; uses the redo queue, the Error log and the library.

#### F55. Passage recap before a retry — Planned (after F54)
Before re-solving an RC question from the Error log or the redo queue, a three-line reminder of the passage (what the author claims and how strongly), so the student answers the question, not a half-remembered passage. The student's own summary is used when they wrote one; otherwise the set's model summary, folded until asked for.

## 4. Planned later
Short; each gets a full entry here when it moves into the next two steps.

| # | Feature | Step |
|---|---|---|
| 16 | Working-professional mode | 6 |
| 17 | Flashcards from mistakes | 6 |
| 28 | Mock tracker by section (folds into F12 when DILR and Quant ship) | 6 |
| 30 | Calendar export of the whole timetable | 6 |
| 8, 9 | Past-paper catalogue, library filters by question type | 8 |
| 10 | SEO: pre-rendered routes, sitemap | 8 |
| 18 | Share card | 8 |
| 37, 38 | Daily leaderboard, accountability partner link | 9 |
| 40 | "Practice this article" bookmarklet (becomes the Chrome extension, F53) | 7 |
| 49 | Privacy-friendly usage counts (which pages are used; no per-student data) | open decision |
| 31, 32 | B-school calculator, exam calendar | 10 |
| 20 | Hindi explanations | when there is help |
| — | WAT and PI, community, story submissions | later |

## 5. Not doing
- A general chatbot. AI has a job tied to the student's own practice, or it is not built.
- Copying real CAT questions or coaching material into the site.
- Mandatory sign-up, ads, or selling data.
- Counting hours studied as progress on its own.
