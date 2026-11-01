# "All pages" panel, version 2 (1 Nov 2026)

Decision D69 in `docs/analyze.md`. Part of the page-by-page redesign (D55). The owner asked for the home page's "All pages" panel to be redesigned, "animated, modern, better UX, better three.js", and chose the section towers over a flat panel or decorative 3D cards (1 Nov 2026).

## What was wrong

| Problem | Effect |
|---|---|
| Four equal columns of 21 text links | Today and Practice, used daily, weigh the same as "Topper stories" |
| A border and a drop shadow set the panel apart | Against the house rules (tone, not borders or shadows) |
| No icons, no lines saying what a page is, nothing about what is waiting | A visitor cannot tell Plan from Today; a returning student does not see the redo queue is due |
| The sidebar (D65) had icons, the day's ring and the redo count; the panel did not | Two navigations, two languages |
| Opens and closes with no motion | Feels abrupt next to the hero's 3D field |

## The design

```
 [99] 99ile      VARC  DILR  Quant  Practice  About        (search) (theme) (install) Sign in [All pages ^]
 ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
 │ ┌ Sections ────────────┐  Study                       Track              More                 │
 │ │ Sets to practise.    │  ⌂ Home                      ↺ Redo queue  3    Updates              │
 │ │ A block is 5 sets.   │    Where to start...         ! Error log        CAT and other exams  │
 │ │   ▆▆  ▆▆             │  ◔ Today         ◔ 25/70     ⟲ History          Guides               │
 │ │   ▆▆  ▆▆  ⬚         │    Your plan for the day     ✓ Weekly review    Topper stories       │
 │ │ [VARC][DILR][Quant]  │  ✎ Practice ...              Aa Words           What's coming        │
 │ │ 55 RC  47 LR  Soon   │  ▥ Progress ...              ▤ Reading journal  Settings and backup  │
 │ └──────────────────────┘  ◷ Plan and time ...                                                │
 └───────────────────────────────────────────────────────────────────────────────────────────────┘
   (the page behind dims)
```

- **Section towers** (three.js, `components/SectionTowers.tsx`): VARC, DILR and Quant as towers of blocks on small plates. For a visitor a block is a number of sets on the site (55 RC sets, 47 LR sets); once the student has answers in the last 30 days, a block is a number of their own answers (from the practice log). The unit is a round number that keeps the tallest tower at twelve blocks. A section not open yet is an outline, never taller than the shortest real tower, so it does not read as a number. Real data, as D51 asks of 3D.
- **Linked both ways**: hovering or focusing a section tile lifts its tower and gives it the full colour while the others go quiet; hovering a tower lights its tile; a click on a tower opens the section. The tiles are the links (the canvas is hidden from screen readers).
- **Study** places have an icon and a line each ("Your plan for the day"), Today its ring of minutes, the redo queue its due count: the same parts as the sidebar (D65).
- **Surface**: a card-toned panel on a dimmed page, no border and no shadow. Escape, a click outside or on the dimmed page closes it.
- **Motion**: one entrance when it opens: the page dims, the panel settles, the columns step in (GSAP); the blocks drop onto their plates tower by tower. The towers lean a little towards the pointer. Under reduced motion nothing moves and the towers are drawn once.
- **Loading** (D41): the panel and three.js load when the pointer reaches the button or it takes focus, not with the page. Without WebGL the same numbers show as flat bars.
- **Phones**: unchanged; the landing header and this panel are desktop only, the phone menu sheet uses the sidebar list.
