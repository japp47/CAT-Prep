# Coming back to a set, and a lighter pick in the Arena (4 Nov 2026)

Two changes the owner asked for on 4 Nov 2026: a set left for a long while should not quietly carry on with a paused timer, and the Arena should not feel like a form before solving. Findings A68 to A70 and decision D83 in `docs/analyze.md`. Planned 4 Nov 2026, built 5 Nov 2026 (see "As built" at the end).

## 1. Coming back to an unfinished set

### Today
- **RC, VA, CR and LR (with DI) sets** keep a draft in `lib/draft.ts`: answers, notes, the scratch pad, the question open. The timer stops while the student is away and carries on from the same minute on return, with a line saying so. A draft older than a day is dropped without a word.
- **The Arena and the timed sectional** never stop their clock, as in the exam.
- **An Arena round left past its 40 minutes** submits itself the moment the student opens the page again, hours or days later, and counts in the selection score even if nothing was answered (A70).

### What is wrong with it (A68, A69)
- **The time stops being true after a long break.** The set was on the student's mind while away, so minutes per question, "within the target time" and speed on Progress read better than the student really is.
- **The attempt may not be the student's own.** After hours away they may have seen a solution or asked someone. The redo queue, Error log and skill map then learn from it as if it were a clean try.
- **A short break should not cost anything.** A call, a switched app or a mistaken Back is not a choice to abandon the set; losing ten minutes of work for it would make students distrust the timer.

### What we build (D83)
- **Within 30 minutes away:** carry on as now, with the line "Your answers are back. The timer paused for 6 minutes."
- **After more than 30 minutes away** (measured from the draft's last save, which is the moment the student left), the set opens on a short choice instead of the questions:
  - "You left this set 3 hours ago. Starting fresh gives you an honest time and a clean attempt."
  - **Start fresh** (the one filled button): the draft is dropped, notes and scratch pad included, and the set starts at zero.
  - **Continue where I stopped** (a quiet button): the work comes back, and the attempt is saved as **interrupted**. Its answers count as usual (right, wrong, redo queue); its time does not: minutes per question, the target-time verdict and the speed figures leave it out, and its review says "You took a 3-hour break in this set, so its time is not counted."
- **Older than a day:** dropped as now, but the set says so once ("Your unfinished attempt from yesterday was cleared") instead of starting blank without a word.
- **Same rule in every player** (RC, VA, CR, LR and DI), so students learn it once.
- **Why 30 minutes:** long enough for a call or a short break; short enough that a student cannot study the set and come back. One number for every set, not a setting.

### The Arena when its clock ran out while away
- On return, the page says "The 40 minutes ended while you were away" and offers the **debrief** when at least one question was answered; the round counts, as the exam would. With nothing answered, the round is **set aside**: it does not count in the selection score, and its sets go back to the pool.
- While the clock still has time, the round carries on as now, the clock having kept running.

## 2. A lighter pick in the Arena

### Today
After the deal, the student opens sets in the pick strip and taps "Pick it 1st", "Pick it 2nd" and so on, may mark sets "Leave it", may guess minutes and right answers, and can start solving once at least one set is picked. Only one pick is required, but the screen reads like a form to fill.

### Why the pick stays (owner's question, answered 4 Nov 2026)
- The Arena trains choosing; without a choice made before solving it is a plain timed section, which a past paper already gives.
- The debrief compares a prediction with what happened. A pick stated after solving is hindsight; only one made before is honest.
- It stops the commonest slip: starting set A without reading the other four.

### What we build (D83)
- **One tap to start.** The open set's panel gets **Start with this set**: it picks that set first and starts solving. Picking an order, leaving sets and guessing stay, folded under "Plan the rest (optional)".
- **A gentle nudge, not a gate.** Beside the button: "You have read 2 of the 5 sets", from the sets already opened. Nothing blocks starting.
- **The order counts even when not stated.** For the debrief and the selection score, the order is the sets the student picked, then the rest in the order they first opened them while solving. A student who taps once and then works through the sets still gets a selection score from what they actually did. (Changes D60, which used stated picks only.)

## What stays out
- A pause button in the Arena or the sectional: their clocks never stop, as in the exam.
- A setting for the 30 minutes.
- Bringing back attempts already cleared.

## Order of work
One branch, `feat/resume-and-quick-pick`, about a day and a half:
1. The draft keeps when the student left; the shared "start fresh or continue" choice; `interrupted` on RC, VA, CR and LR attempts, and the time-based figures that skip it.
2. The Arena: the round that ended while away; Start with this set; the order from picks, then from first visits.
3. Tests: the 30-minute boundary, the choice in each player, the time figures skipping interrupted attempts, the Arena's set-aside round and its order.

## How we will know it works
- A set reopened after an hour shows the choice; one reopened after five minutes carries on.
- An interrupted attempt's answers are in the redo queue, and its minutes are nowhere in the time figures.
- In the Arena, one tap starts solving, and a round with one pick still shows a selection score.

## As built (5 Nov 2026)
- **The door.** `ComeBack` in `pages/practice/common.tsx` wraps the RC, VA, CR and LR (with DI) players: it reads the draft before the player mounts, so the player loads exactly what was chosen. The draft's `at` (its last save, made on leaving) gives the time away; `comeBack(at, now)` in `lib/draft.ts` holds the 30-minute rule.
- **Interrupted** is stored as `away` on the attempt: the seconds of the breaks the student carried on after. It stays with the draft through later short breaks and is cleared by Start fresh or Start over. History leaves the attempt's minutes out of the day ("time not counted after a break"); the score card shows "Not counted" and says why; the DI review drops "Where your minutes went"; RC drops the reading pace; the Arena ignores such an attempt as a set's later result, since its result is marks a minute.
- **A cleared draft** is noted in a second key (`cat-prep-drafts-cleared`, practice drafts only, kept a week) and said once above the set.
- **Set aside** means the round is never saved: nothing to score, and its sets were never marked seen, so they go back into the deal.
- **The pick.** "Start with this set" is the look screen's one filled button, with "You have read 2 of the 5 sets" under it; picks, leaving and guesses sit under "Plan the rest (optional)", open once anything is planned. The bar's button is "Start in my order" once a set is picked. `solveOrder` in `practice/arena.ts` makes the saved order: the picks, then the sets gone to while solving, a left set staying left.

