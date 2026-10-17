# CAT Prep Hub

A free, open CAT preparation website built with React, TypeScript and Vite. It works on desktop and mobile.

- **Today's timetable.** A daily plan built from your phase and the time you have. Defaults are 1 hour on weekdays and 2 hours on Saturday and Sunday. Change any single day (Rest, 30 min to 3 hours, or a custom number), set a different time per day of the week, or lower a whole date range for an exam week. Missed core tasks come back as a catch-up.
- **Plan.** Five phases to CAT 2027 (Foundation, Build, Apply, Mock phase, Taper), with time presets and a preview of a typical weekday and Saturday in each phase.
- **Sections.** VARC is live with about 130 curated resources, a guide for each question type (method, traps, a worked example and links), free question banks grouped by type, a reading rotation and topper data. DILR and Quant are placeholders that are ready to fill.
- **Practice.** 40 original RC sets (4 questions each, an explanation for every option, a trap label on every wrong one), an RC of the day with an archive, a daily VA drill with all four CAT types (para summary, sentence insertion, odd sentence out, para jumbles) plus custom drills, a timed 40-minute VARC sectional on a CAT-style screen, and a reading speed test. Results go into Progress, a wrong answer goes to the Error log in one tap, and tapping a word in a reviewed passage saves it to Words. A streak with two shields a month counts any day with activity. Every question has a "Report a problem" link that opens a prefilled GitHub issue.
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

## Project layout

```
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
  components/     layout, links, chart, resource list, focus bar
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

- **RC set:** add an object to one of the files in `src/practice/rc/`. Build options with `o(text, why, trap)`: leave the trap off the one right answer. `npm test` checks every set (4 questions, one answer each, a trap on every wrong option, valid proof paragraphs).
- **VA paragraph:** add to `content/va/paragraphs-2.json` (new paragraphs go in JSON; the first 50 are in `src/practice/va/paragraphs.ts`): four core sentences in order, a cue for each, an odd sentence, an insertion sentence with its gap, and four para summary options, each with `t` (text), `why` and a `trap` on every wrong one. Each paragraph becomes a para summary, a para jumble, an odd sentence out and a sentence insertion. The tests also check that the right summary is not usually the longest option, so students cannot guess by length.
- **Before publishing new content,** have a second person check the answer keys. Students can report problems from any question's review.

After adding or changing content, run `npm run catalog`. It writes `src/practice/catalog.gen.ts` (titles, genres, word counts and dates), which the main bundle uses; the full passages load as a separate file only when a practice page opens. `npm run build` regenerates it too, and `npm test` fails if it is out of date.

Give every new RC set or VA paragraph `since: "YYYY-MM-DD"`, set to the day after you publish. The RC of the day and the daily VA drill rotate in cycles, and new content joins at the next cycle after that date, so days already served never change. A test freezes the first days of the series to catch mistakes.

### Moving the exam date

When CAT 2027 is announced, update `EXAM_ISO`, `EXAM_CONFIRMED` and, if needed, the phase dates in `src/data/exam.ts`.

## Hosting for free

All of these are free for a site like this. Each one rebuilds automatically when you push to GitHub.

| Option | Steps | URL you get |
| --- | --- | --- |
| **Cloudflare Pages** (recommended) | dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → pick this repo. Framework preset: Vite. Build command `npm run build`, output `dist`. | `cat-prep.pages.dev` |
| **Vercel** | vercel.com → Add New Project → import the repo. It detects Vite. `vercel.json` already handles page routes. | `cat-prep.vercel.app` |
| **Netlify** | app.netlify.com → Add new site → Import from Git. Build `npm run build`, publish `dist`. `public/_redirects` already handles page routes. | `cat-prep.netlify.app` |
| **GitHub Pages** | Repo Settings → Pages → Source: GitHub Actions. The workflow in `.github/workflows/deploy-pages.yml` builds and deploys on every push to `main`. | `japp47.github.io/CAT-Prep` |

A custom domain such as `catprephub.in` costs about ₹500 to ₹900 a year from any registrar. All four hosts above connect it and provide HTTPS for free.
