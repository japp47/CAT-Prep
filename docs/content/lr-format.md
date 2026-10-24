# LR set format

How a logical reasoning set is stored (F23, research in `docs/research/lr.md`). One JSON file per type in `content/lr/` (`arrangement.json`, `tournament.json`…), each an array of sets, like RC in `content/rc/`. Tests check every set before it ships.

## Sending sets

Send them in any form (typed text, a document, a photo of handwritten notes). Claude turns each into this JSON and checks the answers by solving the set (by code when the set allows, as below). For each set, say:
1. **Where it came from.** Only sets you wrote, or have the writer's permission for, can go on the site (`source`). Sets copied from CAT papers or coaching material cannot.
2. The answers and, if you have them, the explanation. Missing explanations are drafted for you to check.

## Shape

```jsonc
{
  "id": "arr-round-table",          // unique, lowercase, a-z 0-9 and -
  "title": "Six friends at a round table",
  "type": "arrangement",            // arrangement | selection | distribution | ranking | tournament |
                                    // scheduling | binary | venn | routes | quant-lr | cubes | mixed
  "sub": "circular",                // optional finer kind, shown in the Library
  "difficulty": "easy",             // easy | medium | hard
  "minutes": 8,                     // target time
  "source": "original",             // "original", or "with permission: <who>"
  "since": "2026-11-02",            // the day it may join the daily rotation (as RC)
  "intro": ["…paragraph…"],         // the story, one string per paragraph
  "clues": ["…", "…"],              // numbered conditions; may be empty when the intro holds them
  "tables": [                       // optional data shown with the set
    { "caption": "…", "head": ["…"], "rows": [["…"]] }
  ],
  "questions": [
    {
      "stem": "…",
      "kind": "mcq",                // mcq | tita
      "options": ["…", "…", "…", "…"], // mcq only, four
      "answer": 1,                  // mcq: option index from 0; tita: a string ("2", "12.5", "BDAC")
      "uses": [1, 3],               // clue numbers (from 1) that settle it, highlighted in review
      "why": ["…step…", "…step…"],  // the explanation, one line per step
      "if": "…"                     // optional extra condition for this question only ("if additionally…")
    }
  ],
  "solution": {                     // shown in review
    "steps": ["First deduction: …", "…"],
    "grid": { "head": ["…"], "rows": [["…"]] }, // optional final table
    "cases": 1,                     // how many arrangements fit all clues (0 = left open on purpose)
    "diagram": {                    // optional picture: the review fills it in step by step, the attempt uses it blank as a scratch pad
      "layout": "row",              // row | circle
      "seats": ["1", "2", "3"],     // labels; a circle runs round to the left (clockwise seen from above) from the bottom seat
      "rows": ["Monday morning"],   // optional, row layout only: several rows (one per day, say)
      "note": "…",                  // shown under the picture; its first sentence also under the scratch pad
      "frames": [                   // one per solution step: frames[step][row][seat]
        [[["Asha"], [], null]]      // a seat lists lines, person first ("" if only an attribute is known);
      ]                             // [] = not known yet, null = known to be empty; a line ending in "?" is a possibility
    }
  }
}
```

**Rules the tests enforce:** 4 to 6 questions; MCQ answers within the options; TITA answers that parse when they are numbers; `uses` only names clues that exist; ids unique across all LR files; `source` present; `since` a date; a diagram has one frame per solution step and every frame has the right number of rows and seats.

**Checking a set before it ships.** Solve it by brute force (every arrangement of every attribute, filtered by the clues), then check each answer, each "must be true" option against every arrangement left, the `cases` count, and the last frame of the picture. The owner's first 25 arrangement questions were checked this way on 24 Oct 2026 (1, 2, 6, 3 and 2 arrangements, every key right).

## Example (original, checked by brute force)

```json
{
  "id": "arr-round-table",
  "title": "Six friends at a round table",
  "type": "arrangement",
  "sub": "circular",
  "difficulty": "easy",
  "minutes": 8,
  "source": "original",
  "since": "2026-11-02",
  "intro": ["Six friends, Asha, Bilal, Chitra, Dev, Esha and Farhan, sit at a round table with six equally spaced seats, all facing the centre."],
  "clues": [
    "Asha sits second to the right of Bilal.",
    "Chitra sits opposite Asha.",
    "Dev does not sit next to Bilal.",
    "Esha sits immediately to the left of Chitra."
  ],
  "questions": [
    { "stem": "Who sits opposite Bilal?", "kind": "mcq", "options": ["Asha", "Dev", "Esha", "Farhan"], "answer": 1, "uses": [1, 2, 3, 4],
      "why": ["Fix Asha's seat. Clue 1 puts Bilal two seats to Asha's left, and clue 2 puts Chitra opposite Asha.", "Clue 4 puts Esha on Chitra's left. Dev and Farhan take the last two seats; one of them is next to Bilal, and clue 3 keeps Dev out of it. So Dev sits on Asha's right, opposite Bilal."] },
    { "stem": "Who sits immediately to the right of Esha?", "kind": "mcq", "options": ["Chitra", "Dev", "Farhan", "Bilal"], "answer": 0, "uses": [4],
      "why": ["Clue 4 says Esha is immediately to the left of Chitra, so Chitra is immediately to the right of Esha. No other clue is needed."] },
    { "stem": "How many people sit between Farhan and Esha, counting the shorter way round?", "kind": "tita", "answer": "2", "uses": [1, 2, 3, 4],
      "why": ["Clockwise from Asha the seats are Asha, Farhan, Bilal, Chitra, Esha, Dev.", "Farhan and Esha are opposite each other, so two people sit between them either way."] },
    { "stem": "If clue 3 is dropped, how many seatings fit the remaining clues? (Seatings that differ only by turning the table count once.)", "kind": "tita", "answer": "2", "uses": [1, 2, 4],
      "why": ["Clues 1, 2 and 4 fix Asha, Bilal, Chitra and Esha.", "Dev and Farhan can take the two free seats either way round, so two seatings fit."] }
  ],
  "solution": {
    "steps": [
      "Facing the centre, a person's right is the next seat anticlockwise (seen from above).",
      "Fix Asha. Clue 1: Bilal is two seats to Asha's left. Clue 2: Chitra opposite Asha. Clue 4: Esha on Chitra's left.",
      "Two seats remain, beside Asha. Clue 3 keeps Dev away from Bilal, so Farhan sits between Asha and Bilal."
    ],
    "grid": { "head": ["Seat (clockwise)", "1", "2", "3", "4", "5", "6"], "rows": [["Friend", "Asha", "Farhan", "Bilal", "Chitra", "Esha", "Dev"]] },
    "cases": 1
  }
}
```
