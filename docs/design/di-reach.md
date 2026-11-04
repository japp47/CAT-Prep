# DI reaches students: the day's plan, the Arena, the skill map (4 Nov 2026)

Step 4d, the half of DI part 2 that puts the DI sets in front of students (the other half is six harder sets). Findings A63 to A67 and decision D82 in `docs/analyze.md`. Owner, 4 Nov 2026: "plan accordingly, and analyse as a product founder and for students".

## Why now

Foundation started on 17 Oct 2026, so most students are in week 3. The DILR page's own start path says weeks 4 and 5 are data interpretation basics, which begins on **7 Nov 2026**. Today nothing on the site sends a student to a DI set: the plan's set of the day is logical reasoning only until about 47 LR sets are done, and the Arena deals DI by chance with no calculator. A student who follows our plan reaches CAT with DI practised only if they go looking for it.

## What we found

**For students**
- **The day's plan hides DI (A63).** "LR set of the day" takes the next set in the practice order, which runs type by type with the two DI types last. At one or two sets a day that is five to seven weeks before the first DI set, against the DILR page's "weeks 4 and 5: DI basics". The plan and the page disagree, and the plan wins because it is what students do.
- **The Arena deals DI without CAT's calculator (A64).** The pool already includes the six DI sets (no type filter), so about one round in two deals one, but the calculator lives only in the set player. A student solves a trade or GDP set by hand under the clock, which the exam never asks. The deal screen still says "data interpretation sets join when they arrive".
- **DI is under-dealt (A65).** In the seven CAT slots on our slot table, 13 of 35 sets were data sets (37%); in our pool they are 6 of 44 (14%), dealt at random. A round can have none when the exam would have two.
- **The skill map cannot say where DI marks go (A66).** Charts and Tables appear as two tiles among the LR set types. DI marks are lost by question kind, not picture: the wrong base for a percentage, compounding, the edge of a rounded range. Nothing on Progress reads that.

**For the product**
- **Supply is the limit (A67).** Six DI sets now; six more from us and up to 19 from the owner by mid-January. A DI set every day would empty the bank in under two weeks. The habit has to survive an empty bank, or students learn that the DI block is often blank.
- **We already own the fallback.** The DILR page has a ladder of 12 past CAT DI sets, easiest first, each tickable (D77). Pointing the DI block at it when our bank is used up keeps the habit and teaches with real papers.
- **The calculator log and minutes per question** (F95) already work for any set in the player; the Arena only has to open the same calculator.

## What we build (D82)

### 1. DI set of the day in the plan
- **The block.** A new block, "DI set of the day" (`go: "di-next"`), beside "LR set of the day". The LR block becomes LR only (`nextLrSet` skips DI types), so neither starves the other.
- **The rhythm**, following the start path:
  - Foundation, weeks 1 to 3: LR only, as now.
  - Foundation, weeks 4 and 5: one DI set and one LR set every day.
  - Foundation from week 6, Build and Apply: the weekday "two LR sets" become one LR and one DI set on Monday, Wednesday and Friday; weekends unchanged. That is about three DI sets a week, the share CAT gives DI.
  - Mock phase: one LR and one DI on weekdays. Taper: the one easy set alternates LR and DI.
- **What it opens**, in order:
  1. Our next DI set not yet tried: easiest first, and charts and tables taking turns, so a week meets both pictures.
  2. When none is left: the next unticked set on the past CAT DI ladder. The block names it ("CAT 2021, slot 1: sales across subcategories") and links to the paper, with "tick it on the DILR page when done".
  3. When the ladder is done too: retake a DI set with a missed question, from the redo queue.
- **Ticking.** The block ticks itself on a DI attempt that day (the same `siteWork` rule as the LR block, which now counts LR sets only). A ladder set is solved on 2IIM's site, so the student ticks that day's block by hand, as with any block done elsewhere; ticking the set on the DILR page moves the block on to the next one.

### 2. The Arena deals DI as CAT does
- **Calculator.** The solve screen gets the player's Calculator button and panel; its log is kept on the set's attempt, as in the player.
- **The deal.** At least one DI set in every round when any fresh DI set is left, and never more than two; the rest LR. Over a run of rounds this gives about 30 to 40% data sets, close to CAT's 37%. When fresh LR sets are too few for three, the round is a replay of sets last seen a month or more ago; when even those are too few, no round is dealt, and the page points to a past paper's DILR section. A round of mostly DI sets would train the wrong picking habit (owner, 4 Nov 2026, saw a round of only DI sets once most LR sets were tried: the fill step had topped up with DI).
- **Text.** The deal screen says what a round holds ("This round: three logical reasoning sets and two data interpretation sets, about CAT's mix."), and the rules say the calculator is in the bar. The dealt five are shuffled again, so DI sets are not always sets A and B.

### 3. Data interpretation on the skill map
- **A family of its own**, "Data interpretation", after "Set types": the Charts and Tables tiles move here, joined by four question-kind tiles:
  - **Reading and comparing:** read, count with a condition, which is largest.
  - **Percentages and bases:** change, share, ratio, the reverse question that finds the base.
  - **Growth and projections:** compounding, years to a threshold, what-if additions.
  - **Ranges and extremes:** least or most possible, must or could be true, how many can be determined.
- **Data.** Each DI question carries `dk` (one of the four), checked by a test so no DI question ships without one. The 30 DI questions now in the bank are tagged in this branch.
- **Verdicts stay honest.** A kind tile judges at eight answers, as every tile does (D51), so a student meets about six DI sets before the kinds say weak or strong. Each tile links to the DI guide that teaches that kind.

## As built (4 Nov 2026, branch 1)
Today on a DI day shows "DI set of the day" first ("Start Containers at five ports", "DI practice" opening the DI half with `?half=di`, "DI guides"), then the LR set and the drill, 30 minutes in all. The ladder is its own module (`sections/dilr/ladder.ts`), so Today does not load every DILR resource for one fallback. The practice page's "next set" falls back to the next DI set once every LR set is tried. Found while building: an LR attempt keeps right and wrong only as totals, so the skill map's question kinds need each attempt to keep which questions were right (branch 2).

## What stays out
- The DI drills (F91 read the chart, F93 fill the table): step 4.3.
- DI in the full sectional and mocks: they use past papers.
- Changing LR's own order or the Arena's other rules.

## Order of work
1. `feat/di-in-plan-and-arena`: the plan block and its fallbacks, LR block LR-only, auto-tick, the Arena calculator and deal rule, the deal text. About two days.
2. `feat/di-skill-map`: `dk` on every DI question, the family and its four tiles, links. About one day.
3. The six harder DI sets (`feat/di-sets-part-2`), each solved by two agents (D79).

## How we will know it works
- A student in Foundation week 4 sees a DI block on Today every day, and it opens a set or a ladder paper, never nothing.
- Every Arena round with fresh DI left deals one or two DI sets, and the calculator opens in the solve screen.
- After six DI sets, Progress names the DI question kind that costs the most marks.
