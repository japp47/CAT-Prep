# LR drill content

The three LR drills (F83 to F85, D47) read three JSON files in `content/lrdrill/`. Answers are never typed: `src/practice/lrlogic.ts` works them out, and `src/practice/lrdrill.test.ts` checks every file.

## Clue expressions

A clue is an expression over refs: a person, or an attribute's value ("Pune", "teacher"). Seats count from 1.

| Expression | Means |
|---|---|
| `{ "at": "X", "seat": 3 }` | X sits in seat 3 |
| `{ "end": "X" }` | X sits at an end of the row |
| `{ "left": "X", "of": "Y", "d": 1 }` | X is d seats to Y's left (`"any"`: somewhere to the left, rows only). `right` likewise |
| `{ "next": ["X", "Y"] }` | next to each other |
| `{ "opp": ["X", "Y"] }` | opposite (a table with an even number of seats) |
| `{ "gap": ["X", "Y"], "n": 2, "cmp": "ge" }` | n people between (the short way round a table); `cmp` `ge` at least, `le` at most |
| `{ "same": ["X", "Y"] }` | the same person (the person from Pune is Divya) |
| `{ "between": "X", "of": ["Y", "Z"] }` | somewhere between Y and Z in a row |
| `{ "within": "X", "from": 2, "to": 6 }` | in a seat between seats 2 and 6 (not 2 or 6) |
| `not`, `and`, `or`, `xor` (either but not both), `{ "if": …, "then": … }` | joins |

Left and right are the person's own: in a row facing the same way as the reader, left is the lower seat; a round table's seats are numbered round to the left of someone facing the centre (as the set pictures do). A board says `"facing": "toward"` (a row facing the reader) or `"out"` (a table facing outward) when it differs.

## `models.json`: sets as code

`{ set, board: { layout, n }, groups: [{ name, values }], clues: [expr, …] }`, the people first, then each attribute, every group as large as the number of seats; one expression per clue, in order. The test solves the model and checks the number of seatings and each against the set's `solution.cases` and final table.

## `clues.json`: the clue translator

Ids start with their kind: `oi` only if, `un` unless, `if` if and only if, `ei` either/or, `co` exactly/at least/at most, `im` immediately or somewhere, `bw` between, `fa` facing. At least ten of each.
- A two-part rule: `p`, `q` and their negatives `np`, `nq`, and `rule` (`if`, `onlyif`, `unless`, `iff`, `or`, `xor`, `nand`, `nor`). The student taps the cases it rules out.
- A seating clue: `board`, `fixed` (who sits where), `who` (the one to place), `expr`, and `traps`, the misreadings to name (`swapped`, `somewhere`, `immediately`, `seats-for-people`, `people-for-seats`, `at-least`, `at-most`, `exactly`, `either-side`, `inclusive-ends`, `next-to-one`). Each must change the answer.
- Optional `why` (one or two plain sentences) and `from` (a set id, when the clue is that set's).

## `mcc.json`: must, could, cannot

`{ id, set, drop: [clue numbers left out], statements: [{ text, expr }] }`: a modelled set with clues dropped so that 2 or 3 seatings fit, and six statements covering all three bins.
