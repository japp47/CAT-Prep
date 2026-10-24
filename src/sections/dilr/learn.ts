import type { Topic } from "../varc/learn";

/**
 * The DILR page's Learn tab (docs/feature.md F21, research in docs/research/lr.md). Logical reasoning comes first
 * (D37); data interpretation gets its own guides in December. Figures are ranges from coaching analyses, not IIM data.
 */
export const FORMAT: [string, string][] = [
  ["Format", "22 questions in 40 minutes since CAT 2024, in 5 sets: three of 4 questions and two of 5. Most sets are logical reasoning or reasoning with numbers; pure data interpretation is shrinking."],
  ["Marking", "3 marks for a correct answer, minus 1 for a wrong MCQ. About half the questions are TITA (you type the answer) with no negative marking, so attempt every TITA in a set you have solved."],
  ["99 target", "About 10 to 13 right answers: estimates for CAT 2025 run from 30 to 38 marks. Two sets solved completely is the usual route; one full set alone is around the 85th percentile."],
  ["Time split", "Spend the first 3 to 5 minutes reading every set without solving, then attempt the 2 or 3 that look most direct. Leave a set after 5 to 7 minutes with no way in."],
];

/** LR set types: what they look like and what to draw. The same types as the set format (docs/content/lr-format.md). */
export const SET_TYPES: [string, string, string][] = [
  ["Arrangement", "People in a line, a circle, two rows or floors; movement over steps", "A line, a circle or a grid"],
  ["Grouping and selection", "Teams, committees, choose k of n under conditions", "A yes/no grid and a case table"],
  ["Distribution and matching", "People matched to attributes, items allocated under limits", "A two-way matrix"],
  ["Ranking and ordering", "Ranks, ties, ratings, who came before whom", "An ordered list with gaps"],
  ["Games and tournaments", "Round robin, knockout, points tables, goals", "A points table or a bracket"],
  ["Scheduling", "Days, slots, precedence, no overlaps", "A timeline"],
  ["Binary logic", "Truth-tellers, liars, alternators, claims", "One case per assumption"],
  ["Venn and counting", "Three- and four-set overlaps, maximum and minimum", "Venn regions with letters"],
  ["Routes and networks", "Paths, flows, distances; what comes in goes out", "A graph"],
  ["Quant-based LR", "Scores, averages, sums, votes with whole-number limits", "Equations beside a grid"],
];

/** Share of DILR topics by year, from InsideIIM's mix of coaching analyses (percent). */
export const TOPIC_SHARE: { topic: string; y: number[] }[] = [
  { topic: "Arrangements", y: [18, 10, 14, 13, 19, 25] },
  { topic: "Grouping and conditions", y: [20, 10, 25, 6, 6, 0] },
  { topic: "Games and tournaments", y: [17, 17, 8, 13, 0, 0] },
  { topic: "Puzzles", y: [5, 10, 14, 19, 19, 25] },
  { topic: "Scheduling", y: [0, 7, 0, 6, 0, 0] },
  { topic: "DI, reasoning based", y: [10, 10, 17, 19, 19, 31] },
  { topic: "DI, calculation based", y: [10, 10, 14, 13, 31, 19] },
];
export const TOPIC_YEARS = ["2022", "2021", "2020", "2019", "2018", "2017"];

export const TOPICS: Topic[] = [
  { h: "Starting from zero", open: true,
    p: ["Logical reasoning is learned by solving and then studying your own solution. Templates come first, then real CAT sets, then timed sections.", "Expect a set to take 30 to 45 minutes at first. Students on r/CATpreparation report 15 to 20 minutes after about 100 sets solved and studied."],
    ol: [
      "Weeks 1 to 3. Logic grid puzzles (Puzzle Baron, Brainzilla) and the Quantifiers LRDI basics playlist, untimed. Learn to draw each set type in the table above.",
      "Weeks 4 to 10. CAT past sets by topic (Cracku), one or two a day. Give each set 15 to 20 minutes, then spend as long again reading the solution and noting the first deduction you missed.",
      "From the Build phase. Full DILR sections from CAT 2017 to 2022, timed, once a week. Keep 2023 to 2026 as real papers for the mock phase.",
    ] },
  { h: "Read every condition exactly",
    p: ["Most lost marks in LR come from a misread clue, not from hard logic. Translate each clue before you place anything."],
    ul: [
      "\"A only if B\" means if A, then B. It does not mean if B, then A. \"A unless B\" means if not B, then A.",
      "\"If A then B\" also gives: if not B, then not A. It gives nothing when A is false.",
      "At least, at most and exactly are different clues. \"Not both\" still allows neither.",
      "\"Immediately\" means next to; \"to the left\" alone means anywhere on that side. Check whether \"between\" includes the ends.",
      "In a circle facing the centre, a person's right is the next seat anticlockwise seen from above. Facing outward, it flips.",
    ] },
  { h: "Draw it, then start where it is tightest",
    ul: [
      "Choose the drawing before solving: a line, a circle, a matrix, a points table, a timeline, Venn regions or a graph.",
      "Write every fixed fact first. Then start with the clue that allows the fewest placements; in a circle, fix one person.",
      "When a clue allows two or three placements, draw each as its own case side by side and let the next clues remove cases.",
      "Stop solving when the question needs only what every remaining case agrees on.",
    ] },
  { h: "Read the question as carefully as the set",
    ul: [
      "Must be true: true in every case. Could be true: true in at least one. Cannot be true: false in every case.",
      "\"If additionally…\" adds a clue for that question only. Solve it on a copy, then go back to your cases.",
      "\"How many arrangements are possible\" counts cases: list them, do not guess.",
    ] },
  { h: "Counting rules worth knowing",
    ul: [
      "A round robin of n teams has n(n-1)/2 matches. With 2 points for a win and 1 each for a draw, the points always add up to twice the matches.",
      "A knockout of n teams has n-1 matches, because each match removes one team.",
      "In a Venn diagram, the regions add up to the total. For a minimum overlap, push everyone else apart; for a maximum, stack them together.",
      "A fixed average fixes the total. Whole numbers and odd or even totals cut cases fast.",
    ] },
  { h: "Choosing sets in the exam",
    ul: [
      "Read all five sets first. Prefer sets whose clues are direct facts over clues that need several layers of inference, and familiar shapes over new ones.",
      "Length is not difficulty: a long set with plain clues is often the easiest.",
      "Set a limit: no clear first deduction in 5 to 7 minutes, move on and come back if time remains.",
      "Minutes already spent are not a reason to stay. Ask \"do I have a way in?\", not \"how long have I been here?\"",
      "In a set you have solved, answer every TITA. They carry no negative marking.",
    ] },
  { h: "Studying a set after you solve it",
    p: ["Two minutes after each set teach more than another set solved in a hurry. Answer three questions in writing:"],
    ol: [
      "What was the first deduction that opened the set, and which clue gave it?",
      "Where did the time go: reading, drawing, a case you did not need, or calculation?",
      "Which clue did you misread or which case did you miss? Add it to your Error log.",
    ] },
  { h: "Data interpretation (from December)",
    p: ["DI guides and practice arrive in December. Until then, build calculation speed for 10 minutes a day."],
    ul: [
      "Tables to 30, squares to 30, cubes to 20.",
      "Fractions as percentages: 1/6 is 16.67%, 1/7 is 14.29%, 1/8 is 12.5%, 1/9 is 11.11%, 1/11 is 9.09%, 1/12 is 8.33%.",
      "Approximate before you calculate, and use the options to decide how exact you need to be.",
    ] },
];

export const TABS = [
  { id: "learn", label: "Learn" },
  { id: "practice", label: "Practice" },
  { id: "watch", label: "Watch" },
  { id: "toppers", label: "Toppers" },
];

export const TAB_NOTES: Record<string, string[]> = {
  practice: ["One or two CAT-level sets a day, timed at 15 to 20 minutes, with as long again to study the solution. Pick two sources and finish them; a folder of unopened PDFs teaches nothing.", "Keep CAT 2017 to 2022 for timed sections in the Build and Apply phases, and save 2023 to 2026 as real papers for the mock phase."],
  watch: ["Prefer channels that solve a set live, so you see where the solver starts and how cases are cut, over videos that show a finished solution. Pause before each step and try it yourself."],
  toppers: ["Two things repeat in every topper account: hundreds of sets solved and studied honestly, and leaving a stuck set early."],
};
