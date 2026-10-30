# Sidebar, version 2 (30 Oct 2026)

Decision D65 in `docs/analyze.md`. Part of the page-by-page redesign (D55). Checked against the frontend skills: `frontend-design`, `redesign-existing-projects` (its sidebar rules: a collapsed sidebar keeps an icon rail, group headings become dividers, icon-only items keep their names and tooltips, 44 px targets), `minimalist-ui`, `web-design-guidelines` (links for navigation, visible focus, `aria-current`, only transform and opacity animated, reduced motion) and the project's `frontend-reference-sites`. No 3D (D62).

## What is wrong today (desktop, 1440 px)

| Problem | Effect |
|---|---|
| Four small all-caps headings with a rule under each (STUDY, SECTIONS…) | Against our own rules (no small all-caps labels, tone not lines); the eye reads headings, not places |
| 21 text links of equal weight, no icons | Today and Practice, opened daily, look like "Topper stories" |
| Collapsed, the sidebar hides every link | The 72 px rail is a logo and a search button; the student has to reopen it to go anywhere |
| Nothing says what is waiting | The redo queue and the day's plan are a page away |
| "Overview" under Progress | Says nothing; the page is called Progress |

## The design

One idea: **the places you use every day, with what is waiting there.**

```
 [99] 99ile                 [«]
 [ Search               ⌘ K ]

  ⌂  Home
  ◔  Today              ◔ 25/70     <- the day's ring: minutes done of planned
  ✎  Practice
  ▥  Progress
  ◷  Plan and time

  [ VARC ] [ DILR ] [ Quant ]        <- the three sections as tiles

  Track
  ↺  Redo queue             3        <- due today, only when something is
  !  Error log
  ⟲  History
  ✓  Weekly review
  Aa Words
  ▤  Reading journal

  More                       ›      <- folded: updates, exams, guides, stories, what's coming, settings

  (account)  (theme) (install)
  Free and open. Your data stays in this browser.
```

- **Group headings** are quiet sentence-case words (Track, More), 14 px, muted; the first group has none.
- **Icons**: one stroke family (`components/Icons.tsx`, 2 px, round), no new library.
- **The active place** sits on one pill of card tone that **slides** to the new place when the page changes (GSAP, transform only; jumps without motion under reduced motion). This is the one moving thing.
- **Counts only when actionable**: the redo queue's due count; the day's ring on Today (done of planned minutes, from the same plan Today shows).
- **Sections** are three tiles in a row, since they are siblings of one kind; Quant says "Soon" until it opens.
- **More** folds the six occasional places; its state is remembered (pref `navMore`). On those pages it opens itself.

### Collapsed (72 px)

**Changed 30 Oct 2026 (owner):** as before the redesign: the logo, the expand button and search at the top, theme, install and account at the bottom, nothing else. A first build gave the rail every place as an icon with tooltips; the owner preferred it quiet. Open, the sidebar is 288 px wide (was 248) with 44 px rows.

### Phones

Unchanged: the bottom bar and the menu sheet. The sheet uses the same list, so it gains the icons, the sections row and the counts.
