# LR solution pictures for every type (30 Oct 2026)

Decision D53 in `docs/analyze.md`. The arrangement, tournament, route and Venn sets explain themselves with a picture that fills in step by step. The newer types (binary logic, directions, scheduling, distribution, blood relations, clocks and calendars) mostly got a plain grid, and the sets made of separate short puzzles got no picture at all. This note says what each type should show and how it moves.

## Principles

1. **Draw what a topper draws on paper.** A family tree for relations, a clock face for clocks, a map for directions, bars on a timeline for scheduling. The picture is the method, not decoration.
2. **One change per step, and only that change moves.** A new person drops into the tree, a leg of a walk draws itself, a hand sweeps to its new time, a bar grows. Everything already known stays still.
3. **Every question can have its own picture.** Sets of separate short puzzles (clocks, relations) explain each question with a small picture that steps with its explanation, one picture per line.
4. **Never give the answer away on the scratch pad.** The attempt's pad uses the same layout blank. A layout that would show the answer when blank (the lines of a family tree, a map of where people stop, bars on a timeline) sets `pad: false`: the attempt then shows the notes box alone.
5. **Same rules as everything else:** text stays HTML or SVG text at 14 px or more, colours are tokens, nothing moves under reduced motion, GSAP loads on demand, no new library.

## What each type gets

| Type | Picture | How it moves |
|---|---|---|
| Blood relations | `tree`: people by generation, a double line for a marriage, an elbow line from a couple to each child; each person's sex as a word under the name | People appear as a clue places them; a marriage or child line draws itself |
| Clocks | `clock`: one or more dials with both hands at a time, and the angle between them shaded with its size | Hands sweep from the last time to the new one; the angle shades in |
| Calendars | A month as a grid (Monday to Sunday), with the days that matter in tone | New cells pop in |
| Directions | `map`: north up, metres on a light grid, the start marked, one path per walker | Each leg draws itself; a dashed line shows a distance a question asks for |
| Scheduling (machines, crews) | `timeline`: one lane per machine or crew, a bar per job from start to end on a time axis | Bars grow from their start in the order they are placed |
| Scheduling (task networks, clashes) | The network picture, as now | As now |
| Distribution | `bars`: one bar per person, its height the amount | Bars grow to their new height |
| Binary logic, selection | The grid, with `tones`: "true" and "truth-teller" in green, "false" and "liar" in red | As now |

Question pictures (`fig` on a question) use the same layouts, with one frame per line of the explanation. In the review, the explanation shows one line at a time beside its picture, with Previous and Next.

## Data

Additions to `LrDiagram` (docs/content/lr-format.md has the full shape): `pad`, `tones`; for `tree` the network fields (`at`, `links` with label "=" for a marriage, `lit` per step); for `map`, `paths` (each walker's points in metres east and north) and per step `legs` (how many legs of each path are drawn) and `ties` (dashed distance lines); for `timeline`, `span` and `bars` ([lane, start, end, label]) with `lit` per step naming the bars shown; for `clock`, one dial per seat with a frame line such as "8:24" and an optional angle line such as "108°"; `bars` reads the number at the start of each frame line. Questions get an optional `fig` with one frame per `why` line.

## Not now

A 3D view for any of these (D41 keeps 3D for where depth means something), animated walkers moving along their paths, and calendar pictures beyond a single month.
