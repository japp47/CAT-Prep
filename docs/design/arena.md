# Set Selection Arena (F56), 30 Oct 2026

Decisions D58 to D62 in `docs/analyze.md`. The first new page built in the Today v2 language (D55): one idea per screen, one filled button, tone instead of borders, nothing under reduced motion. **No 3D (D62, owner, 30 Oct 2026).** The one memorable thing is the **pick strip**: five set tiles that say where each stands (picked 2nd, leaving, read, not read), and above them the order as five slots that fill as the student picks. GSAP only where it answers an action or happens once: the deal, a slot popping in, the debrief's bars growing.

## Why

Toppers say the DILR score is decided in the first five minutes, by which sets are picked ("set selection is half the section": `docs/research/lr.md` §1, §8). We train solving with 47 sets, three drills and a redo queue, but nothing trains or measures the choice. No free product does. CAT 2024 and 2025 gave **five sets, 22 questions, 40 minutes** per slot (IMS, Collegedunia), and only one to three are fully doable, so a round here is five sets, not the four the first spec said.

## The round, in four screens

### 1. Deal (before the clock)
One line on what happens ("Five sets you have not seen. 40 minutes. Look, pick your order, then solve"), the round's number, and **Start the round** (the only filled button). The five cards deal in with one GSAP stagger.

### 2. Look and pick (the clock is running)
The scan is part of the 40 minutes, as in the exam. Each card shows the set's story, clues and questions, read-only, with its letter (A to E), the number of questions and the MCQ / TITA split. **No type label and no difficulty**: reading the set to judge it is the skill.

- Desktop: the five cards as a row of tabs over one reading pane; a "Your order" column on the right.
- Phone: swipe between cards; "Your order" is a sheet that rises from the bottom.
- Picking: tap the sets in the order you would do them (1, 2, 3 …) or mark one **Leave it**. For each picked set, two quick guesses: minutes (5, 10, 15, 20, 25+) and how many right (0 to n). Guesses are optional; the order is not.
- At 4 minutes a quiet line: "Most toppers start solving by now" (research: scan 3 to 5 minutes). Never a forced stop.
- **Start solving** fixes the order and guesses. They are saved; the student cannot change them later.

### 3. Solve
The LR attempt screen as it is (clues left, pad and questions right; pad first on a phone), with a **set bar** on top: A to E in the student's order, each showing answered of total, the open one in tone. Switching sets is one tap and is recorded (a visit = set, start, end). The clock counts down from 40:00; at 0 the round submits (same rule as D31's hard stop). **Submit the round** asks to confirm if any picked set is untouched.

### 4. Debrief ("Your picks against what happened")
Top to bottom, one idea each:

1. **Score:** marks out of the maximum, counted up (`ScoreCard` motion).
2. **The 40 minutes:** one lane per set, bars for each visit on a 0 to 40 axis (reuses `TimelineFigure` with a made-up `LrDiagram`), switches visible as gaps. Draws in left to right once.
3. **Guess against reality:** a row per set: guessed minutes vs taken, guessed right vs got, in plain sentences built by code: "C looked like 10 minutes and took 19 for 1 right." "You left B. Our estimate: 9 minutes, 5 questions." (Labelled "our estimate" until real student times exist; never "most students".)
4. **The set that cost most:** of the sets given three minutes or more, the one with the fewest marks a minute ("C, 19 minutes for 1 right"). Only facts we recorded; no invented "would have earned 6 more marks". (Per-question answer times are not recorded, so "minutes after the last right answer" was dropped when built.)
5. **Selection accuracy** for this round (definition in D60), with "not enough sets to judge yet" when fewer than three pairs.
6. Next: **Review the sets** (each set's normal review, walkthrough and post-mortem), and the sets left unsolved, each with **Solve it now**.

## Data

`ArenaRound` (new list `arenaRounds`, sync kind `arena`, write-once: saved once at submit):

```ts
interface ArenaRound {
  id: string; d: string; updatedAt: number;
  sets: string[];                    // the five, in deal order (A to E)
  order: string[];                   // picked sets in the student's order
  left: string[];                    // marked "Leave it"
  guess: Record<string, { min?: number; right?: number }>;
  look: number;                      // seconds from the deal to Start solving
  visits: [set: string, from: number, to: number][]; // seconds from round start
  attempts: Record<string, string>;  // set -> LrAttempt id, for sets with any answer
  secs: number;
  replay?: boolean;
}
```

**As built (30 Oct 2026):** picking keeps the set open so its guesses can follow, with "Next set" to move on; "Leave it" moves on at once. Card labels are round letter tags with the slot number, pinned to each card's near edge. A set answered in the round is saved with its time from the visits; a set looked at for a minute or more and left blank counts as 0 marks in that time. Sets of separate short puzzles (no shared clues or tables, `apart` in the catalog) are never dealt: 38 of 47 sets can be.

Each set with an answer is also saved through `recordLr` (an `LrAttempt`, a DILR practice row, redo items, the LR block's auto tick), so History, Progress and Today count it with no new code. A set opened but not answered, or left, is **not** an attempt: it stays untried in the practice order, and the practice list shows "seen in the Arena".

## Rules (pure functions in `practice/arena.ts`, tested)

- `pickRound(catalog, lrAttempts, rounds, seed)`: five sets never attempted and never dealt before; spread over at least three types, at most one easy, so a round has a set worth leaving; stable for a seed so a reload deals the same round. Fewer than five such sets: offer a **replay round** of sets last tried 30 or more days ago, labelled as such; their results do not count towards selection accuracy.
- `selectionAccuracy(round, lrAttempts)`: pairs of sets with a result; a pair is right when the set picked earlier returned at least as many marks per minute. Left sets get a result when the student later solves them in practice ("reality arrives later"), so a round's accuracy can be completed after the round.
- `debrief(round, sets, attempts)`: the sentences above, from numbers only.

## What stays out

- No 3D (D62).
- No leaderboard and no "most students" until synced aggregates exist (server work, later).
- No DI sets yet: rounds are LR-only until DI sets join (step 4), and the deal screen says so in one line.
