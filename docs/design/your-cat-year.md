# Your CAT year (D87, D90; 6 Nov 2026)

Owner, 5 and 6 Nov 2026:
- "we can only provide till 3 CAT years; by default we can show the coming CAT";
- "I don't need hard-coded things";
- the site is live, so it must be "very particular, good design, optimised, uniquely creative".

The rules come from F82's "Your CAT year" in `docs/feature.md`. This note covers how it works and how it looks.

## Before
- One exam, fixed in code: `EXAM_ISO = "2027-11-28"`, `EXAM_NAME`, and five phase dates in `data/exam.ts`.
- 15 files read them: the planner, both section plans, Today, Home, the home road, Plan, You and Section.
- A CAT 2028 student got a CAT 2027 plan. A student who joined in March was "joined at the current phase", and Foundation was simply gone.

## The model (`src/data/exam.ts`)
- **`CATS`** is the list of CAT years: the date, and whether it is confirmed (iimcat.ac.in) or expected (the last Sunday of November).
  - A new year is one row. A test checks every expected date is a late-November Sunday.
- **`roadFor(exam, since)`** is a student's road. Its phases sit on the calendar of the exam's year:
  - Build from 1 February, Apply from 1 June, the mock phase from 1 September, the taper over the last 10 days.
  - Foundation runs up to 31 January, starting on the student's first day (never before the plan began, 17 Oct 2026).
  - These anchors reproduce today's CAT 2027 dates exactly (a test pins them), so no current student's plan moves.
- **A long lead opens with a Head start.** When Foundation would run longer than about four months, the road opens with a Head start up to 30 September of the year before, then Foundation from 1 October.
  - The Head start is the same routine as Foundation at whatever time the student sets, with its own goal text.
  - It is not a numbered phase: the road still has "five phases to the exam".
- **A late start shares what is left.** A start less than two weeks before 1 February shares the days before the mock phase among Foundation, Build and Apply, 1 : 3 : 2. A share under two weeks goes to the next phase.
  - Every step still happens, just shorter. Plan says so, and `road.short` is set.
- **A start under two weeks before the mock phase** begins in the mock phase.
- **`roadOf(state)`**: the chosen year (`about.exam`), or the default.
  - **The default is the first CAT at least 90 days after the student started.** It is worked out from the start date, not from today, so a student who never chooses is never moved to the next year halfway through.
  - Roads are cached by year and start date.
- **`catChoices(today)`**: the next three CATs at least 90 days away, plus the student's own if it is still ahead.
  - In November 2026 that is 2027, 2028 and 2029. CAT 2026, three weeks away, is not a plan.
- **No global state.** The road travels in the planner's context (`PlanCtx.road`), so the section plans and the engine read the student's own road. Pages use `useRoad()` or `roadOf(state)`.

## What the student sees
**You → Your CAT** (`components/CatYear.tsx`), at `/you#cat`:
- **Three year cards** in a radio group. Each shows "Your exam", "Announced" or "Expected", the year large, the date, and the days to go.
  - Tone sets the picked card apart (accent): no borders, no shadows.
- **The road below, as one bar to scale**, a column per phase, the current phase in full blue and the head start lightest.
  - **Picking another year saves nothing.** The bar reshapes into the new road: GSAP stretches each column from its old length to its new one, a new head start grows out of nothing, and the days count runs to the new number. It takes 0.7 s, and simply changes under reduced motion.
  - Below the bar, every phase with its dates.
- **"What changes if you switch to CAT 2028"**, in plain words:
  - the head start and its end;
  - which phase today falls in, before and after;
  - Foundation, Build and mock dates;
  - "late start" when it applies;
  - always: "The days you have already studied stay as they are."
- **Two buttons:** "Switch to CAT 2028" (the screen's one filled button) and "Keep CAT 2027". Saving is `about.exam` in the synced profile record, so it follows the student to every device; no server change.

**Everywhere else follows at once:**
- **Home:** "Prepare for CAT 2028", the status line, the road section (with the head start as "To start with"), and the estimate note only while the date is unconfirmed.
- **Today:** the header reads "Head start, CAT 2028", or "Build, phase 2 of 5, CAT 2027".
- **Plan:** "A head start, then five phases to CAT 2028 (change it)", phase cards numbered from Foundation, and the late-start note.
- **Exam over:** after exam day, Today says "CAT 2027 is over. Sitting the next one? Choose your CAT", and You opens on the next year with the switch ready.

## Not now
- The first-visit setup (F82 part 1, January) will ask the same question. It writes the same `about.exam`.
- The reminder job still skips exam days from its own list (`policy.json`). That is harmless for students aiming at another year, and it moves to the student's own exam with the setup.

## Checked
- **Unit tests** (`data/exam.test.ts`): CAT 2027's road to the day; CAT 2028 with a head start; a late start; a start inside the mock phase; no gaps or overlaps for six start dates; placing days; the default never moving; the choices; expected dates on late-November Sundays.
- **State:** the year is kept, and anything else is dropped.
- **Planner tests** now say which student they describe, someone who started on 17 Oct 2026. The DILR weeks count from the student's own start.
- **In the browser:** desktop light, phone dark.
  - Pick 2028: the bar stretches (41 frames, 87 → 123 days for Foundation) and the list of changes appears.
  - Switch: Home says "Prepare for CAT 2028" and Today says "Head start, CAT 2028".
  - Reduced motion: no tween.
