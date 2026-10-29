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
  "type": "arrangement",            // arrangement | selection | distribution | ranking | tournament | caselet | setmax |
                                    // scheduling | binary | venn | routes | directions | quant-lr | cubes | mixed
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
      "layout": "row",              // row | circle | grid | bracket | network | venn (see below)
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

**Grids and brackets.** A `grid` is a table: `rows` are the row heads, `seats` the column heads, and `null` a cell that cannot hold anything (a team against itself), drawn crossed out. For a results grid whose first columns are the row teams in the same order, `"mirror": {"W": "L", "L": "W", "D": "D"}` makes the scratch pad write the other team's result by itself, and on a phone the rows take the short column names. A `bracket` has one row per round and one seat per match slot (as many as the first round has matches), `null` for slots a later round does not have; a match is `["4", "13", "13", "upset"]`: both players, then the winner when known, then notes. `[]` is a match not known yet. Every set gets a notes box under the scratch pad, and a set with no picture gets the notes box alone.

**Networks.** One seat per town, `at` its place as [x, y] from 0 to 100 across and down, `links` the roads as [from seat, to seat, label], and `lit[step]` the links drawn bold at each step (the route found; a newly lit road draws itself in). A town's lines are what is known about it, such as its distance. Place towns so that no road passes through a town.

**Venn pictures.** `sets` names two or three circles; the seats are the regions in a fixed order: A only, B only, AB, None (two circles) or A only, B only, C only, AB only, AC only, BC only, ABC, None (three). A region whose first line is `"empty"` is shaded; any other lines are written in it (a count, `some`). For syllogism sets, where every question names its own groups, `padSets` gives the scratch pad neutral circle names (A, B, C).

**Pictures for the newer types (D53, `docs/design/lr-visuals.md`).** `tree`: a family tree drawn like a network (`at`, `links`, `lit` per step); a link labelled `"="` is a marriage, any other runs from a parent to a child, and a child of a married parent hangs from the couple's middle. `clock`: one dial per seat; a frame line is a time (`"8:24"`, `"4:54 6/11"`) and an optional second line the angle to shade (`"108°"`). `map`: `paths` (each walker's points in metres east and north of the start), `legs[step][path]` legs drawn so far, `ties[step]` dashed distance lines `[[x, y], [x, y], "label"]`. `timeline`: `rows` are the lanes, `seats` is one column for the lane's end label, `span` the axis, `bars` `[lane, start, end, label]`, `lit[step]` the bars shown. `bars`: one bar per seat, its height the number its first line starts with. `tones` colours grid cells by their first line (`{"true": "good", "false": "bad", "Alternator": "key"}`). `pad: false` (required for tree, clock, map and timeline) leaves the attempt with the notes box only, because the blank picture would give the answer away. **A question's own picture**, `fig`, is any of these with one frame per line of its `why`; the review steps through the lines beside it.

**Questions with their own statements** (syllogisms) put them in the stem with line breaks (`\n`), and the set has no clues; the review then says the question's own statements settle it.

**A question that needs no clue** (one read off the given table) has `"uses": []`; the review says the table settles it.

**Rules the tests enforce:** 4 to 6 questions; MCQ answers within the options; TITA answers that parse when they are numbers; `uses` only names clues that exist; ids unique across all LR files; `source` present; `since` a date; a diagram has one frame per solution step and every frame has the right number of rows and seats; a grid or bracket keeps the same closed cells in every frame, a bracket winner is one of the two players, and a `mirror` maps both ways.

**Checking a set before it ships.** Solve it by brute force (every arrangement of every attribute, filtered by the clues), then check each answer, each "must be true" option against every arrangement left, the `cases` count, and the last frame of the picture. The owner's first 25 arrangement questions were checked this way on 24 Oct 2026 (1, 2, 6, 3 and 2 arrangements, every key right), the 25 games and tournaments questions on 28 Oct 2026 (sets 2 to 5 have one solution each; set 1's questions are separate scenarios, each simulated; every key right), the 25 reasoning DI and caselet questions the same day (11 tables, 2 crate cases, 1 survey size, 6 loss orders; every key and explanation right), and the 75 routes, set theory and Venn questions on 28 Oct 2026: routes by enumerating every route and tree, set theory as exact integer programs (SciPy's milp, in a scratch environment, not a project dependency), syllogisms by the fullest picture the 'All' and 'No' statements allow (a conclusion follows when its opposite has no fitting picture), and the picture counts by listing every picture. Every key and explanation was right. The owner's binary logic and directions file and scheduling, distribution and selection file (50 questions, D50) were checked again on 29 Oct 2026, though both came already checked by two solvers: truth-teller assignments by trying every one, alternators with both orders, every assignment of months, the round table by every seating with exactly two liars, walks as coordinates, queues by simulation and every order, notebooks by every split, teams by every group of four, the renovation by forward pass and a search over two-crew schedules, and timetables by every slot assignment and pairing. Every key was right. The owner's blood relations and clocks and calendars files (30 questions, D52) were checked on 30 Oct 2026: clock angles, opposite hands, right angles and drifting clocks with exact fractions, calendars with the date library (every Friday the 13th from 2001 to 2028, the years after 2026, 10 March 1812), and blood relations chain by chain by hand, including the lower bound of 7 for the smallest family and a seven-person family that meets it. Every key was right.

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
