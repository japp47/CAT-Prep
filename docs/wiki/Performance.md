# Performance

How 99ile stays fast on a student's phone, what we changed in the October 2026 speed pass, and the rules that keep it fast as the site grows.

Most students open 99ile on a mid-range Android phone over mobile data, so that is what we design and measure for. A desktop on Wi-Fi will always feel fast; a phone on a weak 4G signal is where a slow page loses a student.

## Results

The speed pass (20 October 2026) was measured on a production build with an empty cache (a first visit), using the conditions of Lighthouse's "mobile" profile: a 1.6 Mbps connection with 150 ms latency, and the CPU slowed 4×. Each figure is the average of two runs.

| Page | First text (FCP) | Main content (LCP) | Layout shift (CLS) | Downloaded |
|---|---|---|---|---|
| Home | 1.20 s → **1.04 s** | 1.58 s → **1.39 s** | 0.107 → **0** | 416 KB → **262 KB** |
| RC passage | 1.14 s → **1.01 s** | 3.16 s → **2.06 s** | 0 → 0 | 593 KB → **297 KB** |
| Today | 1.14 s → **1.03 s** | 2.14 s → **2.02 s** | 0 → 0 | 283 KB → 266 KB |
| Practice | 1.14 s → **1.03 s** | 1.47 s → 1.49 s | 0 → 0.018 | 283 KB → **228 KB** |
| RC library | 1.14 s → **1.01 s** | 1.68 s → 1.64 s | 0.001 → 0.001 | 284 KB → **234 KB** |
| Progress | 1.14 s → **1.01 s** | 1.60 s → 1.67 s | 0 → 0 | 282 KB → **242 KB** |
| VARC | 1.14 s → **1.02 s** | 1.60 s → 1.64 s | 0.001 → 0.022 | 411 KB → **293 KB** |
| Reading journal | 1.14 s → **1.02 s** | 1.63 s → 1.76 s | 0 → 0 | 284 KB → **230 KB** |

- **First text** arrives about 0.1 s sooner on every page.
- **The two worst pages improved most:** the RC passage gets its main content a full second sooner, and the home page no longer jumps while loading.
- **Downloads fell by 15 to 50 percent.**
- **Main content on Practice, Progress, VARC and the journal** moved by a few hundredths of a second either way. That is within the run-to-run variation at these settings.
- **The small layout shifts on Practice and VARC** (0.018 and 0.022) happen when the real font replaces its stand-in. Google rates anything under 0.1 as good.
- **Total blocking time** was 0 ms before and after: the app does little work on the main thread.

## What we changed

### 1. Fonts served from our own site

**Problem.** The fonts came from Google Fonts. A first visit had to connect to two more servers, then fetch a stylesheet, before a font file could start: about 700 ms on a slow connection. The serif used for passages was 119 KB and arrived last, at 2.8 s on the home page and 3.9 s on an RC page, and the text visibly jumped when it did.

**Change.**
- Both fonts are now in `public/fonts/`, declared with `@font-face` in `src/index.css`. The site makes no requests to other servers.
- The serif no longer has its "optical size" axis or its italic style. The site never used either: the axis reshapes letters only at sizes we do not use, and no text is italic. That took the serif from 119 KB to 49 KB, and both fonts together from 165 KB to 94 KB.
- Each font is split into a basic Latin file and an extended Latin file. The extended file loads only on a page that uses one of its letters, such as đ or ₹.
- While the fonts load, a size-matched stand-in is shown: Arial and Georgia, scaled with `size-adjust` and the `*-override` descriptors to match our fonts' widths and line heights. The text does not move when the real font arrives.
- Font files are cached for a year (`public/_headers`). A changed font gets a new file name.

**Tried and rejected: preloading the fonts.** With `<link rel="preload">` the fonts downloaded at high priority alongside the main script. On a slow connection that delayed the script, and the page cannot show anything until the script runs: first text went from 1.03 s to 1.50 s. Preloading only the sans font still cost 0.2 s. Because the stand-in fonts are size-matched, the page does not need the real fonts early, so they are not preloaded.

### 2. Practice content loads one file at a time

**Problem.** Opening any practice page downloaded every passage, paragraph and question in one 185 KB file, even to show a single RC set.

**Change.**
- `src/practice/bank.ts` has one loader per content file: each `content/rc/<genre>.json`, the VA paragraphs and the CR questions. Each becomes its own small chunk.
- `npm run catalog` records which file holds each set (`RC_FILE` in `catalog.gen.ts`).
- Pages ask only for what they show. `ContentGate` and `useContent` take a `need`:

| Page | Asks for | Downloads |
|---|---|---|
| RC passage, journal model | `{ rc: [id] }` | that set's genre file, 14 to 30 KB |
| VA drill | `{ va: true }` | the paragraphs, 55 KB |
| CR drill | `{ cr: true }` | the questions, 14 KB |
| Sectional, redo queue, speed test, report card | `"all"` | everything, as before |

- Loaded files are kept in memory, so returning to a page is instant, and two pages asking for the same file share one download.
- The tests still read all content at once through `src/practice/full.ts`, which app code may not import.

### 3. A smaller main script

The main script loads on every page before anything appears, so every kilobyte in it costs every visitor. It went from 131 KB to 110 KB (compressed), 21 KB less, by moving out code no page needs on arrival:

| Moved out | Now loads |
|---|---|
| The VARC resource list (9 KB on its own) | with the VARC page, Today and Topper stories (`SectionDef.resources` is a loader; `useResources()`) |
| The phone menu's dialog code (focus trap, scroll lock) | when the browser is idle, or as soon as a finger touches a menu button (`MenuSheet.tsx`) |
| `practice/common.tsx` (dialogs, timers, score cards, 3 KB), pulled in only for the streak badge | with practice pages; the badge has its own file, `StreakBadge.tsx` |
| The streak note's popover (2 KB) | when the badge is first touched, hovered or focused |
| The toast code | when the browser is idle or on the first tap; a toast raised earlier is replayed, not lost |
| The percentile tables, needed only for two constants | with the pages that show percentiles (`data/targets.ts` holds the constants) |

The dialog and toast code now sit in chunks shared with the pages that use them, so they have no single size of their own.

The daily timetable's few links moved from `resources.ts` to `sections/varc/links.ts`, so the plan, which every page runs, no longer drags in the whole resource list.

### 4. Advance fetching waits its turn

**Problem.** About a second after arriving, the app started downloading the Today, Practice and Progress pages in advance. That happened just as the current page was fetching its fonts and content, so on the RC page the passage could not start downloading until 1.6 s.

**Change.** `src/lib/idle.ts` runs work once the page has loaded, a moment has passed and the browser is idle. Advance fetching, the menu and the toast code all use it. Advance fetching is skipped entirely when the student has Data Saver on or is on 2G.

### 5. No layout shift on the home page

**Problem.** The home page's "Today's RC" card showed five grey placeholder lines while its opening paragraph loaded. Real openings run from three to eight lines, so the content below jumped (CLS 0.107, above Google's "good" limit of 0.1).

**Change.** The catalog records each opening paragraph's length (`lead` in `RcMeta`). The placeholder is set in the same type with filler of that length, so it wraps to about the same number of lines and nothing below it moves.

## Keeping it fast

**Every pull request is checked.** CI runs `npm run size` after the build and fails if any of these grows past its budget:

| Budget | Limit | Now |
|---|---|---|
| Main script, gzipped | 150 KB | 110.5 KB |
| Stylesheet, gzipped | 20 KB | 13.1 KB |
| The two Latin font files | 100 KB | 95.5 KB |
| Largest single practice content file, gzipped | 70 KB | 55.0 KB |

**Rules for new code**
- **Pages load on demand.** Add a new page with `lazy()` in `src/App.tsx`, never as a static import.
- **Do not import from a big file for one small thing.** If the home page or `Layout` needs a constant or a small component, give it its own file. Check with `npx vite build --sourcemap` and look at what ends up in the main `index-*.js`.
- **Ask for the least content you need:** `useContent({ rc: [id] })`, not `useContent()`. Use `"all"` only when a page really mixes every kind of content.
- **New content files:** a new `content/rc/<genre>.json` also needs a line in `src/practice/rc/index.ts`. A test fails if the two disagree. Each content file should stay under the 70 KB budget; split a genre file in two before it gets there.
- **Anything that can wait goes behind `whenIdle()`** (`src/lib/idle.ts`): prefetching, analytics, anything not needed for the first view.
- **Do not add fonts or font weights lightly.** Each one is a download on every first visit. If a new weight is needed, check whether the variable font already covers it.
- **Reserve space for anything that loads late.** A placeholder must be the size of what replaces it.
- **No third-party requests** (fonts, scripts, analytics) without a strong reason. Each costs a connection to another server, and the security policy in `public/_headers` blocks them by default.

## How to measure

**Quick check, before every pull request:**
```bash
npm run build && npm run size
```

**In the browser:**
1. Run `npm run build && npx vite preview`. Always measure the production build, never `npm run dev`.
2. Open Chrome DevTools. In the Network tab, tick "Disable cache" and choose "Slow 4G". In the Performance tab, set CPU to "4× slowdown".
3. Reload the page and read the timings, or run Lighthouse in "Mobile" mode.

**What the numbers mean**

| Metric | Meaning | Good |
|---|---|---|
| FCP (first contentful paint) | the first text or image appears | under 1.8 s |
| LCP (largest contentful paint) | the main content appears | under 2.5 s |
| CLS (cumulative layout shift) | how much the page jumps while loading | under 0.1 |
| TBT (total blocking time) | how long the page is too busy to respond to a tap | under 200 ms |

## Offline

The service worker (`pwa/sw.js`, filled in by `vite.config.ts` at build time) caches every built file after the first visit: the app, the fonts and all content files. That is why the site opens instantly and works without internet from the second visit on. It registers only after the page has loaded, so it never slows the first visit.

## Ideas for later

- **Content-only paint for returning visitors:** the service worker could serve a saved copy of the page while the new version checks for updates.
- **Smaller fonts:** cut the font files down to only the characters the site uses (about 30 percent smaller). Worth doing if fonts approach their budget.
- **A lighter router:** react-router is about 20 KB of the main script. A smaller router could save most of that, but it would touch every page.
- **Real-user numbers:** once the backend exists, collect anonymous Core Web Vitals from real phones, rather than relying on lab measurements alone.
