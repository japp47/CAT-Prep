<img src="public/logo.svg" alt="99ile" height="56">

**99ile** is a free, open CAT preparation website built with React, TypeScript, Vite, Tailwind CSS and shadcn/ui. It works on desktop and mobile, in light and dark.

- **Today's timetable.** A daily plan built from your phase and the time you have. Defaults are 1 hour on weekdays and 2 hours on Saturday and Sunday. Change any single day (Rest, 30 min to 3 hours, or a custom number), set a different time per day of the week, or lower a whole date range for an exam week. Missed core tasks come back as a catch-up.
- **Plan.** Five phases to CAT 2027 (Foundation, Build, Apply, Mock phase, Taper), with time presets and a preview of a typical weekday and Saturday in each phase.
- **Sections.** VARC is live with about 130 curated resources, a guide for each question type (method, traps, a worked example and links), free question banks grouped by type, a reading rotation and topper data. DILR and Quant are placeholders that are ready to fill.
- **Practice.** 45 original RC sets (4 or 5 questions each, an explanation for every option, a trap label on every wrong one), an RC of the day with an archive, a daily VA drill with all four CAT types (para summary, sentence insertion, odd sentence out, para jumbles) plus custom drills, a timed 40-minute VARC sectional on a CAT-style screen, and a reading speed test. Results go into Progress, a wrong answer goes to the Error log in one tap, and tapping a word in a reviewed passage saves it to Words. A streak with two shields a month counts any day with activity. Every question has a "Report a problem" link that opens a prefilled GitHub issue.
- **Redo queue.** Every question missed in Practice comes back after 1, 3 and 7 days, until it is right three times in a row.
- **Focus timer.** Start a timer on any timetable block. It keeps running across pages, suggests a break every 25 minutes, and records real minutes against the plan.
- **Track.** Practice accuracy by question type, a mock score chart, an error log and spaced-repetition flashcards.
- **Explore.** Important updates (marked official or expected), the CAT pattern and yearly timeline, other MBA exams, guides and topper stories.
- **Your data stays in the browser** (localStorage), with backup download and restore in Settings.
- **Installable and offline.** A web app manifest and a small service worker (written by `vite.config.ts` at build time, no extra dependency) let students install the site and open it without internet. Settings also adds a daily study reminder to Google, Apple or Outlook calendar.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # planner, practice, content and redo-queue tests
npm run catalog    # rebuild the content catalog after editing practice content
npm run build      # production build in dist/
```

## Go API

The initial Go server exposes `GET /healthz` and does not use a database.
Requires Go 1.23 or newer:

```bash
cd server
go run ./cmd/api
```

It listens on port `8080` by default (`PORT` can override it). Check that it is running:

```bash
curl http://localhost:8080/healthz
```

See [server/README.md](server/README.md) for details and Go test commands.

## Project layout

```
server/            Go API skeleton and health endpoint
src/
  data/           exam dates and phases, updates, other exams, guides, stories, roadmap
  sections/       one folder per CAT section
    types.ts      SectionDef, Block, Resource
    index.ts      section registry (VARC live, DILR and Quant "soon")
    varc/         resources, phase templates, concept notes
  planner/        engine that fits blocks into the day's minutes, plus tests
  practice/       RC sets (rc/), VA paragraphs (va/), daily picks, streaks, redo queue, attempt recording, plus tests
  lib/            dates, saved state, store, preferences, focus timer, install and calendar helpers
  pages/          one file per route
  components/     layout, page building blocks (kit.tsx), chart, resource list, focus bar
    ui/           shadcn/ui components (button, tabs, sheet, dialog and so on)
  index.css       Tailwind setup and design tokens: colours, fonts, type scale
pwa/sw.js         service worker template, filled in at build time
docs/plan.md      product and backend plan
```

### Posting an update

Add an entry at the top of `src/data/updates.ts`. Use `status: "official"` only once the exam body has published it.

### Adding DILR or Quant

1. Create `src/sections/dilr/` with `resources.ts` (categories and resources), `plan.ts` (a `template(date, ctx)` returning `base` and `extra` blocks per phase, see `varc/plan.ts`) and an `index.ts` exporting a `SectionDef`.
2. In `src/sections/index.ts`, replace the placeholder with it and set `status: "live"`.

The Today page, Plan page, navigation, Progress and Error log pick it up automatically. Each section gets its own time settings.

### Adding practice content

- **RC set:** add an object to the right topic file in `content/rc/`, with 4 or 5 questions (the timed sectional uses the first 4, as CAT does). Each option has `t` (text), `why` and a `trap` on every wrong one; `answer` is the index of the one option without a trap. `npm test` checks every set (4 or 5 questions, one answer each, a trap on every wrong option, valid proof paragraphs).
- **Critical reasoning question:** add to `content/cr/items.json`, in the same option format, with `type`, the `stimulus`, its `conclusion` quoted exactly (null for inference and paradox) and a one-line `takeaway`.
- **VA paragraph:** add to `content/va/paragraphs-2.json` (new paragraphs go in JSON; the first 50 are in `src/practice/va/paragraphs.ts`): four or five core sentences in order (five-sentence ones also give the jumble and odd-sentence views in `pj` and `ooo`), a cue for each, an odd sentence, an insertion sentence with its gap, and four para summary options, each with `t` (text), `why` and a `trap` on every wrong one. Each paragraph becomes a para summary, a para jumble, an odd sentence out and a sentence insertion. The tests also check that the right summary is not usually the longest option, so students cannot guess by length.
- **Before publishing new content,** have a second person check the answer keys. Students can report problems from any question's review.

After adding or changing content, run `npm run catalog`. It writes `src/practice/catalog.gen.ts` (titles, genres, word counts, dates and which file holds each set), which the main bundle uses. The passages load only when a practice page opens, one content file at a time: an RC set loads just its own genre file, the VA drill just the paragraphs (`src/practice/bank.ts`, `content.ts`). A new file in `content/rc/` also needs a line in `src/practice/rc/index.ts`; a test checks the two agree. `npm run build` regenerates it too, and `npm test` fails if it is out of date.

Give every new RC set or VA paragraph `since: "YYYY-MM-DD"`, set to the day after you publish. The RC of the day and the daily VA drill rotate in cycles, and new content joins at the next cycle after that date, so days already served never change. A test freezes the first days of the series to catch mistakes.

### Moving the exam date

When CAT 2027 is announced, update `EXAM_ISO`, `EXAM_CONFIRMED` and, if needed, the phase dates in `src/data/exam.ts`.

## Checks and deploy

**CI.** `.github/workflows/ci.yml` runs on every pull request and every push to `main`: typecheck, tests, a production build, a check that the generated catalog is committed, and `npm run size`, which fails if the first download grows past its budget (main script 150 KB and stylesheet 20 KB gzipped, fonts 100 KB, and 70 KB for the largest practice content file, since each page loads only the content it shows). In repo Settings → Branches, add a rule for `main` that requires the **CI / check** status, so only green code is merged.

**Deploy: Cloudflare Pages.** Cloudflare builds and publishes the site itself on every push to `main`, and gives every pull request its own preview link. One-time setup:

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → pick this repo.
2. Production branch `main`. Framework preset: None. Build command `npm run build`. Output directory `dist`. Node comes from `.nvmrc` (22).
3. Save and deploy. The site goes live at `99ile.pages.dev`.

`public/_redirects` sends every page route to the app, and `public/_headers` sets the security headers (including a Content Security Policy) and caching: hashed files in `/assets/` are cached for a year, and the service worker is checked on every visit so a new version always reaches installed apps.

Students' saved progress lives in their browser and belongs to the site's address. Moving to another address later means everyone has to download a backup and restore it, so pick the final address before sharing the link widely. A custom domain such as `catprephub.in` costs about ₹500 to ₹900 a year; add it in the Pages project under Custom domains, and HTTPS is free.
