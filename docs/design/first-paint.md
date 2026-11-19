# A first paint without the script (F97), planned and built 19 Nov 2026 (D115)

Students start arriving in January (step 4b). On a phone over slow 4G the site stays blank until the main script has
downloaded and run; the script is also within 0.8 KB of its budget, so the next feature has no room. This plan does
two things: it takes what the first screen does not need out of the main script, and it puts a static frame of the
page into `index.html`, so a phone shows the site before any script runs.

## Measured (19 Nov 2026)

**First paint on a phone** (390 px, slow 4G as Lighthouse defines it: 150 ms round trip, 1.6 Mbps; a CPU six times
slower; cold cache; median of five runs, `paint.mjs` in the session's scratchpad):

| Page | First paint (background only) | First contentful paint (anything readable) |
|---|---|---|
| Home `/` | 1.76 s | 3.67 s |
| Today `/today` | 1.76 s | 3.61 s |
| Practice `/practice` | 1.76 s | 3.60 s |

For about two seconds the student sees an empty coloured page. The first paint waits for the stylesheet (23 KB, render
blocking); the content waits for the main script.

**What the main script carries** (157.9 KB gzipped, attributed per source file with the build's source map):

| Part | gzipped | Needed for the first screen? |
|---|---|---|
| react-dom, react, scheduler | 57.9 KB | yes |
| react-router (three packages) | 20.9 KB | yes |
| tailwind-merge | 8.6 KB | yes (every component's classes) |
| **`practice/catalog.gen.ts`** | **9.9 KB** | **no** |
| `sections/varc/plan.ts`, `dilr/plan.ts`, `varc/links.ts`, `data/papers.ts` | 6.2 KB | no |
| `practice/record.ts`, `redo.ts`, `bank.ts`, `content.ts`, `va/build.ts`, `planner/engine.ts`, `planner/auto.ts` | 5.4 KB | no |
| `data/updates.ts` | 1.5 KB | no (the updates list is far down Home) |
| `lib/notify.ts` | 1.2 KB | no (a reminder visit can be recorded after idle) |
| the shell itself: App, Layout, Home, kit, Sidebar, header, footer, state, icons | about 25 KB | yes |

**Why the catalog is in it.** Home, the sidebar and the header import `sections` for names, status and practice types.
`sections/index.ts` also holds each section's plan template (`varc/plan.ts`, `dilr/plan.ts`), which imports
`practice/daily.ts` (the RC and VA of the day), which imports the catalog. And the sidebar's "0 of 90 minutes" ring runs
the planner (`buildDay`) during the first render. A test (`practice/catalog.test.ts`) already keeps the full passages
out; nothing keeps their index out.

A first experiment that only made `AutoTicker` and `RedoSeeder` lazy saved 2.1 KB: the catalog stayed, through the
chain above.

## The plan

### 1. A smaller main script (target: under 135 KB, budget unchanged at 155)
- **Section metadata apart from plan templates.** `SectionDef.template` moves out of `sections/*/index.ts` into a
  planner-side map (`planner/templates.ts`: section id to template), imported only by the planner. Home, the sidebar,
  the header and search keep importing `sections` for names, status, practice types and resources, which no longer pull
  the plan, the daily picks or the catalog.
- **Today's minutes after the page.** The sidebar's ring (`Sidebar.tsx`, `DayRing`) gets its planned minutes from a
  small lazy module run with `lib/idle.ts` `whenIdle`; until then the ring shows its empty state at the same size, so
  nothing moves.
- **Background work after idle.** `AutoTicker` and `RedoSeeder` (effects with no screen) mount after `whenIdle` in
  `Layout.tsx` and `PanelLayout.tsx`, as one lazy module.
- **Home's lower parts.** `LatestUpdates` and `data/updates.ts` join the lazy `home/More` chunk; `lib/notify`'s
  `takeReminderVisit` runs after idle in `main.tsx`.
- **A guard.** `practice/catalog.test.ts` gains a check that `sections/*`, `components/Layout.tsx`,
  `components/Sidebar.tsx`, `components/SiteHeader.tsx` and `pages/Home.tsx` import neither `catalog.gen`, `daily`,
  `planner/engine` nor `planner/auto`, so the gain does not erode one import at a time.

### 2. A static frame in `index.html`
- **What it shows.** The real top bar (the 99ile logo and name, at the same height as `SiteHeader`) and a quiet page
  frame: on wide screens on app pages, the sidebar's tone column; on Home, a blank hero block. No text that could be
  wrong, no spinner. React replaces the frame when it renders into `#root` (`createRoot` clears it), so there is nothing
  to remove by hand.
- **Styled inline.** A small `<style>` in `<head>` with the site's colour tokens for both themes (`--background`,
  `--card`, `--sidebar`, ink), sized to match `Layout.tsx` (header 56 px, sidebar 288 px from 1024 px). It does not wait
  for the stylesheet. The fonts stay as they are (no preload; preloading was tested slower, D54).
- **The right theme before paint.** A student who chose dark on a light system (or the reverse) would see a flash of the
  wrong theme. A tiny inline script in `<head>` reads `localStorage["cat-prep-pref:theme"]`, sets `data-theme` on
  `<html>`, and adds a class for the page shape (`/` is the landing page without the sidebar; everything else has it).
  The site's security policy forbids inline scripts (`script-src 'self'` in `public/_headers`), so the policy lists the
  script's `sha256-…` hash; a test computes the hash from `index.html` and checks that `_headers` carries it.
- **What it changes.** Expected: the first contentful paint moves from about 3.6 s to the moment the stylesheet arrives
  (about 1.8 s on the slow phone), and the frame does not jump when React takes over.

## Not in this version
- Inlining the whole stylesheet or the fonts.
- Server-side rendering or prerendered pages (the site stays one static `index.html`).
- Replacing tailwind-merge or the router.

## Checks
- `npm run size`: the main script under 135 KB.
- The first paint measured again on the slow phone for `/`, `/today` and `/practice`: the frame visible before the
  script, and no layout shift when React mounts (the frame's header and sidebar sit exactly where `Layout.tsx` puts
  them, checked in screenshots at 390 and 1440).
- Both themes, including a stored dark choice on a light system and the reverse.
- After deploy: `curl -sI https://99ile.in/ | grep -i content-security-policy` shows the hash.

## Result (built 19 Nov 2026, `feat/first-paint`)

| | Before | After |
|---|---|---|
| Main script (gzip) | 154.2 KB | 128.5 KB |
| First contentful paint, slow phone, `/` | 3.67 s | 1.83 s (the frame) |
| `/today` | 3.61 s | 1.84 s |
| `/practice` | 3.60 s | 1.84 s |

- The frame matches the page at 390 and 1440, light and dark, with the sidebar open and collapsed (screenshots of the frame
  alone, the main script blocked, beside the loaded page): nothing moves when React takes over.
- Under the site's security policy (served locally with the same header) the inline script ran every time: a stored
  theme opposite to the system's was applied before the first paint.
- What changed in the code: `planner/templates.ts` (templates beside the planner), `planner/done.ts` (ticks and
  minutes, for the focus timer and the sidebar), `planner/planned.ts` (the sidebar's planned minutes, after idle),
  `sections/dilr/phases.ts`, `components/Background.tsx` (AutoTicker and RedoSeeder after idle), Home's updates in
  `home/More.tsx`, `fmtSecs` in `lib/date.ts`. `lib/notify` stays: it tidies a reminder's address before the router reads
  it.
- The guard: `src/lib/firstpaint.test.ts` walks every static import from `main.tsx` and fails if the catalog, the daily
  picks, the planner, the templates, record, redo or the updates come back; it also checks the inline script's hash is in
  every policy in `_headers`.
