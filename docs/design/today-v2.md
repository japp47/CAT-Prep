# Today, version 2 (30 Oct 2026)

Decision D55 in `docs/analyze.md`. The first page of the page-by-page redesign the owner asked for ("every page redesigned, modern, with animation or 3D where it means something"). Today goes first because it is the page a returning student opens every day, and it carries the product's main promise: a plan that fits your day.

## What is wrong today (audit, 1440 and 390 px, both themes)

| Problem | Effect |
|---|---|
| On a phone the first screen is a caption, the date, a sign-in banner and a "start here" card; the timetable starts on screen two | The plan, the page's reason to exist, is below the fold |
| Three things ask to be done first: "Start here", the sign-in banner and the first block | The student has to decide before doing anything |
| Every block is open, with its links, focus timer and log form, all at once | One section's plan is a screen and a half of chips; the next step does not stand out |
| Progress for the day is one line of text ("Done today: 5 min") and a small "1 core task left" tag | Nothing shows how far through the day the student is, or rewards finishing a block |
| "DILR and Quant timetables are coming soon" | DILR has 47 sets, three drills and a redo queue, and none of it is in the plan |
| "This week" and "Must-do resources" are two equal boxes at the bottom | The week reads as an afterthought; the resources list is a reading list, not today's work |

## The design

One idea: **the day as a path you walk.** A ring at the top shows how much of today is done; the next block is one large card with the page's only filled button; the rest of the day is a short list below it; finished blocks fold away with a tick.

### Desktop (1440)

```
 Today                                              🔥 4-day streak
 Friday 30 Oct · Foundation, phase 1 of 5

 ┌────────────┐   Up next                                       25 of 70 min
 │   ◜‾‾‾◝    │   ┌──────────────────────────────────────────────────────────┐
 │  (  36% )  │   │ VARC · 20 min                                            │
 │   ◟___◞    │   │ One RC, untimed                                          │
 │ 25 of 70   │   │ Take your time; afterwards, write why each wrong option  │
 │  minutes   │   │ is wrong.                                                │
 └────────────┘   │ [ Start the RC of the day ]   Cracku RC bank ↗   timer   │
                  └──────────────────────────────────────────────────────────┘
 M T W T F S S
 ● ● ○ ● ◐ · ·    The rest of today
                  ○ VARC   Vocabulary                         10 min   ›
                  ○ DILR   Set of the day: Eight in a family  14 min   ›
                  ○ DILR   Clue translator                     3 min   ›
                  ✓ VARC   Read one article                   30 min   (done)
```

### Phone (390), first screen

```
 Today                 🔥 4
 Fri 30 Oct · Foundation
 ◐ 25 of 70 min ────────────────

 Up next · VARC · 20 min
 One RC, untimed
 Take your time; afterwards…
 [ Start the RC of the day ]

 Later today
 ○ Vocabulary            10 min
 ○ DILR set of the day   14 min
```

The ring, the next block and the rest of the day all fit the first phone screen.

### The parts

1. **Header.** "Today", the date and the phase in one quiet line; the streak badge stays. The phase's long description moves into Plan (one tap on the phase name).
2. **Day ring.** Minutes done out of minutes planned, as a ring (desktop) or a bar (phone). It fills when the page opens and moves on when a block is ticked. Under the ring, the week as seven small dots: full, partial, missed (never red), or ahead; tapping a dot opens that day, replacing the date arrows.
3. **Up next.** The first unfinished block, core blocks first: section, minutes, name, one line of what to do, and the page's one filled button, which goes straight to the practice that does it on this site (the RC of the day, the drill, the set of the day). Outside links and the focus timer sit beside it, quieter. "Something else" picks the next block instead.
4. **The rest of today.** One row per block: a tick circle, the section, the name and the minutes. A row opens in place to show its links, the timer and the log form; only one is open at a time. Done blocks move to the bottom, struck through and muted.
5. **DILR in the plan (F22).** Each day gets DILR blocks from the phase: in Foundation a set of the day (the next set by the practice order) and one drill (the clue translator, or the drill the last post-mortem suggested), from Build on two sets. DILR redo questions, when due, join as their own block. The "coming soon" note goes.
6. **After the day.** When every block is done, the ring completes and the card becomes "Day done": what was done and a link to History; tomorrow's first block as a preview. The sign-in nudge moves here, after a finished day, instead of above the plan.
7. **Set up your prep (D57).** Not a list of resources but the phase's one-time jobs from both sections (official site, a course, a book, a reading list; mock series later), with ticks shared with the Learn tabs, a count and a bar, folded to one line when done.
8. **Blocks tick themselves from on-site work (D57).** An RC set, the VA drill, an LR set or a drill done on this site ticks its block, shown as "done on the site" with the score; a block the student unticks stays unticked.

## Motion (GSAP through `lib/motion.ts`; nothing under reduced motion)

- On open: the ring's arc draws to today's share (0.8 s, ease out); the up-next card and the rows rise in once, in order (one orchestrated entrance, not per section).
- Ticking a block: the circle's tick draws itself; the row slides to the done group (a FLIP move: measure, reorder, play the difference); the ring advances by that block's minutes; the next block takes the up-next card with a short cross-fade.
- Finishing the day: the ring closes, and one highlighter sweep runs under "Day done". Nothing else celebrates.
- Opening a row: its height eases open (the DILR practice groups already do this).

Technique notes taken from motion.dev (layout animation, path drawing) and re-expressed in GSAP, as the `frontend-reference-sites` skill says. No new library.

## 3D

None on Today. A 3D object here would mean nothing and cost three.js on the page opened most. 3D stays for where depth carries data (the round table; later, optionally, the skill map, D51).

## Type

Keep Schibsted Grotesk for the interface and Source Serif 4 for long reading. They are already modern, the headline style is set across the site, and the font budget (95.5 of 100 KB) leaves no room for a third face. What changes is how they are used on this page: a larger, tighter display size for "Up next" and the ring's number, tabular figures for minutes, and fewer sizes in all (four on the page).

## What stays the same

The planner engine and its rules (blocks, carry-over of one missed block, minutes per day), the log form, the focus timer, sync and History. The redesign is the page and the DILR blocks, not a new planner.

## Done when

- On a 390 px phone, the ring, the up-next block with its button and at least two later blocks are on the first screen.
- The page has one filled button; every other action is quieter.
- DILR blocks appear from the phase rules, and ticking them counts in the ring, History and the streak.
- Both themes, desktop and phone, checked in a browser; the stylesheet stays under its budget (D54) and the main script under 150 KB.
- Tests for the up-next choice and the DILR blocks (pure functions, like the planner's).

## After Today

The same treatment, one page at a time, in this order: Progress (with the skill map, F89), Practice, the section pages (VARC, DILR), Plan.
