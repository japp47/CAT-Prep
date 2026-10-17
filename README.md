# CAT Prep Hub

A free, open CAT preparation website built with React, TypeScript and Vite. It works on desktop and mobile.

- **Today's timetable.** A daily plan built from your phase and the time you have. Defaults are 1 hour on weekdays and 2 hours on Saturday and Sunday. Change any single day (Rest, 30 min to 3 hours, or a custom number), set a different time per day of the week, or lower a whole date range for an exam week. Missed core tasks come back as a catch-up.
- **Plan.** Five phases to CAT 2027 (Foundation, Build, Apply, Mock phase, Taper), with time presets and a preview of a typical weekday and Saturday in each phase.
- **Sections.** VARC is live with about 120 curated resources, concept notes, a reading rotation and topper data. DILR and Quant are placeholders that are ready to fill.
- **Track.** Practice accuracy by question type, a mock score chart, an error log and spaced-repetition flashcards.
- **Explore.** Important updates (marked official or expected), the CAT pattern and yearly timeline, other MBA exams, guides and topper stories.
- **Your data stays in the browser** (localStorage), with backup download and restore in Settings.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # timetable engine tests
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
  lib/            dates, saved state, store, per-browser preferences
  pages/          one file per route
  components/     layout, links, chart, resource list
```

### Posting an update

Add an entry at the top of `src/data/updates.ts`. Use `status: "official"` only once the exam body has published it.

### Adding DILR or Quant

1. Create `src/sections/dilr/` with `resources.ts` (categories and resources), `plan.ts` (a `template(date, ctx)` returning `base` and `extra` blocks per phase, see `varc/plan.ts`) and an `index.ts` exporting a `SectionDef`.
2. In `src/sections/index.ts`, replace the placeholder with it and set `status: "live"`.

The Today page, Plan page, navigation, Progress and Error log pick it up automatically. Each section gets its own time settings.

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
