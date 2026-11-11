# DILR Replay (F57), 1 Nov 2026

Decision D66 in `docs/analyze.md`. Built on the general solver (D64). No 3D (D62): the moving part is a number.

## The problem

A written DILR solution shows the final table, not how anyone got there. Students copy answers and do not learn the order of moves: which clue to start with, how one placement forces the next, when to split into cases. The solver already knows how many arrangements fit after any clues; F57 shows that number falling as the deductions happen.

## Research behind the shape

- **Worked examples, then fading.** Studying worked examples beats unaided problem solving for novices, and removing steps one at a time ("fading") with a prompt to explain each step carries learners to solving alone (Renkl and Atkinson; the worked-example effect). So three modes, from most help to least: **Watch** (the worked example), **Step by step** (each step's clues named, the student marks what they settle, then the worked step is shown), **On your own** (all clues, as in the exam). The first two sets a student opens start step by step; later ones start alone. Watch is always one tap away.
- **Three marks per cell.** Logic-grid apps use empty, ruled out and confirmed; a tick crosses the rest of its row (and its column in a one-each grid) automatically, so students spend taps on deductions, not bookkeeping. A key above every board the student marks says what one, two and three taps do (owner, 11 Nov 2026: "On your own" gave no hint that one tap crosses and a second ticks).
- **Hints check first.** Nothing safe follows from a wrong mark, so a hint shows wrong marks before it names the next step's clues. It never fills a cell.
- **Anchor first.** CAT guides advise starting scheduling sets from the clue with a fixed reference, and tournament sets from the structure (matches, points). The worked steps follow that order, not the clue numbers.

## The design

One idea: **watch the number of possible arrangements fall as each deduction lands.**

```
 DILR replay, scheduling                                   [All replay sets]
 Five talks in one week
 [ Watch | Step by step | On your own ]
 ┌ The set ───────────────────┐  ┌ Ways left ─────────────── from 120 ┐
 │ Five speakers ... Mon-Fri  │  │ 6                                  │
 │ 1 Esha later than Asha     │  │ Start  ████████████████████  120   │
 │ 2 Two talks between B, C   │◄─│ Step 1 ██████████            6     │ (highlighter on the step that cut most)
 │ 3 ...  (step's clues lit)  │  │ Step 2 ████████              ?     │
 └────────────────────────────┘  │ Step 1 of 3: clues 4 and 2 ...     │
                                 │ [Next step]  Play  Previous         │
                                 └────────────────────────────────────┘
                                 ┌ Day   Mon Tue Wed Thu Fri ─────────┐
                                 │ Asha  [ ] [x] [ ] [ ] [x]          │
                                 └────────────────────────────────────┘
```

- **Ways left** is the page's one memorable element: a big number, and a staircase with one bar per step, its length on a log scale (1,680 to 40 and 4 to 1 both read as real cuts). Steps not reached show "?". The step that cut by the largest factor gets the yellow highlighter, once reached: the move to remember.
- **The board**: one grid per group of values (a row per person, a column per choice); a league is a list of matches with three named results each. Cells are 44 px buttons; settled cells are shown in tone and words, wrong marks in red with a ring, missed placements ringed in green. Every cell has a spoken label ("Bilal, Mon: crossed out").
- **The set** sits on the left (sticky on desktop) with the clues the current step uses lit; on a phone it comes first and the board follows.
- **One filled button** a screen: Next step, Check step, Check, or Next replay set.
- **Motion** (GSAP through `lib/motion.ts`): the number counts down and its bar grows from the previous length; newly settled cells pop in one after another. Nothing moves under reduced motion; Play still steps, more slowly.
- **Counts** stop at 200,000 ("over 2,00,000"): the archery set starts at 1,728,000, which takes about half a second to count. Above 20,000 arrangements the board's cells are read by testing each cell on its own instead of listing.

## Content

`content/lrdrill/replay.json`: six original sets, two per format: scheduling (five talks; four trips across a day grid and a city grid), grouping (three quiz teams; a committee of four), tournaments (a round robin of four; the archery LR set). Each has worked steps (`use`, `say`); format in `docs/content/lr-drills.md`. Tests prove one answer, that every clue is needed, that the steps use every clue once and the count falls at each.

## Sets that replay an LR set

A replay with `set` (the archery set) shows that LR set's answer. Like must-could-cannot and first move (D49), its page first asks "Solve … first?", with a link to the set and "Show me anyway", unless the student has solved the set or came from its review (`?back=`). The list says "solve that set first" until then. Owner, 1 Nov 2026.

## Saved

A run is an `lrDrills` row of kind `replay` (no new sync kind, so no server change): one item per step done step by step (`<set>#<step>`, right when nothing was wrong or missed), or one per row solved alone (`<set>:<row>`, right when that row was never wrong at a check). Watching saves nothing. History shows each run; a Today block with `go: "/practice/replay"` would tick from it.
