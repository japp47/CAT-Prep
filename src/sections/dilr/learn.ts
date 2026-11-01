import type { Topic } from "../varc/learn";

/**
 * The DILR page's Learn tab (docs/feature.md F21, research in docs/research/lr.md). Logical reasoning comes first
 * (D37); data interpretation has its starting guides here (docs/research/di.md) and its first sets from 1 Nov 2026. Figures
 * are ranges from coaching analyses, not IIM data.
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

/** Data interpretation pictures: what each asks and where to start (docs/research/di.md §2). */
export const DI_TYPES: [string, string, string][] = [
  ["Tables with blanks", "Fill missing cells from totals and rules (multiples, ranks), then answer", "Every blank you can fill, before any question"],
  ["Bar charts", "Grouped, stacked or horizontal bars; changes and shares across years", "The units and the scale, then which bars a question compares"],
  ["Line charts", "Trends, rates and cumulative totals over time", "Whether it is cumulative: then a period is the difference of two readings"],
  ["Shares and pie charts", "Percentages of a total, often over two years with different totals", "The base of every percentage; turn shares into counts"],
  ["Two linked charts", "One value from each chart combined (amount ÷ rate, imports and exports)", "The link between the charts, in one sentence"],
  ["Special charts", "Radar, scatter, step charts: two measures per item", "What each axis or spoke means, on one item first"],
  ["Data in text", "Percentages and flows described in sentences, no picture", "Draw the table yourself, then treat it as a table with blanks"],
];

/**
 * Seven recent slots, set by set, read from the papers on 2IIM (docs/research/di.md §1, 1 Nov 2026). Data sets need a
 * table or chart read; logic sets are rules, arrangements, games and schedules (some with numbers).
 */
export const SLOTS: { slot: string; data: string[]; logic: string[] }[] = [
  { slot: "2025, slot 1", data: ["import tariffs (radar and bar charts)"], logic: ["train tickets", "employee ratings", "four friends on seven chairs", "a tapping game"] },
  { slot: "2025, slot 3", data: ["call minutes (table with blanks)", "puzzles solved (cumulative lines)", "trade balances"], logic: ["travel costs in currencies", "passing the buck"] },
  { slot: "2024, slot 3", data: ["nutrients in grains (table with blanks)", "streaming app shares", "AC and room temperature (line graph)", "GDP and population"], logic: ["cash in an ATM network"] },
  { slot: "2023, slot 2", data: ["coins in sacks (two tables)", "daily draw scores (averages and ranks)"], logic: ["fundraising by five firms", "rides in a park"] },
  { slot: "2022, slot 2", data: ["four companies (two plots)"], logic: ["salesmen in three villages", "delivery routes", "products in a supermarket"] },
  { slot: "2022, slot 1", data: [], logic: ["metro timings", "a get-together", "hockey goals", "funding tokens"] },
  { slot: "2021, slot 1", data: ["sales by subcategory (bars)", "a smoothie shop (two tables)"], logic: ["seven people's relationships", "scheduling research papers"] },
];

export const TOPICS: Topic[] = [
  { h: "How to start: logical reasoning and data interpretation together", open: true,
    p: ["Logical reasoning is learned by solving and then studying your own solution. Templates come first, then real CAT sets, then timed sections.", "Expect a set to take 30 to 45 minutes at first. Students on r/CATpreparation report 15 to 20 minutes after about 100 sets solved and studied."],
    ol: [
      "Weeks 1 to 3: logical reasoning basics. One LR course (Quantifiers or Rodha) and logic grid puzzles, untimed. Learn to draw each set type in the Logical reasoning half below. Ten minutes a day on the calculation tools in the Data interpretation half.",
      "Weeks 4 and 5: data interpretation basics. The DI starter kit, one chart type a day, then Cracku's DI basics page, one set a day, untimed. Keep one LR set a day going.",
      "Weeks 6 to 12: past CAT sets by topic. One or two LR sets a day at 15 to 20 minutes and a DI set at 12, with as long again studying each solution. From week 7, the past CAT DI sets in order, two a week.",
      "From the Build phase: a timed DILR section once a week from the 2017 to 2022 papers. Read all five sets first and pick two or three; do not attempt them all.",
    ] },
  { h: "Read every condition exactly", part: "lr",
    p: ["Most lost marks in LR come from a misread clue, not from hard logic. Translate each clue before you place anything."],
    ul: [
      "\"A only if B\" means if A, then B. It does not mean if B, then A. \"A unless B\" means if not B, then A.",
      "\"If A then B\" also gives: if not B, then not A. It gives nothing when A is false.",
      "At least, at most and exactly are different clues. \"Not both\" still allows neither.",
      "\"Immediately\" means next to; \"to the left\" alone means anywhere on that side. Check whether \"between\" includes the ends.",
      "In a circle facing the centre, a person's right is the next seat anticlockwise seen from above. Facing outward, it flips.",
    ] },
  { h: "Draw it, then start where it is tightest", part: "lr",
    ul: [
      "Choose the drawing before solving: a line, a circle, a matrix, a points table, a timeline, Venn regions or a graph.",
      "Write every fixed fact first. Then start with the clue that allows the fewest placements; in a circle, fix one person.",
      "When a clue allows two or three placements, draw each as its own case side by side and let the next clues remove cases.",
      "Stop solving when the question needs only what every remaining case agrees on.",
      "When the table is done, read every clue once more against it. If nothing contradicts it, the answers that follow are almost always right.",
      "Practise in pen on a few sheets. The CAT 2022 exam-day guide lists one pen and one scribble pad, so draw cases small and side by side instead of erasing.",
    ] },
  { h: "Read the question as carefully as the set", part: "lr",
    ul: [
      "Must be true: true in every case. Could be true: true in at least one. Cannot be true: false in every case.",
      "\"If additionally…\" adds a clue for that question only. Solve it on a copy, then go back to your cases.",
      "\"How many arrangements are possible\" counts cases: list them, do not guess.",
      "In an MCQ, the options can cut cases: test each against your table instead of finishing every branch.",
    ] },
  { h: "Counting rules worth knowing", part: "lr",
    ul: [
      "A round robin of n teams has n(n-1)/2 matches. With 2 points for a win and 1 each for a draw, the points always add up to twice the matches.",
      "A knockout of n teams has n-1 matches, because each match removes one team.",
      "In a Venn diagram, the regions add up to the total. For a minimum overlap, push everyone else apart; for a maximum, stack them together.",
      "A fixed average fixes the total. Whole numbers and odd or even totals cut cases fast.",
    ] },
  { h: "Choosing sets in the exam", part: "lr",
    ul: [
      "Read all five sets first. Prefer sets whose clues are direct facts over clues that need several layers of inference, and familiar shapes over new ones.",
      "Glance at each set's questions too. Many \"if…\" questions mean several cases to track; rank the sets 1 to 3 before starting.",
      "Length is not difficulty: a long set with plain clues is often the easiest.",
      "Set a limit: no clear first deduction in 5 to 7 minutes, move on and come back if time remains.",
      "Minutes already spent are not a reason to stay. Ask \"do I have a way in?\", not \"how long have I been here?\"",
      "In a set you have solved, answer every TITA. They carry no negative marking.",
    ] },
  { h: "Studying a set after you solve it", part: "lr",
    p: ["Two minutes after each set teach more than another set solved in a hurry. Answer three questions in writing:"],
    ol: [
      "What was the first deduction that opened the set, and which clue gave it?",
      "Where did the time go: reading, drawing, a case you did not need, or calculation?",
      "Which clue did you misread or which case did you miss? Add it to your Error log.",
    ],
    ul: ["If the solution's table looked nothing like yours, close the solution and redraw its table from the clues. Knowing what goes in the rows and columns is learned by copying good tables."] },
  { h: "Calculate only as exactly as the options need", part: "di",
    ul: [
      "Know fractions as percentages to 1/20: 1/6 is 16.67%, 1/7 is 14.29%, 1/8 is 12.5%, 1/9 is 11.11%, 1/11 is 9.09%, 1/12 is 8.33%, 1/16 is 6.25%.",
      "Percentage change is new ÷ old, minus 1. A 20% rise then a 20% fall leaves 96%, not 100%: each change has its own base.",
      "Compare two fractions by cross-multiplying, not by dividing both: 37/52 against 41/58 is 37 × 58 against 41 × 52.",
      "Look at the options first. Far apart (23%, 31%, 47%): round freely. Close together (23.4%, 23.8%): calculate, and use the calculator.",
      "CAT gives a basic on-screen calculator. Clicking is slow, so use it for long divisions and multiplications when the options are close, not for what one line of rounding settles.",
      "Tables to 30 and squares to 30 save time in every section, not only DI.",
    ] },
  { h: "Read the chart before the numbers", part: "di",
    ul: [
      "Read the title, the units (thousands, lakhs, crores, %) and both axes before any question. Check whether the scale starts at zero.",
      "Know the base of every percentage: \"% of total\", \"% of last year\" and \"% of men\" are different numbers.",
      "Check which series, year and row a question asks about. A wrong year is the commonest DI slip and looks like a calculation error.",
      "On a cumulative chart, the amount in a period is the difference between two readings, not the reading.",
      "An average of averages is wrong unless the groups are the same size: weight by the counts.",
      "In a table with blanks, fill every blank you can from totals and rules before answering anything, then read the questions.",
    ] },
];

/** The two halves of the Learn tab, with what each is about (shown under the switch). */
export const PARTS: { id: "lr" | "di"; label: string; intro: string }[] = [
  { id: "lr", label: "Logical reasoning", intro: "Most DILR sets: arrangements, grouping, games, schedules and puzzles with numbers. The skill is reading every clue exactly and starting where the clues are tightest." },
  { id: "di", label: "Data interpretation", intro: "DI in CAT is now reasoning with numbers more than reading charts: tables with blanks and rules, percentages to turn back into counts, two charts read together, and \"the least possible\" or \"how many can be determined\". Start with reading and calculating cleanly, then the reasoning." },
];

/** Practice tab groups, in the plan's phases (docs/design/dilr-page-v2.md). */
export const GROUPS: Record<string, { h: string; note: string; phases: number[] }> = {
  foundation: { h: "Foundation", note: "Untimed. Meet every type, one or two sets a day, and study each solution for as long as the set took.", phases: [1] },
  build: { h: "Build and Apply", note: "Timed sets, the past DI sets in order, and a timed section every week or two.", phases: [2, 3] },
  mock: { h: "Mock phase", note: "Full mocks analysed on Sundays, and harder sets when CAT's feel easy.", phases: [4, 5] },
};

export const TABS = [
  { id: "learn", label: "Learn" },
  { id: "practice", label: "Practice" },
  { id: "watch", label: "Watch" },
  { id: "toppers", label: "Toppers" },
];

export const TAB_NOTES: Record<string, string[]> = {
  practice: ["One or two CAT-level sets a day, timed at 15 to 20 minutes, with as long again to study the solution. Pick two sources and finish them; a folder of unopened PDFs teaches nothing.", "Keep CAT 2017 to 2022 for timed sections in the Build and Apply phases, and save 2023 to 2026 as real papers for the mock phase. The past DI sets below borrow eight sets from 2023 to 2025 because they show DI as CAT asks it now; a set you have seen is one of five in its slot, so the paper still works as a mock."],
  watch: ["Prefer channels that solve a set live, so you see where the solver starts and how cases are cut, over videos that show a finished solution. Pause before each step and try it yourself."],
  toppers: ["Two things repeat in every topper account: hundreds of sets solved and studied honestly, and leaving a stuck set early."],
};
