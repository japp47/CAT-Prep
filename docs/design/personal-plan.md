# A plan that fits you, part 1 (F82), planned 19 Nov 2026 (D116)

Every student gets the same plan today: VARC 60 minutes on a weekday and 120 at the weekend, DILR 30 and 60. The You page
asks first attempt or repeat and studying or working, but nothing reads the answers. This is the one-minute setup that
turns four answers into the student's own minutes and first step. Research: `docs/research/personal-plan.md`.

## What the student does

**Where it is offered.** A first visit (no practice yet, no setup answer) sees it in two places, never forced:
- Home's hero: the primary button becomes "Make my plan" (`/setup`); "Start here" stays as the secondary link.
- Today, first open: a card above the plan, "Your plan in a minute", with "Make my plan" and "Use the standard plan".
  The second records the choice (`about.setup = { at, skipped: true }`) and the card does not come back.
It is always on You ("Your plan") and from Plan's new first line, to change later.

**One page, four questions, each with an answer chosen** (390 px):
```
┌──────────────────────────────────┐
│ Make your plan                   │
│ For CAT 2027  Change             │  the existing year switch (D93)
│                                  │
│ How do your days look?           │
│ [Studying] [Working] [Both]      │  segmented; none chosen = studying
│                                  │
│ Time on a weekday                │
│ [30] [45] [60] [90] [120] min    │  default from the answer above
│ Time on a weekend day            │
│ [60] [90] [120] [180] [240] [300]│
│                                  │
│ Where do you stand?              │
│ [Just starting] [Prepared before]│
│ [Taken CAT before] [Not sure]    │
│                                  │
│ Which section feels hardest?     │
│ [VARC] [DILR] [Not sure]         │  live sections only; Quant joins when live
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Weekdays 45 min:             │ │  tone panel, updates as they tap
│ │ VARC 25 · DILR 20            │ │
│ │ Weekends 120 min:            │ │
│ │ VARC 70 · DILR 50            │ │
│ │ First: the Start here guide  │ │
│ └──────────────────────────────┘ │
│ [   Use this plan            ]   │  the one filled button
│   Keep the standard plan         │  text link (skip)
└──────────────────────────────────┘
```
At 1440 the questions sit on the left and the plan panel stays beside them (sticky), so every tap shows its effect.

**After "Use this plan"** the student lands on Today, whose plan already has the new minutes, with a one-line note:
"Your plan: working, DILR feels hardest. Change". The first task leads the list.

## The rules (`planner/fit.ts`, pure, one test per rule)

**Defaults offered** (research findings 2 and 5: modest starts, room to grow):
| Days | Weekday | Weekend day |
|---|---|---|
| Studying | 60 | 120 |
| Working | 45 | 120 |
| Both | 30 | 90 |

**Split between live sections** (finding 6):
- Base weights as today: VARC 2, DILR 1; Quant 2 once it is live (about 40/20/40 then, near the sources' 35/30/35).
- "Hardest section" moves 10 points of the day to it (15 for "Taken CAT before"), taken from the others in proportion.
- Every live section gets at least 15 minutes on a weekday and 30 on a weekend day; minutes are rounded to 5 and always
  add up to the time chosen (the rounding difference goes to the largest share).
- Reading stays inside VARC's minutes, as the VARC template already plans it.

**First step** (finding 7): just starting or not sure: the Start here guide; prepared before: today's plan as it is;
taken CAT before: a timed VARC sectional (`/practice/sectional`) to see where they stand.

**What is written:** `settings[sec].wd` and `.we` for each live section (per-day overrides, `dow`, are cleared, with a
note on You when they existed), `about.work`, `about.level` (new), `about.attempt` (repeat when "Taken CAT before"),
`about.weak` (new), `about.setup = { at }`. The exam year is the existing `about.exam`. Target stays on You.

**Skipping** changes nothing but `about.setup`: the plan is exactly today's (F82 "Done when").

## Data
- `About` (`lib/state.ts`) gains `work: "both"`, `level?: "new" | "some" | "repeat"`, `weak?: SectionId`,
  `setup?: { at: string; skipped?: true }`, each checked in `normalize`. They travel in the existing `profile` sync record;
  the server stores it as is (no server change). Old saves load unchanged.

## Design rules
One filled button ("Use this plan"); choices as the kit's `Segmented` and chips in tone, not borders; no text under 14 px;
the plan panel is the highlight of the page (the highlighter only on the first step's name); works at 390 and 1440 in both
themes; nothing animates beyond the panel's numbers changing, which is instant under reduced motion.

## Not in this version
- A weekly target instead of daily minutes (D51's second style): next, part 1b, once the daily plan's answers are in use.
- A short placement check, the commute set for working students and the reality check after mocks: part 2 (step 6).
- Target percentile in the setup (it stays on You; the research found it adds a question without changing the first
  weeks).
