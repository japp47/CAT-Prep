# DILR page, version 2 (1 Nov 2026)

Decision D78 in `docs/analyze.md`. Part of the page-by-page redesign (D55: section pages after Today, Progress and the sidebar). The owner, after DI resources were added (D77): "the DILR page looks scattered, as it was built for logical reasoning; check all the tabs." No 3D (D62): this is a reading and reference page.

## What is wrong (audit at 1440 and 390 px, 1 Nov 2026)

| Tab | Problem | Effect |
|---|---|---|
| Learn | 8,400 px on a desktop, 14 screens on a phone. LR facts, a 2017–2022 topic table, seven LR guides, three DI guides, the LR set-type guides, then LR courses, DI courses, and books for both | LR and DI interleave; a student cannot tell where one ends |
| Learn | "Start here" is below every guide | The first thing a beginner needs is the last thing on the page |
| Learn | The topic table stops at 2022; its rows mix LR and DI labels used nowhere else | Out of date, and a percentage nobody can act on |
| Learn | An LR set-types table, no DI counterpart | DI looks like an afterthought |
| Practice | Warm-up puzzles (weeks 1–3) last, after mocks; LR by topic, video sets, DI by topic, the DI ladder, papers, timed sections, harder, mocks | The order is the order things were added, not the order to use them |
| Watch | "YouTube" beside "Data interpretation on YouTube"; Elite's Grid "for December onwards" | Headings that do not say what is in them; a stale line |

## The design

One idea: **one path through the section, then the two halves side by side.**

### Learn
```
 The section                      format, marking, 99 target, time split
 Recent slots, set by set         seven real slots, data sets and logic sets named
 How to start: LR and DI together (open)  weeks 1–3 LR basics, 4–5 DI basics, 6–12 sets by topic, Build
 Start here, for both             official site, strategy, set selection, analysing a section

 [ Logical reasoning | Data interpretation ]      ← one switch, remembered (pref dilrPart)

   Logical reasoning                    Data interpretation
   Set types table                      Pictures table (tables with blanks, bars, lines and
   Six guides (read clues, draw,          cumulative lines, shares, two linked charts,
     questions, counting, choosing,       special charts, text-only data)
     studying a set)                    Two guides (calculate as exactly as the options
   A guide for each set type              need; read the chart before the numbers)
   LR courses, LR books                 DI start here (course, calculation, primers), DI books
```
- **Recent slots, set by set** replaces the 2017–2022 percentages: seven slots from 2021 to 2025 read from the papers (`docs/research/di.md` §1 and 2IIM), each row naming its data sets and logic sets. It shows what a percentage hid: 2024 slot 3 had four data sets, 2022 slot 1 none, so neither half can be skipped.
- **The switch** is the kit's `Segmented`; it filters the guides, tables and the Learn tab's resource lists by a `part` on topics and categories. Search still finds everything. A `?guide=` link opens the LR side.
- **How to start** merges "Starting from zero" (LR) and "Data interpretation: how to start" into one week-by-week path, so DI has a place in time, not only a list.

### Practice, in the plan's phases
```
 Practice on this site (card)
 Foundation, now                  ← "now" from today's phase
   Warm-up puzzles · Logical reasoning sets by topic · Data interpretation sets by topic
 Build and Apply
   Sets with video solutions · Past CAT DI sets, easiest first · Timed sections · CAT past papers
 Mock phase
   Mock tests · Harder practice
```
A category carries `group`; a heading with one line of when-and-how starts each group, the current phase marked "now" in words (no highlighter: it stays on must-dos).

### Watch
"Channels for both" and "Data interpretation, solved"; Elite's Grid's line fixed.

### Toppers
Unchanged: its accounts cover the whole section.

## Phones
The three reference tables (recent slots, set types, DI pictures) are stacked rows below the tablet width: a name, then two short lines. Learn is about 11 screens on a phone with the guides folded (was 14), most of it the guide for each set type and the lists.

## Motion and rules
None added: the switch changes content in place. No text under 14 px, tone not borders, one filled button (the practice card's), nothing moves under reduced motion.
