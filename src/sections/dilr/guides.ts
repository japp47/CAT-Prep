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
];

export const LR_GUIDE_BY_TYPE = new Map(LR_GUIDES.map((g) => [g.id, g]));
