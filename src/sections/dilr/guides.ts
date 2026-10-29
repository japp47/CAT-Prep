import type { LrType } from "../../practice/types";
import type { GuideLink, Trap } from "../varc/guides";

/**
 * One Learn guide per LR set type (F21), on the VARC guide pattern: what the set looks like, what to draw, where to
 * start, the method, the traps, a worked example and three links. The worked example is one of our own sets, so the
 * guide shows its real walkthrough and the student can then solve it. Links come from the checked DILR resources
 * (sections/dilr/resources.ts, checked 24 Oct 2026); none is a page about one type only, and the notes say so.
 */
export interface LrGuide {
  id: LrType;
  h: string;
  tag: string;
  what: string;
  /** The picture to draw before solving */
  draw: string;
  /** The first move, in one line */
  start: string;
  method: string[];
  traps: Trap[];
  /** A set in content/lr/ to solve as the worked example */
  example: { set: string; note: string };
  links: GuideLink[];
}

const BASICS: GuideLink = { k: "Video", n: "Basic essentials of LRDI (Quantifiers)", u: "https://www.youtube.com/playlist?list=PL1glN7tXDkWgXozb-y6VHPDjHneRmjoG-", note: "A free course that starts from zero and covers every common set type." };
const RODHA: GuideLink = { k: "Video", n: "Complete LRDI for CAT 2027 (Rodha)", u: "https://www.youtube.com/playlist?list=PLG4bwc5fquzhDp8eqRym2Ma1ut10YF0Ea", note: "85 free videos on every LR and DI topic; find this type in the playlist." };
const GOAT: GuideLink = { k: "Video", n: "All 114 CAT DILR sets solved, 2017 to 2024 (GOAT CAT)", u: "https://www.youtube.com/playlist?list=PLXv0hNMDm8iQE7VHb7UvrwhKL_pF9C35T", note: "One video per past CAT set. Solve the set first, then watch." };
const CRACKU: GuideLink = { k: "Practice", n: "Cracku DILR questions by topic", u: "https://cracku.in/cat-dilr-questions", note: "Past CAT sets grouped by topic, with solutions." };
const QUANT_SETS: GuideLink = { k: "Practice", n: "Quantifiers condition-based sets", u: "https://quantifiers.in/dilr/dilr-condition-based-sets/", note: "Seating, grouping, matching, scheduling and games, at CAT level." };
const LSAT: GuideLink = { k: "Practice", n: "LSAT logic games (old PrepTests)", u: "https://www.lawhub.org/prepare-for-the-lsat/prepare-with-lawhub", note: "Official ordering and grouping games: the cleanest practice for who joins, who goes when, and conditional rules." };
const CRACKU_STRATEGY: GuideLink = { k: "Guide", n: "CAT DILR preparation strategy (Cracku)", u: "https://cracku.in/cat-dilr-preparation-strategy", note: "Which topics come most and how to practise them." };

export const LR_GUIDES: LrGuide[] = [
  {
    id: "arrangement", h: "Arrangement", tag: "Rows, round tables, several attributes",
    what: "People or things placed in seats: a row, a round table, or one row per day. Each person may also carry attributes, such as a city, a job or a drink. Questions ask who sits where, who sits next to whom, or how many seatings fit every clue.",
    draw: "A row of numbered boxes, or a circle with seat 1 at the bottom. Put one line per attribute under the seats.",
    start: "Place the fixed facts first (a named seat, an end), then the clue that allows the fewest places. At a round table, fix one person: turning the table changes nothing.",
    method: [
      "List the people and attributes, and write each clue in shorthand: A_B for 'immediately left of', A..B for 'somewhere left of', A|x|B for one seat between.",
      "Write every fixed fact into the picture before you reason about anything else.",
      "Take the clue with the fewest possible placements next. Chain clues that share a person or attribute.",
      "When a clue allows two or three places, split into cases and carry each in its own row.",
      "Drop a case the moment any clue fails, and finish the one that survives.",
      "Answer from the final picture. For 'how many arrangements', count the cases that fit every clue.",
    ],
    traps: [
      ["Left and right at a round table", "Facing the centre, a person's right is the next seat anticlockwise seen from above. Facing outward, it flips."],
      ["Immediately or somewhere", "'To the left of' on its own means anywhere on that side."],
      ["'Between' and empty seats", "Check whether 'between' counts seats or people, and whether an empty chair counts."],
      ["Dropping a live case", "Two cases often survive to the end; the questions are written so the answer is the same in both, or they say which."],
    ],
    example: { set: "arr-round-table", note: "Six friends at a round table, four clues. Solve it, then watch the walkthrough seat each friend." },
    links: [CRACKU_STRATEGY, BASICS, QUANT_SETS],
  },
  {
    id: "tournament", h: "Games and tournaments", tag: "Knockouts, leagues, points tables",
    what: "Teams or players in a knockout or a round-robin league, often with a partly erased points table or a list of results. Questions ask who beat whom, totals and ranks, who can still qualify, and the most or least a team can score.",
    draw: "For a league, a results grid with each team against every other (a win across is a loss down) and a points column. For a knockout, a bracket with one column per round.",
    start: "Count first: a league of n teams has n(n − 1)/2 matches, and a knockout has one match for each player knocked out.",
    method: [
      "Use the totals: wins equal losses, every draw is counted by both teams, and points add up to a fixed number when every match has a result.",
      "Complete each team's record from what the table gives (won + drawn + lost = matches played).",
      "Fill the grid from the most constrained team: one with no losses, no draws, or a record its points fix.",
      "For qualification, find each team's most and least possible totals, then test the threshold. 'Certain' means at most one other team can be level or ahead.",
      "In a knockout whose draw is re-made every round, rebuild the field after each stated upset and pair best with worst again.",
    ],
    traps: [
      ["'Can' and 'certain'", "A team can qualify if one set of results puts it through; it is certain only if every set does."],
      ["Ties for the last place", "Level on points is decided by the set's rule, often a draw of lots, so a tied team is not certain."],
      ["A re-made draw", "Without a fixed bracket, a winner does not move to a fixed slot in the next round."],
      ["Draws counted once", "Each drawn match adds a draw to both teams' records."],
    ],
    example: { set: "tour-damaged-table", note: "A five-team league with a partly erased points table and two known results." },
    links: [CRACKU_STRATEGY, GOAT, QUANT_SETS],
  },
  {
    id: "caselet", h: "Reasoning DI and caselets", tag: "Tables, hidden quantities, rounded shares",
    what: "A short story with numbers: a table to rebuild from its totals, quantities hidden behind costs, a choice between options, or percentages that were rounded. Logic first, then a little arithmetic.",
    draw: "The table itself with each unknown cell named, or one line per option written as a formula in the unknown.",
    start: "Name the unknowns and write every clue as an equation or an inequality before working anything out.",
    method: [
      "Use the totals and the whole-number rule: counts are integers, which cuts the cases sharply.",
      "Bound each unknown: the largest and smallest it can be.",
      "Fix the tightest row or column first, then let the totals force the rest.",
      "For a decision between options, compare them in pairs once and find where each becomes the cheapest; every question reads off those points.",
      "For rounded figures, turn each percentage into a range and test the whole numbers that fit both reports.",
    ],
    traps: [
      ["Rounding", "23% means anything from 22.5% up to just under 23.5%."],
      ["Forgetting whole numbers", "A count of 4.5 people is not a case; integer clues often fix the size of the group."],
      ["Arithmetic before logic", "Work out only what the question needs; most numbers in a caselet are there to be ruled out."],
      ["Averages as exact", "When a set says to use averages as exact, 70% of 150 is 105, not 'about 105'."],
    ],
    example: { set: "case-parcel-table", note: "A 3 by 3 table rebuilt from its totals and four facts; 11 tables fit." },
    links: [CRACKU_STRATEGY, RODHA, CRACKU],
  },
  {
    id: "routes", h: "Routes and networks", tag: "Shortest paths, timetables, cheapest networks",
    what: "Towns joined by roads with distances, times or costs, sometimes as a table of predecessors or a bus timetable. Questions ask the shortest or cheapest route, how many routes fit a limit, and what changes when a road closes.",
    draw: "The network: towns as dots, roads as lines labelled with their length. For a table of predecessors, draw the towns left to right in the order they can be reached.",
    start: "From the start, write the shortest distance beside each town, nearest town first.",
    method: [
      "Each town's best distance is the smallest of (a neighbour's best + the road between); fill them nearest first.",
      "Trace the best route back from the end along the roads that gave each best distance.",
      "For a network joining every town at the lowest cost, take roads cheapest first and skip any that would close a loop.",
      "For a timetable, carry the earliest arrival at each town and check every change against the minimum transfer time.",
      "When a road closes or every road changes, recompute only the routes that use it.",
    ],
    traps: [
      ["Routes that revisit a town", "Most sets forbid them; a 'route' visits each town at most once."],
      ["A change on every road", "Adding 2 km to each road favours routes with fewer roads, so the best route can change."],
      ["Transfer times", "Arriving at 06:50 does not make a 07:00 departure under a 10-minute rule."],
      ["Ties", "Two roads of equal cost give two cheapest networks; count every tie."],
    ],
    example: { set: "route-shortest-roads", note: "Eight towns and fourteen roads: the shortest route from A to H, drawn step by step." },
    links: [CRACKU_STRATEGY, RODHA, QUANT_SETS],
  },
  {
    id: "setmax", h: "Set theory: maximum and minimum", tag: "Overlaps, exactly, at least",
    what: "Groups with known totals that overlap: readers of newspapers, players of games, students of languages. Questions ask the most or fewest in an overlap, how many belong to exactly two groups, or to at least three.",
    draw: "A Venn picture for three groups. For four or more, a small table of 'exactly one, two, three, four' with what each row counts towards the totals.",
    start: "Write two equations: everyone in at least one group, and the sum of the group totals, which counts each person once per group.",
    method: [
      "Let n1, n2, n3 be the numbers in exactly one, two and three groups.",
      "n1 + n2 + n3 is everyone in at least one group; n1 + 2n2 + 3n3 is the sum of the group totals.",
      "Subtract to get one relation, such as n2 + 2n3 = 66. Every 'most' and 'fewest' question reads off it.",
      "Check that the extreme can happen: build one example that fits every total.",
      "Treat extra conditions as new equations or bounds; 'everyone in C is also in A or B' empties the C-only region.",
    ],
    traps: [
      ["Exactly and at least", "'At least two' includes those in three; 'exactly two' does not."],
      ["People in no group", "They count in the total but in no circle."],
      ["An unreachable bound", "The algebra gives a limit; an example proves it can be met."],
      ["Fractions of a group", "'Two-fifths of the group' makes the size a multiple of 5 before anything else."],
    ],
    example: { set: "set-newspapers", note: "Three newspapers and 90 readers: the most who read all three, the fewest who read one." },
    links: [CRACKU_STRATEGY, RODHA, CRACKU],
  },
  {
    id: "venn", h: "Venn diagrams and syllogisms", tag: "All, some, no, only, possibility",
    what: "Statements about groups (all, some, no, only) and conclusions to test, or counts in the regions of a Venn picture. CAT uses the counting kind; syllogisms appear in other exams and sharpen how you read 'all', 'some' and 'only'.",
    draw: "One circle per group. Shade every region an 'All' or 'No' statement empties; mark the region a 'Some' statement needs.",
    start: "Turn every 'Only X are Y' into 'All Y are X', then draw the 'All' and 'No' statements before any 'Some'.",
    method: [
      "Draw the 'All' and 'No' statements first: they empty regions. Then place each 'Some' in a region still open.",
      "A conclusion follows only if it holds in every picture that fits; to reject one, find a single picture where it fails.",
      "A possibility needs just one picture where it holds.",
      "Two opposite conclusions, one of which must hold, give 'either I or II'.",
      "To count pictures, free regions double the count, and a 'Some' that k regions can meet gives 2^k − 1 choices.",
    ],
    traps: [
      ["'Only' the wrong way round", "'Only musicians are singers' means every singer is a musician, not the reverse."],
      ["'Some' as 'some but not all'", "'Some' means at least one; 'all' may still be true."],
      ["Empty groups", "Every named group has a member, so 'All X are Y' also gives 'Some Y are X'."],
      ["Possible is not certain", "A conclusion that holds in some pictures does not follow."],
    ],
    example: { set: "venn-syllogisms", note: "Five syllogism questions; the walkthrough shades question 1 statement by statement." },
    links: [CRACKU_STRATEGY, RODHA, CRACKU],
  },
  {
    id: "selection", h: "Grouping and selection", tag: "Teams under rules, budgets and skills",
    what: "Choose a group from a list (a team, a committee, a basket) under rules: who cannot go together, who needs whom, skills to cover, a budget. Questions ask how many groups are possible, the cheapest one, and who is in every valid group.",
    draw: "A short list of the candidates with their attributes, and the rules rewritten as arrows: C → D for \"C only if D\", A ✕ B for \"never together\".",
    start: "Split on the strongest rule, usually a pair that can never be together: one case with each of them, one with neither.",
    method: [
      "Rewrite each rule in shorthand. \"X only if Y\" is X → Y: X needs Y, Y does not need X.",
      "Split into cases on the never-together pair, so that rule needs no more checking.",
      "In each case, fill the skill that only one or two people have first; their rules then pull others in or push them out.",
      "List the groups in each case in a fixed order, so none is missed or counted twice.",
      "For cost or count questions, read off the list; for \"who is always in\", look for the person in every row.",
    ],
    traps: [
      ["\"Only if\" the wrong way", "\"C joins only if D joins\" lets D join alone; it is C that cannot come without D."],
      ["A rule on someone not picked", "A condition about F applies only when F is in the group."],
      ["Counting a group twice", "Fix an order (alphabetical within each case) and the duplicates show."],
      ["Forgetting a later rule", "A budget or skill cap added in a question removes groups from the full list; start from that list."],
    ],
    example: { set: "sel-project-team", note: "Eight consultants, five rules and a budget: 13 valid teams, found case by case." },
    links: [LSAT, QUANT_SETS, CRACKU],
  },
  {
    id: "distribution", h: "Distribution and matching", tag: "Shares with an order and a minimum",
    what: "Things shared out among people (notebooks, marks, chocolates) with an order between them and a least amount each, or items matched to people. Questions ask the most or least one person can get, and how many ways the sharing can go.",
    draw: "A row of the people in order, with the smallest amount each can have written in.",
    start: "Write the smallest distribution the rules allow: the staircase. Everything else adds extras on top of it.",
    method: [
      "Build the staircase: the minimum for the last person, then one more for each step up the order.",
      "Subtract the staircase from the total: that is what is left to add.",
      "For the most one person can get, give everyone else their least; for the least, make the amounts as close as possible.",
      "To count the ways, count how the leftover can be added without breaking the order (the extras never increase down the order).",
      "With an extra condition (one person fixed, one twice another), fix it first and count the rest.",
    ],
    traps: [
      ["\"More than\" is strict", "P more than Q means at least one more, so equal shares are out."],
      ["Forgetting the minimum", "\"At least 2 each\" lifts the whole staircase, not only the last person."],
      ["Counting orders twice", "When people are in a fixed order, a split such as 5, 3, 2 is one way, not six."],
    ],
    example: { set: "dist-thirty-notebooks", note: "Thirty notebooks, five students in a strict order, at least 2 each: 30 ways." },
    links: [CRACKU_STRATEGY, QUANT_SETS, CRACKU],
  },
  {
    id: "scheduling", h: "Scheduling", tag: "Machines, task networks, timetables",
    what: "Jobs or tasks placed in time: jobs queued on machines, tasks that must wait for others, exams that cannot share a slot. Questions ask when things finish, what delays the end, and how many timetables fit.",
    draw: "A timeline with one row per machine or crew, or the tasks as dots with an arrow from each task to the ones waiting for it; for clashes, papers as dots with a line between any two that clash.",
    start: "Find what holds everything else back: the longest chain of tasks, the busiest machine, or a group of items that all clash with each other.",
    method: [
      "For machines, keep a \"free at\" time for each and give each job to the one free first, by the stated tie rule.",
      "For a task network, go forward: each task starts when the last task it waits for ends. The largest finish is the least time.",
      "Go backward to find each task's spare time; tasks with none form the critical path, and only their delays move the end.",
      "With limited crews, divide the work that cannot start before a bottleneck by the crews and round up; then build a schedule that meets it.",
      "For clashes, place a group that all clash with each other in separate slots first, then place each other item by its clashes.",
    ],
    traps: [
      ["Ties", "When two machines are free together, the set's tie rule decides; it changes which job goes where."],
      ["Delays off the critical path", "A task with spare time can slip that much without moving the end."],
      ["A bound you cannot reach", "Total work divided by crews is only a lower bound; show a schedule that meets it."],
      ["Room limits", "\"At most 3 a slot\" can rule out splits that the clashes alone allow."],
    ],
    example: { set: "sched-renovation", note: "Nine tasks: the critical path, a speed-up, and what two crews change." },
    links: [LSAT, QUANT_SETS, RODHA],
  },
  {
    id: "binary", h: "Binary logic", tag: "Truth-tellers, liars and alternators",
    what: "People who always tell the truth, always lie, or alternate, each making statements about the others. Questions ask who is which kind, how many statements are true, and what changes if one statement changes.",
    draw: "A table with a row per person and columns for their kind and whether each of their statements is true.",
    start: "Pick the statement that ties the most people together, often one about another speaker, and try it both ways: true and false.",
    method: [
      "A truth-teller's statements are all true and a liar's all false; an alternator's flip. So each person's statements must match their kind.",
      "Take one person and assume they tell the truth. Follow what their statement forces until everything fits or something breaks.",
      "Then assume they lie and follow that. If one case breaks, the other is the answer; if both fit, count both.",
      "Look for two statements that cannot both be true (they put two people in one seat, or two values on one thing): one of their speakers lies.",
      "With a fixed number of liars, count as you go: once that many are found, everyone else tells the truth.",
    ],
    traps: [
      ["The negation of \"both\"", "\"D and E are both truth-tellers\" is false when at least one of them lies, not when both do."],
      ["The negation of \"exactly\"", "\"Exactly 2 are liars\" is false for 0, 1, 3, 4 or 5 liars."],
      ["Alternator order", "Unless the set says so, an alternator may start with the true statement or the false one."],
      ["Statements about yourself", "Check a person's statement about their own kind too: a liar cannot truly say \"I lie\"."],
    ],
    example: { set: "bin-five-friends", note: "Five friends, one statement each: try A both ways and one case breaks." },
    links: [CRACKU, RODHA, CRACKU_STRATEGY],
  },
  {
    id: "directions", h: "Directions and distances", tag: "Walks, turns and straight-line distance",
    what: "People walk set distances and turn left or right; questions ask where they end up, how far apart two people are, and in which direction one is from another. Rare in recent CAT papers, but quick marks when it comes.",
    draw: "A small table per walker: each leg as a distance and a compass direction, then the stop as metres east or west and north or south of the start.",
    start: "Turn every \"left\" and \"right\" into a compass direction before adding anything up.",
    method: [
      "Note the direction each walker faces. A right turn takes north to east, east to south, south to west, west to north; a left turn goes the other way.",
      "Write each leg as metres east or west and north or south.",
      "Add them up: the stop is a pair (east or west, north or south) from the start.",
      "For a distance, take the two gaps between stops and use Pythagoras; for a direction, compare east-west and north-south separately.",
    ],
    traps: [
      ["Left of whom", "\"Turns left\" is the walker's left, which depends on which way they face at that moment."],
      ["Diagonals", "South-east needs both: further south and further east. Equal in one direction means plain east or south."],
      ["Adding distances", "Walking 3 m then 4 m at right angles leaves you 5 m away, not 7."],
    ],
    example: { set: "dir-four-friends-field", note: "Four walkers from one flagpole: stops, distances and directions." },
    links: [RODHA, BASICS, CRACKU],
  },
  {
    id: "relations", h: "Blood relations", tag: "Chains, family trees, symbol codes",
    what: "Sentences that link people by family ties (\"her mother is the only daughter of my mother\"), a family built from several clues, or a code of symbols for relations. Questions ask how two people are related, how many are women, or the smallest family that fits. Rare in recent CAT, but quick when it comes.",
    draw: "A family tree: generations in rows, a line between a married couple, a line down to their children, and each person's sex written once a word fixes it.",
    start: "Read the chain from the end back to the speaker, one link at a time, and shorten it as you go: \"father's wife\" is \"mother\".",
    method: [
      "Fix sexes only from the words: mother, wife, daughter, sister are women; father, husband, son, brother are men. Someone called only a child or sibling could be either.",
      "Shorten each chain: mother's brother is maternal uncle, brother's son is nephew, father's mother is paternal grandmother.",
      "Place everyone on the tree in generations; \"in-law\" means the link goes through a marriage.",
      "\"Only daughter\" or \"no other children\" pins one person down: use it to rule out every other choice.",
      "If the words allow two people (mother or her sister), the answer is \"cannot be determined\".",
    ],
    traps: [
      ["Assuming a sex", "A sibling, child or cousin may be a man or a woman unless a word says so."],
      ["Maternal or paternal", "Find the middle person's sex first: it decides which side the relation is on."],
      ["Cousin or sibling", "Children of the same parents are siblings; children of two siblings are cousins."],
      ["Generations in-law", "A sister-in-law is your generation; a daughter-in-law is one below."],
    ],
    example: { set: "rel-eight-family", note: "One family of eight from six clues: sexes, marriages and who is whose child." },
    links: [CRACKU, RODHA, BASICS],
  },
  {
    id: "clocks", h: "Clocks and calendars", tag: "Hand angles, faulty clocks, odd days",
    what: "Angles between a clock's hands, how often they meet or make a right angle, mirror images and clocks that gain or lose; and calendars: which weekday a date falls on, when a year's calendar repeats, and how many times a day comes. Rare in recent CAT; mostly arithmetic once the rules are known.",
    draw: "For clocks, the two hands as degrees from 12; for calendars, a short row of years with each one's first weekday and whether it is a leap year.",
    start: "For clocks, write both hands in degrees from 12. For calendars, count the days between the two dates and keep only the remainder by 7.",
    method: [
      "The minute hand moves 6 degrees a minute and the hour hand 0.5, so the minute hand gains 5.5 degrees a minute.",
      "At m minutes past h, the hour hand is at 30h + 0.5m and the minute hand at 6m: set the gap to the angle and solve.",
      "The gap goes round once every 720/11 minutes, 11 times in 12 hours. A faulty clock's rate is clock time over true time since it was right.",
      "For calendars, a normal year moves the first weekday on by 1 and a leap year by 2; a century year is leap only if divisible by 400.",
      "Two years share a calendar when both are leap or both are not, and they start on the same weekday.",
    ],
    traps: [
      ["The smaller angle", "\"The angle between the hands\" is under 180 degrees: take 360 minus the gap if needed."],
      ["Right angles twice", "Each round of the hands gives two right angles, at 90 and 270 degrees."],
      ["Twelve hours, not 24", "A clock face repeats every 12 hours, so two drifting clocks agree when they are 720 minutes apart."],
      ["Century years", "1900 was not a leap year; 2000 was."],
    ],
    example: { set: "clk-station-clock", note: "Hand angles, opposite hands and a gaining clock, each worked from degrees." },
    links: [RODHA, BASICS, CRACKU],
  },
];

export const LR_GUIDE_BY_TYPE = new Map(LR_GUIDES.map((g) => [g.id, g]));
