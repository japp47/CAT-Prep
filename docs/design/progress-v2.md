# Progress, version 2, with the skill map (30 Oct 2026)

Decision D63 in `docs/analyze.md`; the second page of the page-by-page redesign (D55), after Today. F44 (three answers) stays the page's job; F89 (skill map) is new; the Arena's selection score (F56) joins the DILR view. No 3D (D62, and the owner's note of 30 Oct 2026: three.js only where it earns its place).

## What is wrong today (audit at 1440 and 390 px, six weeks of seeded practice)

| Problem | Effect |
|---|---|
| On a phone the page is about 4,600 px: eleven screens of equal bar lists | Nothing says where the student stands at a glance |
| Five accuracy lists (by type, RC kind, genre, difficulty, CR kind) with the same weight | The student has to compare 30 bars to find a weak spot |
| "Where to focus" says "RC is your weakest type" | RC is a section part, not a skill; the advice is too broad to act on |
| The three answers are text only; "Are you improving?" has no picture of the trend | The main question gets the weakest answer |
| Accuracy bars give a verdict (red under 60%) on 3 questions | A verdict on too little data, against D51's rule |
| DILR shows only clue reading; LR types, the Arena and drills are elsewhere | DILR progress is invisible |

Research behind the changes: dashboards help learners act only when each view comes with an interpretation and a next step, and process feedback helps more than scores (learning-analytics trials; PMC8853217, EDUCAUSE 2021). Khan Academy's mastery levels move up only on evidence and keep a separate top level for skills that hold later (support.khanacademy.org 5548760867853).

## The design

One idea: **where you stand, skill by skill, and what to do next.** The page opens on the three answers with one small chart, then the skill map, then where to focus. Everything else (all the bar lists, habits, pace, traps, mocks, the log) moves under "All the numbers", one tap away.

```
 Progress                                         [ VARC | DILR | Quant ]
 ┌──────────────────────┬──────────────────────┬──────────────────────┐
 │ Are you improving?   │ Weak spots fixed?    │ Are you exam ready?  │
 │ 77%  up 19 points    │ 2 getting better     │ 12.5 right           │
 │ ▂▃▃▅▆▇ last 6 weeks  │ 1 fixed              │ target 15 to 17      │
 └──────────────────────┴──────────────────────┴──────────────────────┘
 Your skill map                        3 strong, 4 steady, 2 weak, 5 learning
 RC questions      [Main idea ][Inference ][Tone      ][EXCEPT    ] ...
 Verbal ability    [Para jumble][Para summary][Odd one out][Insertion]
 Critical reasoning[Assumption][Weaken    ][Flaw      ] ...
 Start here: Specific detail, 3 of 9 right. [Drill it]
 Where to focus (up to three lines) and Weak spots you are fixing
 [ All the numbers ]  Report card | Mocks and target | Log
```

On a phone the three answers stack, the map's tiles run two to a row, and the first screen holds the first answer and the start of the map.

### The skill map (F89)

One tile per skill. **VARC:** the eight RC question kinds, the four verbal ability kinds, the six critical reasoning kinds. **DILR:** each LR set type with sets, and the eight kinds of clue (from the clue translator). Quant joins with its section.

Five states, by a tested rule over recorded answers (`practice/skills.ts`):

| State | Rule | Tile |
|---|---|---|
| Not started | no answers | quiet, the name only |
| Learning | 1 to 7 answers | "3 of 8 answers to judge": no verdict on too little data (D51) |
| Weak | 8 or more, under 60% | danger tone, accuracy and count |
| Steady | 8 or more, 60 to 79%; or 80% and over with a miss still open in the redo queue from 7 or more days ago | neutral tone |
| Strong | 8 or more, 80% and over, and no redo miss left unfixed for a week | success tone |

"Strong means held on redo" (D51) is read from the redo queue: a skill whose old misses are still waiting is not yet held.

A tile opens the place to work on it: the RC guide or library for RC kinds, a six-question drill for a VA or CR kind, the type's guide for an LR type, eight clues of that kind for a clue kind. The weakest tile with a verdict (lowest accuracy, then most answers) is named once under the map as **Start here**, with the page's only filled button. The yellow highlighter is not used on the map; it stays on the first "Where to focus" line, as today.

### The three answers

As F44, with one number each and one chart on the page: **Are you improving?** shows weekly accuracy for the last six weeks as six small bars (a week with fewer than 10 questions is drawn empty and says so). On DILR, the second answer is **Are you picking well?** (the Arena's selection score, D60) when three rounds exist, else the weak spots answer.

### Motion

One orchestrated moment on arrival: the six weekly bars rise, then the map's tiles settle row by row (GSAP, `lib/motion.ts`). Tapping "All the numbers" opens it in place. Nothing moves under reduced motion.

## What stays, what moves

- Stays above: section switch, three answers, skill map, Where to focus, Weak spots you are fixing.
- Moves under "All the numbers" (tabs as today): the accuracy lists, summary habits, reading pace, clue reading detail, traps; Mocks and target; Log. The four headline stats (questions, accuracy, papers, errors) move into the Report card tab.
- `?tab=` links keep working and open "All the numbers" on that tab.
