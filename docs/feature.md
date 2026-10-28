# 99ile: features (specify)

What 99ile does and will do, for whom, and how we know each feature works.
This is the first of four documents. Read them in this order:

| Step | Document | Answers |
|---|---|---|
| Specify | `docs/feature.md` (this file) | What and why: the student's problem, the feature, its acceptance checks |
| Plan | `docs/plan.md` (order and dates), `docs/architecture.md` (how it is built) | When, in what order, on what technology |
| Analyze | `docs/analyze.md` | Do the spec, the plan and the code agree? What is missing or risky? |
| Implement | `docs/implement.md` | Branch by branch: files, data changes, tasks, tests, commit message |

Feature numbers match the numbered list in `docs/plan.md` Part 1 (1 to 40). Features added on 21 Oct 2026 from the research review are 41 to 49; F50 came from the step 3 research. F56 to F78 (thinking practice, reminders, community, the manager track) came from the owner's proposals of 23 Oct 2026, reviewed in `docs/research/beyond-cat.md`.
Last updated 23 Oct 2026.

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
8. **Practise decisions, not only answers.** Which set to attempt, which method to use, when to move on: the exam rewards these as much as solving, so 99ile trains and measures them (F56, F60).
9. **Learn together, solve independently.** Other students help after you have tried, never before: a question's discussion opens only once you attempt it (F67).
10. **Reminders help, never guilt.** At most one study reminder a day, at the time the student chose, saying what to do next; a missed day is never red (F65, F66).

**How 99ile grows (decided 23 Oct 2026).** One learning engine, in this order:
- **CAT Coach** is the product: VARC, DILR and Quant with the mistake loop. DILR and Quant come first, before anything below.
- **Habit**: the restart plan, the inbox and reminders (F64 to F66), and one daily puzzle (F61).
- **Community**, built around our own questions: discussions under each question, the doubt forum, private study groups (F67 to F70).
- **Beyond CAT, the manager track**: WAT, GD, PI and case practice in the interview season (Dec 2027 to Mar 2028), then MBA-ready basics, daily dilemmas and a founder simulator before B-school starts (F72 to F78).

**North-star metric.** Mistakes re-solved correctly on a later try, per active student per week. It measures the loop, not visits.

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
| Practice | RC player | 50 original sets (9 genres), including AI and technology, every option explained with a trap label, RC of the day with a stable rotation, summary step after the set |
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
| Practice | Practice by section (D39) and the RC library | `/varc/practice`, `/dilr/practice`, `/quant/practice` from one page: section dividers with what is waiting, the next thing to do highlighted, then everything else. VARC: today's picks, drills, sectional, library. DILR: LR sets by type with the next untried set, past papers. `/practice` opens the last section used |
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
| Sync | Status and prompts | "Sync devices" with its status in the bottom sidebar account icon and phone menu; one invite on an empty device, one nudge after real practice; search finds sync |
| Data | Export and delete everywhere | Download what the server has (also a backup); delete from the server and this device |
| Data | Privacy page | `/privacy`: what is stored, where, how long, rights, grievance contact; sync for 18 and over |
| Loop | From a mistake back to its question (F52) | "See the question" opens the old attempt at that question; "Try it again" with the answer hidden; "Last time" shows the old reasoning after a retry |
| Security | Bot check | Cloudflare Turnstile before sync is turned on; rate limits on codes; only hashes of secrets stored |

---

## 3. Built in step 2, being built and next

Steps 2f and 2g below are live; their entries stay as the spec the code was built to. Step 3 is next.

### Step 2f: mock analysis and the weekly review

#### F12. Mock analysis wizard — VARC live; section layouts in progress
**Problem.** Students take a coaching mock, look at the score, and move on. The marks they could have saved (silly errors, skips they could do, time sinks) are never counted, so the next mock repeats them.

**Story.** As a student who just finished a mock, I want a 15 to 20 minute guided review that shows where my marks went and gives me at most three things to change, so the next mock is better.

**Scope.**
- Works for: a coaching mock or real past paper taken outside 99ile (entered by hand), and an in-app timed sectional (filled in from its record).
- Sectional test kinds are VARC, DILR and Quant. A full mock, past paper or official IIM mock is analysed one section at a time, selected in Basics.
- Steps:
  (Original VARC method: `docs/research/step-2f.md`; section counts and editable layouts: `docs/research/mock-review-sections.md`.)
  1. **Basics.** Name, date, test kind and section, then an editable section layout. VARC starts at 24 questions: 4 passages × 4 and 8 VA questions by type. DILR starts at 22 questions across 5 sets (5, 5, 4, 4, 4), with an editable set style. Quant starts at 22 with an editable recent-paper topic estimate: Arithmetic 9, Algebra 7, Geometry and mensuration 3, Number systems 2, Modern mathematics 1. DILR set styles and Quant topics vary; these are starting layouts, not fixed CAT rules. Optional: the attempts planned before the mock.
  2. **Question grid.** One cell per question, grouped by passage/VA type, DILR set style, or Quant topic. For a mock taken elsewhere, no result is selected by default; a question left unmarked counts as skipped. Tap a cell to set right, wrong, skipped or not reached. DILR and Quant questions also let the student mark MCQ or TITA, since wrong TITA answers do not lose a mark. A right answer can be marked **slow**. A wrong answer gets one cause: misread the question, missed a qualifier, read too much into it, fell for a trap option, did not know the method, careless slip, guessed, should have skipped it, ran out of time. A skipped or unreached question gets "Could you have got it?" yes or no; "no" is a **good skip**. For an in-app sectional, show a link from the current question to its full review (question, chosen answer, correct answer and time), then return to the saved analysis.
  3. **Re-solve.** The doable skips are listed; the student tries them now, untimed, before reading solutions, and ticks the ones solved. This step can be skipped.
  4. **Where the marks went.** Computed: the score; marks lost by group (careless, reading the options, method, choices, time, doable skips), good skips, slow right answers; by type; attempts against the plan; for in-app sectionals, time on right, wrong and given-up questions; this mock against the last three; and "with no careless slips and the doable skips solved, you would have scored X".
  5. **Three actions at most.** Proposed from the findings, each with its reason and evidence (e.g. "Para jumbles: 3 wrong of 4, two marked careless. Drill 6 para jumbles this week."). The student keeps, edits or removes each. Kept actions become recommendations (F43), and one can become the focus of the week (F13).
  6. **Optional:** add the wrong questions to the Error log in one tap (source "Mock: name, Q7").
- Saving also adds the usual row to the mocks chart (or updates the logged row it explains), so nothing is logged twice. A review of a mock taken elsewhere also adds practice rows by type, so the report card sees it.
- The Mocks tab lists logged mocks not yet analysed ("Analyse it"), and once there are two or more reviews, marks lost by group across the last five.

**Acceptance.**
- VARC, DILR and Quant each render their own question categories and default counts; changing a layout regenerates the grid without losing unchanged answers.
- A full review with 6 wrong and 3 skipped takes under 3 minutes of tapping on a phone (grid plus causes), not counting reflection.
- "Where the marks went" adds up: right × 3 − wrong MCQ = the score shown; careless + time + did not know + not reached covers every lost question.
- From an in-app sectional, the grid is filled (status and seconds per question, question type) and only the causes are asked; each question can be opened in its full review at the exact question, both pages scroll to that question below the summary, and returning restores that question in the analysis draft.
- No actions are proposed from fewer than 2 questions of a kind; the student can always write their own.
- Works offline, survives a reload mid-way (draft), and is in backup and restore. Old backups load with no reviews.
- One filled button per step; 44px tap targets; no text under 14px; both themes; 412 and 1440 wide.

**Not in scope.** Importing mock PDFs or scraping coaching portals.

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

#### F33 and F47. Sync without sign-up, then accounts — Live without sign-up (22 Oct 2026); Google sign-in built 24 Oct 2026 (B7), live once the Google client is set up
**Where students meet sign-in (decided 24 Oct 2026).** Signing in is an offer, never a gate (principle 2), and is always one tap away:
- **`/signin`**, the one page every "Sign in" leads to. Split layout adapted from 21st.dev's SignInPage: on the left, a laptop and a phone showing the same study days, drawn in code in the brand blue; on the right, the form. Google's own "Continue with Google" button (white or near-black with the colour G, the one outlined control on the site, as Google's branding asks). Content: "Keep your progress safe", three reasons (every device, a new or wiped phone loses nothing, only email and name), **Continue with Google** as the page's one filled button, then "Use a code from another device" and "Continue without signing in". Google returns here; the question about this device's progress is asked here; then the student goes back to the page they came from (`?then=`). Signed in, it says so and offers Continue.
- **Header**: on a phone, a person icon (signed out) or your initial in a circle (signed in) beside search and the menu; on the desktop home header, "Sign in". A green dot shows sync is on. It opens the **account menu** (a popover on wide screens, a bottom sheet on a phone): signed in, your name, email and last sync, then Sync now, Link a device, Your devices and Sign out; syncing with a code, the same plus "Sign in with Google"; signed out, Continue with Google, "I use 99ile on another device" (the code form) and "Sync without an account". The menu links open Settings at the right step (`/settings?sync=link` or `?sync=join`).
- **Sidebar and phone menu**: the bottom account icon opens `/signin` when signed out or `/you` when signed in; the phone menu's sync row reads "Sign in / Save progress everywhere" when signed out, your name and "Synced 2 minutes ago" when signed in.
- **One nudge**: after five practice sessions, once, on Today: "Keep your progress safe. Sign in with Google so a new or wiped phone loses nothing."
- **Settings → Sync** stays the full control: devices, recovery code, sign out, delete.
The signed-in email and name are kept with the device's sync state, so the header shows them on the first paint without asking the server.
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

#### F39. Report a problem and feedback inbox — Built 23 Oct 2026 (B6)
"Report a problem" on a question goes to `POST /v1/feedback` when the server is on (question id, what is wrong from four choices, an optional note; no personal data), and stays a prefilled GitHub issue when it is not. The owner reads reports from a simple list (a SQL view first, no admin page).
**Acceptance.** A report arrives with the set and question id; sending ten in a minute is refused politely; with the server off, the GitHub link still works.
**As built.** An inline form under each question in a review (not a dialog): wrong answer key, unclear question or option, typo, something else, and an optional note (1,000 characters). The page is stored without its query string. If sending fails, the GitHub link is offered. Ten reports an hour per network; with sync on, the report keeps the identity (set to null if it is deleted). Queries to read and close reports: `server/README.md`, "Problem reports".
**How the owner hears about reports: a daily digest (B6b and B6c, built 23 Oct 2026).** Once a day a GitHub Actions job reads new reports and sends them two ways: **an email to 99ile.team@gmail.com with the students' notes** (Gmail with an app password, B6c), and **a comment on one public GitHub issue**, "Problem reports from students" (label `problem-reports`), with only the question id, the kind of problem, how many and when, **never a note**, because the repository is public. Reports in a digest move from `new` to `seen`; the digest also says how many seen reports are still not closed. No new reports, no message. Closed reports are deleted a year after closing (clean-up job), and the privacy page says what a report holds, who reads it and for how long.
**Acceptance.** A new report appears in the next morning's email and issue exactly once; if both fail it stays `new` for the next day; if one fails the run shows red; the issue text never contains a note; the email always does.

#### F79. Admin page — Built 24 Oct 2026 (B8)
**Problem.** Reading and closing reports with SQL works for one owner but is slow, and no one else can help.
**What the owner gets.** `/admin`, only for signed-in staff (B7 accounts with the `feedback.read` and `feedback.resolve` permissions, `docs/database.md` §4):
- **Reports**: open reports grouped by question, newest first, with the note, the page and a link that opens the question in review; mark seen, fixed or won't fix (writes `handled_by`, `handled_at`, and an audit event `feedback.resolved`).
- **Overview**: counts only, no student data (D14): identities, devices, sync pushes and errors this week, reports open, database size against the free 500 MB.
- Later, when needed: suspend an identity (abuse), the community review queue (F70).
**Data.** `support.feedback.handled_by` (FK to `account.users`), the `access` schema with roles and permissions (`docs/database.md` §4). No student's answers are ever shown (D14).
**Done when** a staff account can close a report from a phone, a non-staff account gets 404 on `/admin` and its API, and every change is in the audit log.
**Design (24 Oct 2026).**
- **Who sees it.** `/admin` loads only when opened and is not in the menus. The account menu shows **Admin** to staff only (`GET /v1/admin/me` answers with their permissions; everyone else gets 404). A non-staff visitor sees the normal "Page not found".
- **Reports tab.** Open (new and seen) or Closed. Reports are **grouped by question**: the question's name (RC set title and question number, VA kind and topic, or the CR id), how many reports of each kind, and every note with its page and date. One set of buttons acts on the whole group (D32): **Open the question** (the redo page with only that question), **Mark seen**, **Fixed**, **Won't fix**; a closed group has **Reopen**. Groups with more reports come first, then the newest. On a phone it is one column and the buttons wrap.
- **Overview tab.** Counts only (D14): students with sync, active this week, accounts, devices, synced records, new this week, sync refusals this week, reports open and closed this week, and the database size against the free 500 MB.
- **Every change** writes `handled_by`, `handled_at` and one `feedback.resolved` audit event per report (`actor_type = 'admin'`, the new status in `meta`).
- **Granting staff.** `make grant-prod EMAIL=you@gmail.com` (`cmd/grant`, owner login, after the person has signed in once), audited as `system`. `-revoke` takes it back.

#### Privacy page — Live (22 Oct 2026)
A responsive page at `/privacy` with a quick summary and grouped sections: what is stored on this device, what sync sends (progress only, no name, no email until an account), what the server logs and for how long (IP addresses kept 7 days), how to export and delete, and who to contact. Uses readable typography and a two-column layout on wide screens, then one column on phones. Linked from the footer and the Sync section.

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

#### F52. From a mistake back to its question — Live (22 Oct 2026): links, "Try it again" and "Last time"; filters and Progress links built 23 Oct 2026
**Problem.** An Error log entry says "Climate economics, Q3 (Practice)" and the reasoning, but not the question itself. A week later the student has forgotten the passage and cannot go back to it: the entry keeps only text, no link (`ErrorEntry.src`). Error-log advice from GMAT tutors (Magoosh, Manhattan Prep, Target Test Prep, GMAT Club) agrees: a log is useful when it is reviewed, and the best review is re-solving the question without looking at the explanation; Duolingo built its "Mistakes" practice after learners asked to revisit past errors.
**What the student gets.**
- Every entry made from practice (RC, VA, CR, sectional) has **See the question**: the review of that attempt, opened at that question, with the passage, what they chose and the explanation.
- **Try it again**: the same question with the answer hidden, as the redo queue shows it; the result counts in the redo queue.
- Old entries are linked too where possible (RC, VA and CR entries are matched by title and date); hand-written and mock entries stay as they are.
- Filters on the Error log: question type, trap, cause, and "still happening" (a pattern seen in the last 2 weeks) vs "fixed".
- From Progress, a weak spot ("Inference, 45%") leads to its entries in the Error log, and "Practise these" to those questions in the redo queue.
**As built (23 Oct 2026).** Filters live in the URL (`/errors?sec=VARC&t=RC&trap=…&cause=…&status=open|fixed`; `t=RC` means every RC kind). **Fixed**: the question was answered right on its latest try after the mistake. **Still happening**: not fixed, and the same type with the same trap or cause was logged in the last 14 days. Each entry shows its status. "Try these again" puts up to 10 matching questions in the redo queue, due today (`/practice/redo?k=a,b,c`). Patterns have "See these mistakes"; report card rows (by question type, RC kinds) and weak spots (type or cause) link to their entries when there are any.
**Data.** `ErrorEntry` gains optional `q` (question key: `rc:<set>:<i>`, a VA item key, `cr:<id>`) and `att` (the attempt id, or `sectional:<id>`), written by `rcError`, `vaError`, `crError` and the sectional review. They sync like any field. No server change.
**Done when** an RC, VA, CR and sectional mistake each open their question from the Error log, on a phone, offline.

#### F51. History: what I did each day — Built 24 Oct 2026
**Problem.** Every attempt, drill, test and minute is saved, but scattered: Today shows only today, the RC library shows best scores, the Report card shows totals. There is no answer to "what did I do on Tuesday?" or "which passages have I done?". Students also lose heart when a streak breaks; keeping the record visible after a break is what habit apps do.
**What the student gets.**
- `/history` (Progress group in the menu): days, newest first. Each day: minutes studied (focus timer and ticked blocks) and every item done, with its score and time: RC sets by passage title, VA and CR drills, speed tests, sectionals, mocks logged, summaries written, words added, mistakes logged. Each item opens its review.
- At the top, the last 12 weeks as a strip of days, shaded by minutes; tap a day to jump to it. A missed day is simply empty, never red.
- Filters: section and kind. Search (⌘K) finds a passage by title and opens it in History.
- On Today, "Done today: 2 RC sets, 1 VA drill, 54 min" links to today in History.
**Data.** None new: built from what is already saved, so it works offline and syncs as it is. Built per month, lazily, so a year of history stays fast on a phone.
**Done when** a student can find a passage they did a month ago in under 10 seconds, on a phone.
**Design (24 Oct 2026).** Built with the house rules (`docs/design/redesign-plan.md`) and shadcn parts already in the project; 21st.dev's catalog was down when checked.
- **Phone first.** One column: one card you swipe between the strip (Days) and minutes per week as bars (Weeks), with "Days | Weeks" to tap and two dots, then the numbers, filters and day cards. A swipe alone is easy to miss, so the labels are always there. On a desktop the strip sits beside a panel with four numbers (days studied, time, sets and tests, days in the last week) and minutes per week as bars; the filters and day cards share one column below.
- **The strip** is 12 columns (weeks) by 7 rows (Monday to Sunday), each cell a square that fills the width on a phone (24 px from a tablet up), shaded in four steps of the primary colour by minutes (or by items when no minutes were ticked). Days with activity are buttons that jump to the day; empty days are plain and never red. Month names above, a "Less / More" key below, today ringed.
- **Day cards**: "Tuesday, 21 Oct" with "Yesterday" or "Today", then minutes and how many items. Each item is one row: an icon for its kind, the title (passage title, drill kinds, mock name), the result ("3 of 4 right, 7 min") and a chevron; the row opens the review. Mistakes logged and redo answers are one summary row per day each, not one row per question.
- **Filters**: a toggle group of kinds (All, Practice, Tests, Reviews, Writing, Mistakes) and a "Find a passage" box that filters by title. The URL keeps both (`?k=tests&q=climate`) and `?d=2026-10-21` opens a day.
- **Fast**: items are built once from the saved state; 30 active days render first, then "Show older days".
**Search (⌘K).** A "Your practice" group finds passages, drills, sectionals, mocks and summaries by title and opens that day in History. Search words now also match their simple forms, so "syncing" finds Sync, "linking" finds Link a device; the sync actions (link a device, recovery code, download, delete) are findable by name.
**Recent practice on Progress → Log** shows the last 10 sets with their percentage, a "Show all" button for the rest, and a link to History. Log stays the place to add outside practice and delete wrong entries, so every set must stay reachable there (History cannot delete).
**No backend needed, now or at scale (decided 24 Oct 2026).** History and search read this device's own data, which sync already copies to every device; nothing new is stored or sent. A student's data is capped by sync (20,000 records, 8 MB), so building the list in the browser stays fast: a year of heavy use (1,800 attempts) builds in about 10 ms; the test allows 150 ms for slow CI machines. Server search is needed only for what is shared between students: community posts (F67, F68) will use Postgres full-text search then.

#### F21 to F23. DILR, logical reasoning first — Planned (step 4a LR from Nov 2026; DI in step 4, Dec 2026 to Jan 2027)
Research: `docs/research/lr.md`. Set format: `docs/content/lr-format.md`. **LR comes first (D37):** the owner has LR sets ready, and four of five sets in CAT 2025 slot 1 were LR or numbers-driven LR. The DILR page goes live with LR; DI is marked "December".
- **F23, LR set player (first).** One set per screen: the story, numbered clues and any table on one side (on a phone, a tab), the questions on the other; MCQ and TITA; a timer against the set's target minutes; a scratch grid the student can fill (line, circle or matrix, from the set's type). Review shows the solution steps, the final grid, and the clues each question used. Wrong answers go to the redo queue and Error log with LR causes (misread condition, missed case, wrong assumption, calculation, time sink), as RC does.
- **Built for arrangement sets, 24 Oct 2026:** the player at `/practice/lr/:id` (story and numbered clues beside the questions, MCQ and TITA, CAT marking with no penalty on TITA, the D31 timer, a scratch pad drawn from the set's layout, draft kept), and a review with a step-by-step walkthrough that fills the seats in on a row or round-table picture (highlighted as each step places them, Play to step through, still under reduced motion), the final table, each question's explanation with the clues it used, and one tap to the Error log. Five owner sets plus the example, checked by brute force. **Games and tournaments, 28 Oct 2026:** five owner sets with a results-grid picture (W, D or L, team against team) and a knockout bracket; the scratch pad now sits above the question with a notes box (D40). **All six LR types, 28 Oct 2026:** caselets (tables), routes (network picture), set theory and Venn and syllogism (Venn picture), 31 sets. **Not yet:** the redo queue for LR questions, LR causes in the Error log beyond the post-mortem, and DILR in the timetable.
- **Opened early, 24 Oct 2026 (owner):** the DILR page is up with Learn, Practice, Watch and Toppers tabs and 34 checked resources, as a new section status `open` (page and resources, not in the timetable). DILR joins Today once the player and plan blocks exist.
- **F21, LR Learn tab.** One guide per type (arrangement, selection, distribution, ranking, tournament, scheduling, binary logic, Venn, routes, quant-based LR), on the VARC guide pattern: what it looks like, the representation to draw, where to start, traps, one worked example from our own sets, three links. Plus eight short concept pages that cut across types: reading conditions, drawing first, where to start, case splitting, question stems, counting invariants, max and min, set selection.
- **F22, resources and plan blocks.** The free resources in the research note (past papers, topic banks, logic grids, videos, two books), and daily LR blocks with the existing default minutes; templates and grid puzzles in Foundation, CAT-level sets from Build, timed past papers from the Mock phase.
- **Acceptance.** Every set's answers are checked by tests (and by a solver where the set allows), TITA answers compare as numbers, and the redo queue, report card, History, weekly review and search include LR without new code paths beyond the section's types. 20 sets at launch, 40 by January.

#### F83. Clue translator — Planned (step 4a, after the player)
**Problem.** Misreading a condition is the most common LR error, and "only if", "unless" and "not both" trip even strong students; no CAT site drills reading clues on its own.
**What the student gets.** Three minutes a day: an English clue, and the student marks what it means on a small grid or picks the rule ("A only if B": if A then B). Wrong readings are named (reversed, negated, "immediately" read as "somewhere", left and right swapped when facing the centre). Clues come from our sets, so a translated clue later meets the student in a real set.
**Done when** every clue kind in the research note has at least ten items with checked meanings, and a student's misreadings show as a pattern in Progress.

#### F84. Must, could, cannot — Planned (step 4a)
Two or three finished cases of a set shown side by side; the student sorts six statements into must be true, could be true, cannot be true. Trains the question stems that lose solved sets.
**Done when** each statement's bin is computed from the cases by code, never typed by hand.

#### F85. First move — Planned (step 4a, once 20 sets exist)
A set opens on an empty grid; the student picks the clue to start with, or the cell that is now certain. The answer shows how many cases each choice would open (from the solver), so "start with the most restrictive clue" becomes something they see.
**Done when** the cases per clue come from the set's solver and the best choice is never a guess.

#### F86. Set post-mortem — Planned (step 4a, with the player)
After every LR set, two minutes, prompted (self-explanation, `docs/research/lr.md` §4): the first key deduction, where the time went, and the clue misread or case missed (one tap each where possible). Saved with the attempt; feeds the Error log, the redo queue and set selection (F56). Skippable, never a gate.
**Done when** the prompts take under two minutes on a phone, and History shows the deduction next to the attempt.
**Built 24 Oct 2026** with the player: three rows of taps in the review (the clue that opened the set, where the time went, what cost an answer and which clue), each saved at once onto the attempt; History shows "Opened with clue N".

#### F87. What if one clue changes — Planned (step 4b or later, once 30 sets exist)
The same solved set with one clue changed or dropped; the student says what moves. CAT's "if additionally…" questions are this skill. Each variant's answers come from the set's solver.

#### F88. Draw it first — Planned (step 4b or later)
60 seconds: choose the right skeleton (line, circle, matrix, points table, timeline, Venn, graph) for a set before solving; the chosen skeleton opens as the scratch grid. Trains representation, the step toppers do first.

#### F27. One daily budget — moved to step 4 (was step 6)
Once two sections are live, "I have 90 minutes today" must split itself: by phase, by the weakest section (from the report), and by what is due (redo, focus drill). The student can still set minutes per section.
**Acceptance.** The split always adds up to the budget, gives every live section at least 15 minutes when the budget allows, and is a tested pure function.

#### F24 to F26. Quant — Planned (step 5, Jan to Mar 2027)
Learn tab with topic weightage, a formula sheet per topic, plan blocks, topic drills and timed 10-question sets with TITA input. Maths shown with KaTeX, loaded only on Quant pages.

---

### Practice clock (24 Oct 2026)
**Problem.** RC sets and VA and CR drills have a target time, but the clock counted up for ever: a page left open recorded hours, which spoiled time per question, History minutes and the weekly review.
**Rule.** At the target (7 minutes for an RC set, per item for drills) a bar says "Time is up. Submitting in 60 s" with **Keep going** and **Submit now**. With no answer the set is submitted as it stands. After Keep going, or for a set reopened past its target, the hard stop is three times the target, with the same 60 seconds of warning and no further extension. A set left and reopened later keeps its saved time (the clock pauses while away). The timed sectional is unchanged: 40 minutes, then it submits itself.
**Code.** `timeUpState` and `TimeUp` in `pages/practice/common.tsx`, used by the RC, VA and CR players; tested in `timeup.test.ts` and checked in a browser (bar at the target, submitted at the hard stop).

### Learning loop, next ideas (22 Oct 2026)

#### F54. Weak-spot drill — Planned (after F51)
"10 minutes on inference with extreme wording": a short drill built from the student's own pattern (F42) mixing their old misses of that kind (answer hidden) with new questions of the same type and trap. Ends with "before and after" on that skill (F44). No AI needed; uses the redo queue, the Error log and the library.

#### F55. Passage recap before a retry — Planned (after F54)
Before re-solving an RC question from the Error log or the redo queue, a three-line reminder of the passage (what the author claims and how strongly), so the student answers the question, not a half-remembered passage. The student's own summary is used when they wrote one; otherwise the set's model summary, folded until asked for.

---

### Thinking practice in DILR and Quant (23 Oct 2026; built with steps 4 and 5)
These are what make the DILR and Quant sections ours rather than another question bank. Review and reasons: `docs/research/beyond-cat.md`.

#### F56. Set Selection Arena (DILR) — Planned (step 4)
**Problem.** Students who solve sets well still lose marks by picking the wrong ones: a set that looks easy turns into casework, a doable one is skipped. Nothing trains or measures this choice.
**What the student gets.**
- A round shows four unseen sets. Two minutes to look, then rank them and guess each one's time and marks.
- They solve under the clock (40 minutes for the round, as in the exam's DILR section) and may switch sets at any time.
- Afterwards, guess against reality: "Set C looked easy and took 19 minutes", "you skipped B, which most students finish in 9", "switching at minute 12 would have earned 6 more marks".
- **Selection accuracy**, a score for how well their ranking matched what happened, tracked over rounds on Progress (F44) and used by the mock wizard (F12) for DILR.
**Data.** Each DILR set carries `estMinutes` and `difficulty` from the author; once synced attempts exist, both are recalibrated from students' median times (aggregates only). A round is a record (`arenaRounds`) with the ranking, guesses, times per set and switches.
**Needs.** About 40 DILR sets, so rounds do not repeat too soon (step 4 starts with 20; the Arena opens at 32).
**Done when** a round can be played on a phone, the debrief names the set that cost the most time with its numbers, and selection accuracy moves across three rounds.

#### F57. DILR Replay: see the deduction happen — Planned (step 4, three formats)
**Problem.** A written DILR solution shows the final grid, not how anyone got there. Students learn answers, not how to represent the problem.
**What the student gets.**
- An interactive board for three formats first: **scheduling** (people × slots), **grouping** (people into teams) and **tournaments** (results table). Tap to place, cross out, or mark "must be".
- Clues reveal one by one in "learn" mode, each with why it matters and how many arrangements remain ("8 → 2").
- After solving, **Replay** plays the chain of deductions in order; the step that cut the most is highlighted.
**How.** Each set in these formats is stored as constraints; a small solver (TypeScript, tested) computes the remaining arrangements after each clue, proves the set has one answer, and drives the replay. The same solver powers the Arcade's puzzles (F61).
**Done when** every set in the three formats has a solver test proving a unique answer, and the replay shows the arrangement count after each clue.

#### F58. Quant Debugger — Planned (step 5)
**Problem.** Quant practice starts from "get the answer". Students who get it wrong rarely find where their reasoning broke, so the same slip comes back.
**What the student gets.**
- **Find the first wrong step**: a worked solution with one subtle mistake; tap the first wrong line and say why (from a short list). Then the correct line.
- After a wrong Quant answer, "What went wrong?" with Quant causes alongside F42's: concept misunderstood, words turned into the wrong equation, algebra or calculation slip, wrong method, right method but too slow.
- Three short follow-ups aimed at that exact cause, then the cause joins the pattern view (F42) like any other.
**Data.** Debugger items are content (`content/quant/debug.json`): steps, the wrong step's index, the reason, the fix. Causes extend the existing cause list.
**Done when** 30 Debugger items ship with tests that each has exactly one marked wrong step, and a Quant cause appears in the patterns on Progress.

#### F59. Estimate first — Planned (step 5)
Before working a Quant question, an optional 10-second step: pick a range or cross out impossible options ("a price up 20% then down 20%: above, at or below where it started?"). Afterwards the student sees whether the estimate alone would have found the answer. A short drill of estimate-only rounds (percentages, ratios, fractions, orders of magnitude) works as a 3-minute warm-up on Today.
**Done when** the estimate step can be switched off, and Progress shows how often estimation alone was enough.

#### F60. Why this method? — Planned (step 5)
After every Quant question: the method used in our solution, the faster one when it exists (substitution, options, approximation), and **when the shortcut fails**. The student says which method they used; Progress tracks accuracy and time by method. A **Same maths, different world** mode asks the same idea (say, successive percentages) in five settings (a discount, revenue growth, a margin, a survey, a CAT word problem) to show whether the student sees the structure or only a familiar story.
**Done when** every Quant question has a method note and the same-maths drill exists for five topics.

#### F62. Data Detective — Planned (step 8)
A chart or table with a claim beside it ("revenue up 25%, so the business is doing better"). The student sorts statements into: follows from the data, does not follow, needs more information. Joins DI with critical reasoning (step 2d) and trains the habit of questioning a conclusion. Written content, no AI; 20 items to start.

#### F63. Reality to DILR — Planned (step 7, with F53)
The Chrome extension (F53) grows from articles to tables: a points table, a results table or a chart on a page becomes a small DI caselet. Numbers are copied from the page and every answer is **computed by code** from them, never by the model; the model only words the questions. Questions that cannot be checked are not shown.

### Habit: the inbox, reminders and the restart plan
Review: `docs/research/beyond-cat.md` §2. Practice counts only when a set, drill, timed session or mistake review is finished; opening the app is not studying.

#### F61. Thinking Arcade: one daily puzzle — Planned (step 4b, four kinds; more in step 8)
**Problem.** Students want a light way to start the day; generic brain games do not train CAT skills and are everywhere already.
**What the student gets.**
- **One daily puzzle**, the same for everyone, 3 to 5 minutes, from four kinds that are DILR formats: **tournament table** (rebuild results from clues), **schedule shuffle** (place events under rules), **Queens** (one per row, column and region), and a **number grid** (KenKen-style sums and products).
- Each puzzle names its skill ("casework on a results table") and ends with "Now try a real set of this kind" (F57).
- A small practice pool of past daily puzzles; no infinite play, no punishing timers. A share card with the time and no spoilers (F18).
**How.** Puzzles are generated by code from a daily seed and checked by the F57 solver for exactly one answer, so they cost nothing to write and are tested like content. Works offline.
**Measured, not claimed.** We compare unseen DILR set scores of students who play with those who do not before saying the puzzles help. Sudoku and chess are not built: off-skill and available everywhere.
**Done when** 365 seeds each produce a puzzle with one answer (a test), and the daily puzzle is the same on two devices.

#### F81. "You": a profile page — Part 1 built 24 Oct 2026 (B8); part 2 planned with community, step 6b
**Problem.** What describes a student is spread over four pages: the account and devices in Settings, the target in Plan or Progress, daily minutes in Plan, the streak and totals on Today, Progress and History. A signed-in student taps their initial in the header and expects one page about them.
**Part 1, private (with B8 or straight after it).** `/you`, opened from the avatar in the header and the bottom sidebar account icon:
- At the top: name, email, member since (from the account), or "Not signed in" with Sign in.
- **Your CAT**: exam year, target percentile, attempt (first or repeat), student or working. One place to change them; the plan, the report card and the personal home (F80) read them. Kept as synced records, so they work offline and without an account.
- **Your study so far**: streak, days studied, questions done, with links to History and Progress.
- **Account**: devices, recovery code, sign out, download or delete data (moved from Settings, which keeps a link).
**Part 1 as designed (24 Oct 2026).**
- `/you` works for everyone. Signed in: your initial, name, email and "Member since October 2026". Synced with a code: "Not signed in" and Sign in with Google. Sync off: "Your progress is on this device only" and Continue with Google.
- The account is a clear responsive hero with an account/sync status and one sign-in action when needed. CAT preferences and study stats sit side by side on wide screens and stack on phones; stats are grouped into easy-to-scan tiles.
- **Your CAT**: "Preparing for CAT 2027" with the expected date, then three choices: target percentile in VARC (the same setting as Progress, Target), **first attempt or taken before**, and **studying or working**. The last two start unset. Kept in the `profile` sync record (`about`), so they sync and work offline. **The exam year is not a choice yet** (D34): every plan, phase and countdown is built for CAT 2027.
- **Your study so far**: streak, days studied, questions answered and minutes logged, with links to History and Progress.
- **Account and sync**: the sync card moves here from Settings (D35). Settings keeps one line linking to it, and old `/settings#sync` links open `/you#sync`.
- Opened from the account menu (the name at the top, and "You") and from the bottom sidebar account icon.
**Part 2, public and off by default (with community, F67 to F70, step 6b).** A nickname and a short bio; who can see the profile (only me, my study groups, everyone); accepted answers and helpful votes. Never public: email, scores, mistakes or answers (D14). Stored in `account.profiles` (per identity, `docs/database.md` §6).
**Done when** part 1 replaces the scattered settings with one page that works on a phone, and a change of target there shows at once in the plan and the report card.

#### F82. A plan that fits you — Planned (part 1 step 4b, Jan 2027; part 2 step 6, Mar 2027). Research when it starts
**Problem.** Every student gets the same plan: CAT 2027, 45 minutes on a weekday, 90 at the weekend, the same split of work. A final-year student with four free hours, a working professional with 40 minutes on the metro, and a repeater aiming for the 99th percentile need different days. The You page (F81) already asks two of the questions, but nothing reads the answers yet.
**What the student gets.**
- **A one-minute setup**, on the first visit (skippable) and always editable on You: which CAT (year), studying, working or both, time on a weekday and at the weekend, target percentile (overall, and per section once DILR and Quant are live), first attempt or a repeat, and where they stand now (just starting, some prep, or taking mocks, with the last mock score).
- **The plan follows the answers.**
  - Time: daily minutes start from the answers instead of 45 and 90; working students get short blocks (20 to 30 minutes) and a "commute set", one RC on the phone (absorbs plan item 16).
  - Split: the one daily budget (F27) gives more time to the weaker section and to the target's gap (from the report card and mock scores), and says why in one line.
  - Pace: phases are worked out from the chosen exam's date, so a CAT 2028 student gets a long foundation and a CAT 2027 repeater moves to mocks sooner. A first attempt starts with method and type guides; a repeater starts with a diagnostic sectional.
  - Reality check: after each mock (F12), the target is compared with what the scores reach (percentile estimator, item 7): "On track", or "At this pace, about the 92nd; here is what closes the gap".
- **No AI needed**: rules first, written down and tested. The AI coach (F48, step 7) later explains the plan in words; it never makes it.
**Part 1 (step 4b, Jan 2027, with the personal home F80 and after the daily budget F27 in step 4):** the setup, time and split from the answers, short blocks for working students, and the first-visit flow. This is when most CAT 2027 students arrive.
**Part 2 (step 6, Mar 2027):** the exam year as a real choice (phases from any exam date; replaces D34), the commute set, the diagnostic for repeaters, and the reality check after mocks.
**Data.** The `profile` sync record grows (`about`: exam year, work, time, target per section, level); no new server tables. Works offline and without an account.
**Research to do first** (`docs/research/personal-plan.md`): how coaching institutes and toppers split time by profile; how many hours working candidates really have; how other apps onboard without losing people (question count, skip rates); the percentile tables per section for DILR and Quant.
**Done when** two students with different answers get different, explained plans; changing an answer on You changes tomorrow's plan; skipping the setup gives today's plan unchanged; and every rule has a test.

#### F80. Personal home for a returning student — Planned (step 4b)
**Problem.** The home page is written for a first visit: what 99ile is, the countdown, the passage of the day. A student who comes back every day scrolls past the pitch to reach their work.
**What the student gets.** When this device has progress (signed in or not): "Good evening, Jappreet" (the name only when signed in), then the next step (F41) with its button, what is due (redo, focus of the week), yesterday in one line from History (F51), and the streak. The pitch, the about section and the updates move below, one tap away. A first visit sees today's home page, unchanged.
**Done when** a returning student starts their next task from the first screen of the home page on a phone, and a first visit looks exactly as now.

#### F66. Restart plan — Planned (step 4b; no backend)
**Problem.** After a few missed days, Today still shows the full plan plus catch-up, and the student closes the tab.
**What the student gets.** After three or more days without practice, Today opens with "Welcome back. 15 minutes today": one short passage, three redo questions and one mistake review, then the normal plan from tomorrow. The streak is forgiving: one free day a week, shown as "rest", never red.
**Done when** a student who comes back after a week sees one short plan, not a backlog.

#### F64. Inbox — Planned (step 4b)
A bell in the header with an unread count. Holds reminders, replies and accepted answers (once F67 and F68 exist), group invites, and the weekly review. Each item opens what it is about. Works with sync on (the server keeps the inbox); with sync off it shows only what this device produced.
**Done when** each item opens its target, read state syncs across linked devices, and the bell costs nothing on pages that never open it (loaded idle).

#### F65. Study reminders and streak protection — Planned (step 4b)
**What the student gets** (all off until turned on in Settings):
- **Daily reminder** at a chosen time, only if today's practice is not done, naming the next step (F41) and opening it.
- **Streak at risk**: one reminder at most, two hours before the day ends, only with an active streak.
- **Weekly review ready** (F13) on Sunday.
- Quiet hours (default 23:00 to 07:00), pause for a week, and at most **one** study reminder a day across all kinds.
**Channels.** The inbox for everyone with sync on; **web push** for students who allow it (on iPhone only after 99ile is added to the Home Screen, iOS 16.4+, so the screen says so); the existing calendar reminder (`.ics`) as the no-account fallback. Email only after accounts (B7), and only for the weekly review.
**How.** The server knows practice is done from synced records with today's date. A scheduled job (every 15 minutes) finds students whose reminder time has passed, checks preferences, quiet hours and what was already sent (an idempotency key per student, kind and day), then writes the inbox item and sends the push.
**Done when** a student who practised gets no reminder, one who did not gets exactly one at their time (checked across two devices), and turning reminders off stops them within 15 minutes.

### Community: learn together, solve independently
Review: `docs/research/beyond-cat.md` §2. Needs accounts (B7, Google sign-in): posting is tied to an account, never to an anonymous sync identity. 18 and over, as sync. Text and maths (KaTeX) first; images later.

#### F70. Safety and moderation — Planned (step 6b; before anything is public)
Community rules shown before the first post; report on every post and answer (spam, wrong, rude, off-topic); block a user; new accounts limited (3 posts a day for the first week); links from new accounts held; the owner's review queue (a list, as for F39); hide on three independent reports until reviewed. A published grievance contact that acknowledges within 24 hours and resolves within 15 days (IT Rules 2021; check the current text before launch). No direct messages.
**Done when** a reported post can be hidden and restored from the review queue, and every rule above has a server test.

#### F67. Discuss this question — Planned (step 6b)
**Problem.** A student who disagrees with our explanation, or found a faster way, has nowhere to say it; the next student with the same doubt cannot see it.
**What the student gets.**
- Under every question in a review: **Discussion**, which opens only after the student has attempted that question (the spoiler gate).
- Posts are a doubt ("why not B?") or **another way** (a different method). Votes; the best other way shows under our solution.
- "Our explanation is wrong" goes to F39 as well, so a real error gets fixed in the content.
**Why first.** Every question already has a page and traffic, so there is no empty forum to fill, and every thread is about something specific.
**Done when** a discussion is invisible before an attempt and visible after, on every section's questions.

#### F68. Doubt forum — Planned (step 6b)
**What the student gets.**
- **Ask from a mistake**: from the Error log, one tap turns an entry into a doubt carrying the question link, the chosen and right options, and the student's own reasoning and cause (F42), so helpers see the thinking.
- Ask any doubt (section, topic, text and maths). Answers, votes, the asker accepts one; disputed answers can be flagged.
- Filters: section, topic, unanswered, solved. **Unanswered first** on the forum's home, so helping is the default action.
- **Teach-back**: an accepted answer counts as a review of that question in the helper's redo queue.
- A solved doubt links back to practice: "Try a similar question".
**Done when** a doubt can be asked from an Error log entry in two taps and an accepted answer reaches the asker's inbox (F64).

#### F69. Study groups — Planned (step 6b, after F67 and F68)
Private, invite-only groups of 2 to 30 (friends, classmates, a study partner). Join by an invite link that expires, optional approval by the owner, membership checked by the server on every read (a secret link alone is not privacy). A shared weekly goal, the group's doubts, and a **group streak** kept if most members practised that day. A leaderboard **inside the group only** replaces the global daily leaderboard (37) and the accountability partner link (38): a partner is a group of two.
**Done when** a non-member cannot read anything in a group even with its id, and leaving a group removes access at once.

#### F71. Public communities — Later (only if moderation keeps up)
Open groups such as "CAT 2027 Quant". Built only once F70's queue is handled within a day for two months running; public spaces need moderators, and spam is what killed old CAT forums.

### Beyond CAT: the manager track (after CAT 2027)
For CAT students after the exam, then for anyone who wants to think like a manager. It follows the student's real calendar: results and shortlists in January, WAT, GD and PI from January to March, admits by May, B-school starts in June or July. Replaces "WAT and PI" in Planned later.
These are ideas, not specs yet. **Each is researched when it moves into the next two steps** (what B-schools test, what toppers and interviewers say, what exists free), then written up in full here. The question to answer in that research is under each one.

**Season 1: getting in (Dec 2027 to Mar 2028)**

#### F72. The 60-second brief — Later (step 10)
A chart, a short business problem or an article; the student gives the main finding, the evidence and one recommendation, in 60 seconds spoken or 120 words written. Feedback against a fixed rubric (clarity, structure, evidence, assumptions, length): by self-check first, by AI later (principle 3). Doubles as WAT practice with topics from the reading journal.
*Research:* which WAT formats the IIMs and other schools use now, and how they are marked.

#### F76. PI prep from your own story — Later (step 10)
The questions a panel asks come from the student's own form: "Why MBA?", "Why leave your job?", their degree, hometown, hobbies, work. The student fills a short profile; 99ile builds a question bank from it, with a method for each kind (a structure for "tell me about yourself", how to handle "I don't know"). Practice by recording an answer on the phone, then a self-check against a rubric; AI feedback later. The recording never leaves the device.
*Research:* PI transcripts shared by students (question kinds by school), what makes an answer land.

#### F77. GD practice — Later (step 10)
A topic (often from the news), two minutes to build points on both sides, then a structure: open, add a new point, bring in data, summarise. Reuses critical reasoning (step 2d): find the assumption in the other side's point. A study group (F69) can run a live GD on a call, with 99ile giving the topic, the timer and a rubric for peer marks.
*Research:* which schools still run GDs or replaced them (some use group tasks or case discussions), how they are marked.

#### F74. Mini case interview — Later (step 10)
A business question ("a café's sales are up but profits are down: why?"). The student structures it first (a tree of possible causes), asks for data, which arrives step by step as in a real interview, reads the numbers and ends with a recommendation. Scored on the reasoning (structure complete, the right data asked for, the numbers read correctly, a clear call), not on matching one answer. Uses Quant (F60) and DI skills.
*Research:* how consulting firms and B-school panels run cases for freshers; open case books we may learn from (never copy).

**Season 2: ready for the MBA (Apr to Jun 2028)**

#### F78. MBA-ready basics — Later
The gap between an admit and day one: reading a balance sheet and an income statement, unit economics, basic statistics, spreadsheets (formulas, a pivot table, a chart), writing a one-page memo. Short lessons, each with a task on real-looking data, in the same practice-and-mistake loop.
*Research:* what B-schools send admits as pre-MBA work, and where first-year students say they struggled.

#### F73. Manager's daily dilemma — Later
A five-minute scenario with a budget, competing priorities and partial data: launch A or B, which complaint to fix first, quality against delivery time. The decision's consequences are shown and the trade-off explained. Some cases have a stronger answer by the numbers; others reward a clear justification within the limits. A daily habit for the track, like the daily puzzle (F61) is for CAT.
*Research:* business-school simulations (for example Wharton's short simulations) and what makes a decision game teach, not just reward guessing.

#### F75. Founder simulator — Later (last)
From a raw idea to a small experiment: pick a customer, name the problem, design a test, set a price, estimate costs, decide what to build first. Each choice has consequences (good margins but weak demand; a survey that does not test the real assumption). Teaches hypothesis testing, unit economics and priorities, not guessing the most profitable option.
*Research:* lean start-up teaching tools and whether students finish long simulations; built only if F72 to F74 are used.

**Rule for the track.** It shares the engine (the mistake loop, the inbox, groups) and never moves into CAT practice pages. A season starts only if the CAT Coach is in good shape and the season before it was used.

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
| 37, 38 | Daily leaderboard, accountability partner link: **folded into study groups (F69)**, a leaderboard inside the group only | 6b |
| 40 | "Practice this article" bookmarklet (becomes the Chrome extension, F53) | 7 |
| 49 | Privacy-friendly usage counts (which pages are used; no per-student data) | open decision |
| 31, 32 | B-school calculator, exam calendar | 10 |
| 20 | Hindi explanations | when there is help |
| — | Story submissions | later |
| — | WAT and PI: now the manager track (F72 to F78); community: now F67 to F71 | 6b, 10 |

## 5. Not doing
- A general chatbot. AI has a job tied to the student's own practice, or it is not built.
- Copying real CAT questions or coaching material into the site.
- Mandatory sign-up, ads, or selling data.
- Counting hours studied as progress on its own.
- Direct messages between students, a general social feed, follower counts.
- Paid tutors, coaching institutes or ads in the community.
- Generic brain games (Sudoku, chess) or claims that puzzles raise CAT scores before we have measured it.
- More than one study reminder a day, reminders in quiet hours, or streak countdowns meant to cause worry.
