# Prove it from the passage (F103), planned and built 13 Nov 2026

Decision D99 in `docs/analyze.md`. It builds plan item 14 ("reason before reveal") the way the research report
`reports/Standing out in AI learning.md` (direction 3, "argue from the line") proposed: the student points at evidence
instead of typing a reason.

## The problem
VARC distrust is about explanations, not answers: students say a verbal answer "can justify whatever logic" and call
the section "a gamble". The habit that separates good RC solvers is going back to the line that decides an answer
before committing. 99ile's review already highlights the paragraphs that settle a question; it does not say which line,
and nothing asks the student to look for it.

## What the student does
- **While solving (library and the RC of the day), optional.** After choosing an option, "Prove it: tap the line"
  turns the passage's sentences into tap targets (on a phone the passage pane opens). One tap marks a line; the
  question shows it with Change and Remove. It never blocks moving on and does not change the score.
- **In the review.** Each question that has a deciding line shows a verdict for the line the student marked:
  - **That's the line** when it is a deciding line;
  - **Right paragraph** when it is in a paragraph that settles the question, with the deciding line shown;
  - **That line doesn't settle it**, with the deciding line shown.
  Without a marked line the review still shows the deciding line. In the passage the deciding line is marked inside
  the highlighted paragraph, and the student's own line, when different, is underlined.
- **The summary** says how many of the marked lines were deciding lines.

## Why this shape
- Pointing at evidence is a form of self-explanation and retrieval before feedback, both high-utility techniques
  (Chi on self-explanation; Dunlosky et al. 2013 on practice testing), and it trains the CAT habit directly (near
  transfer: `reports/Puzzle games for CAT reasoning.md`).
- **Optional and score-neutral**, because a timed set must not get slower by force, and a student who already knows
  the answer should not be made to prove it.
- **One tap, whole sentences.** Free-text highlighting is fiddly on a phone and impossible to mark fairly; a sentence
  is the unit students already reason in.
- **Code checks the tap.** A student's line is compared with stored deciding lines, never judged by AI.

## The content
- Each RC question may carry `lines`: one or two exact sentences of the passage that settle the answer. None where no
  line or two settle it (most paragraph-function and EXCEPT questions, a main idea spread over the passage, a tone
  question with no telling line); those questions do not offer Prove it.
- **Sentences** are cut by one rule (`practice/sentences.ts`): a stop before a space and a capital, unless the word
  before is a known abbreviation. A content test holds every `lines` quote to exactly one sentence of its passage.
- **How the 251 existing questions got their lines:** two markers chose each question's deciding line independently,
  blind to each other. Where they agreed, the line was kept; where they differed, the owner's reviewer (Claude, in the
  session) read both and the question, and chose. The same rule as DI sets (two independent solvers).

## The data
- `RcQuestion.lines?: string[]`.
- `RcAttempt.lines?: ([paragraph, sentence] | null)[]`: the line marked per question; synced with the attempt.

## Not in this version
- **Trap lines** (the sentence that makes a wrong option tempting) and **contesting an answer** with public counts and
  re-review, from the same report: next, once students use the marking.
- The timed sectional and the redo queue: the sectional stays exam-like; the redo review can show the deciding line
  later.
- A skill tile for "finding the evidence" on Progress: once enough marked lines exist (F89's rule: 8 attempts).
