# Analysing an Arena round like a sectional (5 Nov 2026)

Owner, 5 Nov 2026: "in VARC we have the timed sectional and we can analyse it … the Set Selection Arena is the DILR section as it comes in the exam … we can have an analyse-it feature, as at the end it is a whole section." Findings A75 to A78 and decision D85 in `docs/analyze.md`. Built on `feat/di-skill-map`, with the DI skill map.

## Today
- A VARC sectional logs its score as a "Sectional" result (`st.mocks`) and opens the mock review already filled: status, type and time of every question. Only the causes are asked (D44). Mistakes go to the Error log, actions to the plan.
- An Arena round has its own debrief: selection accuracy, where the minutes went, the costliest set, guesses against what happened, and a link to each set's review with its two-minute post-mortem.
- Nothing adds a round up by cause, a round logs no result, so "Are you exam ready?" on Progress (DILR) waits for a hand-logged mock, and the Arena keeps time per set, not per question.

## What we build (D85)
- **"Analyse this round"** on the debrief, beside the per-set reviews. It opens the mock review filled from the round (`fromArena` in `practice/mockreview.ts`): the five sets in deal order, each with its type (LR types folded into the review's DILR set labels) and question count; each question's status and format (MCQ or TITA). The Basics step is skipped and Questions is "Tag your mistakes", as for a sectional.
  - Answered: right or wrong, scored against the set. Right after more than 4 minutes is "right but slow" (DILR's first question carries the reading, so the VARC 150 seconds would flag nearly every set).
  - Left by choice: "skipped, a good skip", already settled; the question says "You left set C by choice; mark it doable if you regret it". The debrief judges the choice; the review does not count it as lost time.
  - Picked but never reached: not reached (time).
  - Blank in a set the student worked on: skipped, and asks "could you have got it?".
  - Each answered set's questions link to that set's review at the question.
- **Time on each question in the Arena**, kept as the LR player keeps it (`qs` on the attempt), counted only while solving, so the review and the DI "Where your minutes went" have it.
- **A round logs a DILR "Sectional" result** at submit ("Set Selection Arena round", right and penalised wrong answers), so "Are you exam ready?" counts it and the Mocks tab lists it with "Analyse it". A replay round (sets tried before) logs none. A round from before this change gets its result when it is analysed.
- **Saying what it is.** When the last results include an Arena round, the exam-ready card adds: "Arena rounds use our sets, so they show how you handle a section, not your percentile."

## What stays out
- Selection: the debrief already scores it; the review does not repeat it.
- A percentile for DILR: no tables for it yet.
- Changing the per-set post-mortem.

## How we will know it works
- After a round, one tap opens the review on its first wrong answer; only wrong answers and blanks in worked sets need the student.
- Where the marks went separates careless, method and time losses, and a left set costs nothing there.
- Progress (DILR) shows an average after a round, and the Mocks tab lists it.
