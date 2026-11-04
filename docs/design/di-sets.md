# DI sets, part 1 (1 Nov 2026)

Feature F90 (with F95's calculator log), decisions D70 to D75 in `docs/analyze.md`, research `docs/research/di.md`. The owner chose this feature next on 1 Nov 2026, with DI inside the LR player, three or four sets on real data later, and sets drafted by Claude and reviewed by the owner. Part 1 is the format, the charts, the calculator, the checks and two sample sets; part 2 is the first twelve sets. No 3D (D51, D62): a 3D chart misreads values.

## What the student sees

### In the practice list
Two new types in DILR practice, after the LR types they sit beside in CAT: **Tables and missing data** (`di-table`) and **Charts** (`di-chart`). Every set is CAT level (owner, 1 Nov 2026); the row says medium or hard as for LR sets.

### Solving (the LR player, unchanged around it)
```
 [ DI set, charts ]  Exports of five ports            12:40 / 12:00   [Calculator]  [Submit set]
 ┌ The data ─────────────────────────────┐  ┌ Question 2 of 4 ─────────────────────────┐
 │ The story, two or three sentences      │  │ By what percentage did Kandla's exports  │
 │ ┌ Exports by port, ₹ thousand crore ┐  │  │ rise from 2023 to 2025? (to one decimal) │
 │ │ ▇▇ ▅▅ ▆▆ ▃▃ ▇▇   2023 / 2025      │  │  │ [ 18.4                ]  TITA           │
 │ └────────────────────────────────────┘  │  │                                          │
 │ Table: share of each port's cargo       │  │ Q1 Q2 Q3 Q4   ‹ Previous  Next ›         │
 │ Rules (when a set has them), numbered   │  └──────────────────────────────────────────┘
 └─────────────────────────────────────────┘
```
- **Charts are drawn from the set's numbers**, as the exam draws them: value labels only where the exam would print them, gridlines and axis ticks to read off, no hover values while solving (a hover would answer "read a value" questions). Legend in words beside the series, never colour alone. Below the tablet width a chart scrolls sideways inside its own box rather than shrinking its text under 14 px.
- **Tables with blanks** show "?" in the blank cells and keep row and column totals where the set gives them.
- **The calculator** (all DILR sets, as in CAT): a "Calculator" button in the player bar opens a small panel with CAT's basic keys (0 to 9, point, + − × ÷, %, √, 1/x, ±, MC MR MS M+ M−, Backspace, C, CE, =). Desktop: a panel pinned to the right of the question pane, keyboard input too. Phone: a bottom sheet over the question pane, closed with one tap. Each finished calculation ("1,780 ÷ 2,410 = 0.7386") is kept, the last 80.

### Review (added to the LR review)
- **The filled table**: blanks filled and tinted, so the student sees what the rules gave.
- **Each answer's working**: the formula in words with the numbers ("(2,410 − 1,780) ÷ 1,780 = 35.4%"), and each wrong option's trap in words (wrong base, wrong year, rounded too early…).
- **Your calculations** (F95): the calculator log, with a note on any calculation the options made unnecessary ("options 12 points apart: about 74% was enough").
- **Minutes per question** (F95): time on each question, the longest named.
- The post-mortem's slips gain DI causes; the Error log and redo queue take DI causes too.

## Format (`docs/content/lr-format.md`, DI section)

A DI set is an LR set with:
- `data`: named tables, each `{ id, caption, unit, cols, rows: { name, cells: (number | null)[] }[], totals? }`; `null` is a blank the student must fill.
- `charts`: what to draw, each `{ kind: "bar" | "stacked" | "hbar" | "line" | "cumulative" | "share" | "radar" | "scatter" | "table", data: <table id>, series?, axis?: { min, max, step, label }, labels?: "none" | "ends" | "all" }`.
- `source` as for LR sets, plus `cite` for real data ("World Bank, CC BY 4.0, 2025"). No separate level field: `difficulty` says medium or hard.
- Questions as for LR sets. A TITA stem states its form ("to one decimal place", "as a whole number"), and `tol` on the question gives the accepted difference (0.05 for one decimal).

**Checked by code.** `practice/di/checks.ts` has one plain function per set that recomputes every answer (and the filled blanks) from `data`; a test runs them all and compares with the JSON. A table with blanks is also a grid model the general solver (D64) proves has exactly one fill. MCQ options must be distinct to the stated precision, and the right one must not be the only round number.

## Two sample sets in part 1
1. **Containers at five ports** (medium, charts, 12 minutes): a grouped bar chart of total cargo and a table of containerised shares; the largest rise in tonnes (the share trap), bulk growth over all ports, the "part grows faster than its whole" shortcut, the least share one port can have under caps, and the fewest ports that must change.
2. **Enrolments in five batches** (medium, table with blanks, 13 minutes): eight blanks, totals and four facts, every fact needed; the last question drops a fact and asks what then cannot be true.
Both invented; the real-data sets come in part 2. **As built, after two independent solvers** (1 Nov 2026): both solved every question as keyed. Their review changed the chart set (it was easy to moderate: a plain division question became the least-share question, the data moved so no typed answer sits near a rounding edge, two dead options went, Q3 reworded) and the table set (a giveaway option replaced, "Batch B" options, fact 1 limited to monthly entries). The revised sets were solved again by two new agents: all ten answers agreed again. Their second review moved the sets closer to CAT form: typed answers are whole numbers ("to the nearest integer") or a multiple-choice question whose wrong options are real mistakes (averaging rates, the wrong growth), the shared 2025 setup sits once in the set as "Additional information for questions 4 and 5", Q5 says "needs to rise", the table set's best-month question asks for the share itself (no batch letters against option letters), and the facts read as CAT writes them. Both sets are marked medium, as the reviewers rated them (about CAT's moderate set); the part 2 sets will be harder (more blanks, more branching). A disagreement on fact 2 was settled by brute force: it is needed when "second-highest" allows a tie and redundant when it does not; every answer is the same either way.

**Built differently from the plan:** chart kinds are bar, stacked, line and table (pie, radar and scatter come with the sets that need them); a chart keeps its size and scrolls sideways in a narrow pane, with a line saying so; the calculator works on every LR set, not in the Arena yet; "an estimate was enough" is noted per question when its options are calculated values at least 8% apart, not per calculation.

## Real-data sets (4 Nov 2026, D81, F96)
Four sets on public data, questions ours: **Six economies** (World Bank 2023; a scatter of GDP per head against growth, a table with population; compounding to a threshold, "catch-up" counting), **India's trade with five partners** (DGCIS 2024-25 and 2025-26; exports and imports as a percentage of exports; wrong-base traps, a falling ratio with rising imports), **Monsoon 2025** (IMD; a table whose hidden entries are ranges set by the rounding rule; least and greatest possible values) and **Installed power capacity** (CEA, three years; a stacked bar with renewables as one part, linked to a chart of their split). Each cites its source under the charts. Two rounds of two independent solvers agreed with every key; round one's "too easy" verdict on two sets was fixed before round two.

**Charts added:** `scatter` (one point per row, names beside the points, `place` moves a label off a neighbour, a table gives the exact values), `share` (a pie, for a set that needs one), `colors` per chart so a source keeps its colour, and printed values keep their table's decimals (57.0 beside 53.4). Inside a stacked bar, values carry a halo so they read on any colour; a segment too thin for its value prints it beside the bar.

## Rules
Tokens only (charts use the theme's series colours and work in dark mode), text 14 px and up, tone not borders, one filled button per screen (Submit set), nothing moves under reduced motion (charts draw once, no animation in the attempt; review bars may grow once, as the Arena's do). The calculator panel and charts load with the player's lazy chunk, not the first download.
