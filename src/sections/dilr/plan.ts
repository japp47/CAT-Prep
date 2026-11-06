import { phaseIn } from "../../data/exam";
import { paperPdf } from "../../data/papers";
import { diffDays, dow } from "../../lib/date";
import type { Block, DayTemplate, Link, PhaseText, PlanCtx } from "../types";
import { PRACTICE_PAPERS, REAL_PAPERS } from "../varc/plan";

/**
 * DILR's day plan (F22, D56, D82): LR and DI sets from this site, the drills, and from the Build phase timed DILR
 * sections of past papers. A block's `go` is the on-site action its button opens: "lr-next" is the next LR set in the
 * practice order, "di-next" the next DI set (then a past CAT DI set, then a retake), both resolved from the student's
 * attempts (planner/go.ts).
 *
 * DI follows the DILR page's start path: Foundation weeks 1 to 3 are LR only; weeks 4 and 5 put a DI set beside the LR
 * set every day; from week 6, and in Build and Apply, Monday, Wednesday and Friday trade the second LR set for a DI
 * set (about three a week, CAT's share); the Mock phase has one of each on weekdays; Taper alternates.
 */

type Opt = Partial<Block>;
const B = (id: string, name: string, m: number, mm: number, pri: number, ord: number, desc: string, links: Link[], x?: Opt): Block =>
  ({ id, name, m, mm, pri, ord, desc, links, ...x });

const PRACTICE: Link = ["DILR practice", "/dilr/practice"];
const GUIDES: Link = ["LR guides", "/dilr"];
const DI_PRACTICE: Link = ["DI practice", "/dilr/practice?half=di"];
const DI_GUIDES: Link = ["DI guides", "/dilr?guide=di-chart"];

const setOfDay = (m: number, mm: number, ord: number, two = false): Block =>
  B("lrset", two ? "Two LR sets" : "LR set of the day", m, mm, 1, ord,
    two ? "The next two sets in the practice list, each within its target time, then the two-minute post-mortem for each."
      : "The next set in the practice list, within its target time, then the two-minute post-mortem.",
    [PRACTICE, GUIDES], { go: "lr-next" });

const diSet = (m: number, mm: number, ord: number): Block =>
  B("diset", "DI set of the day", m, mm, 1, ord,
    "The next data interpretation set: read the units and the base of every number first, calculate only as exactly as the options need, then study the solution.",
    [DI_PRACTICE, DI_GUIDES], { go: "di-next" });
/** One LR set and one DI set, the DI set first when it is the week's new skill. */
const lrAndDi = (diFirst: boolean, lrM: number, lrMm: number, diM: number, diMm: number): Block[] =>
  diFirst ? [diSet(diM, diMm, 1), setOfDay(lrM, lrMm, 2)] : [setOfDay(lrM, lrMm, 1), diSet(diM, diMm, 2)];

/** The drill rotates through the week, so each skill comes round twice. */
function drill(d: string, ord: number): Block {
  const k = dow(d) % 3;
  if (k === 1) return B("drill", "Clue translator", 5, 3, 2, ord, "Eight clues, each read onto a small board; any misreading is named.", [["Clue translator", "/practice/clues"]], { go: "/practice/clues" });
  if (k === 2) return B("drill", "Must, could, cannot", 5, 3, 2, ord, "Sort six statements across a solved set's seatings.", [["Must, could, cannot", "/practice/must-could"]], { go: "/practice/must-could" });
  return B("drill", "First move", 5, 3, 2, ord, "Pick where to start a set and see how many ways each clue leaves open.", [["First move", "/practice/first-move"]], { go: "/practice/first-move" });
}

const retake = (ord: number): Block =>
  B("retake", "Retake a set you got wrong", 15, 10, 3, ord, "Without the walkthrough, then compare your first move with the post-mortem. LR redo questions due today go first.",
    [["Redo queue", "/practice/redo"], PRACTICE], { go: "/practice/redo" });
const guide = (ord: number): Block =>
  B("x-guide", "Read one LR guide", 15, 10, 0, ord, "One set type's guide: what to draw, where to start, the traps. Then try its worked example.", [GUIDES]);

function nextPaper(list: string[], ctx: PlanCtx): string | null {
  const done = new Set(ctx.mocks.filter((m) => m.sec === "DILR").map((m) => m.n.trim().toLowerCase()));
  return list.find((p) => !done.has(p.toLowerCase())) ?? null;
}
function paper(list: string[], label: string, ord: number, ctx: PlanCtx): Block {
  const p = nextPaper(list, ctx);
  if (!p) return B("paper", "Mock DILR section, timed", 40, 40, 1, ord, "You have done every paper in this set. Take a DILR sectional from your mock series instead.", [PRACTICE], { kind: "paper", paper: "", pkind: "Sectional" });
  const pdf = paperPdf(p);
  return B("paper", label + ": " + p, 40, 40, 1, ord,
    "Only the DILR section, 40 minutes, timed. Read every set first and pick two or three before solving. Log your score when you finish.",
    [...(pdf ? [["Download the paper", pdf] as Link] : []), PRACTICE], { kind: "paper", paper: p, pkind: "Past paper" });
}
const analysis = (ord: number): Block =>
  B("analysis", "Analyse that section", 20, 15, 2, ord, "For each set: was it the right pick, what was the first move, and what cost time. Add the misses to the Error log.", [["Error log", "/errors"]]);

export function dilrTemplate(d: string, ctx: PlanCtx): DayTemplate {
  const info = phaseIn(ctx.road, d);
  if (info.kind !== "phase") return { base: [], extra: [] };
  // A head start keeps Foundation's days, at whatever time the student gives it.
  const ph = info.phase.id || 1, g = dow(d), we = g === 0 || g === 6;
  // Timed past-paper sections every other Saturday in Build, every Saturday from Apply.
  const fortnight = Math.floor(diffDays(info.phase.start, d) / 7) % 2 === 1;
  // Week of the phase, from 1; and the weekdays that carry a DI set once DI is part of the routine.
  const week = Math.floor(diffDays(info.phase.start, d) / 7) + 1, diDay = g === 1 || g === 3 || g === 5;

  if (ph === 1) {
    if (week <= 3) return we ? { base: [setOfDay(35, 20, 1, true), drill(d, 2), retake(3)], extra: [guide(4)] } : { base: [setOfDay(20, 12, 1), drill(d, 2)], extra: [guide(3)] };
    // Weeks 4 and 5: DI basics, a DI set every day beside the LR set.
    if (week <= 5) return we ? { base: [...lrAndDi(true, 20, 12, 20, 15), drill(d, 3), retake(4)], extra: [] } : { base: [...lrAndDi(true, 15, 12, 20, 15), drill(d, 3)], extra: [] };
    if (!we && diDay) return { base: [...lrAndDi(false, 15, 12, 20, 15), drill(d, 3)], extra: [] };
    return we ? { base: [setOfDay(35, 20, 1, true), drill(d, 2), retake(3)], extra: [guide(4)] } : { base: [setOfDay(20, 12, 1), drill(d, 2)], extra: [guide(3)] };
  }
  if (ph === 2) {
    if (we && g === 6 && fortnight) return { base: [paper(PRACTICE_PAPERS, "Past paper", 1, ctx), analysis(2)], extra: [] };
    if (we) return { base: [setOfDay(35, 20, 1, true), drill(d, 2), retake(3)], extra: [guide(4)] };
    return diDay ? { base: [...lrAndDi(false, 15, 12, 20, 15), drill(d, 3)], extra: [] } : { base: [setOfDay(30, 20, 1, true), drill(d, 2)], extra: [] };
  }
  if (ph === 3) {
    if (g === 6) return { base: [paper(REAL_PAPERS, "Past paper", 1, ctx), analysis(2)], extra: [] };
    if (!we && diDay) return { base: [...lrAndDi(false, 15, 12, 20, 15), drill(d, 3)], extra: [retake(4)] };
    return { base: [setOfDay(30, 20, 1, true), drill(d, 2)], extra: [retake(3)] };
  }
  if (ph === 4) {
    if (g === 0) return { base: [analysis(1)], extra: [retake(2)] };
    if (we) return { base: [setOfDay(25, 15, 1, true), drill(d, 2)], extra: [] };
    return { base: [...lrAndDi(false, 12, 10, 15, 12), drill(d, 3)], extra: [] };
  }
  // Taper: one short set a day, LR and DI by turns.
  const errrev = B("errrev", "Error log review", 10, 5, 2, 2, "Your DILR entries: say the right first move, or the right base, before you read it.", [["Error log", "/errors"]]);
  return { base: [g % 2 ? diSet(15, 10, 1) : setOfDay(15, 10, 1), errrev], extra: [] };
}

export const DILR_PHASE_TEXT: Record<number, PhaseText> = {
  0: { goal: "Foundation's sets at your own pace: one LR set or a short drill on most days, so set types are familiar long before the plan gets serious.", check: "By the end of the head start: a set of every LR type tried once, and the habit of a set most days." },
  1: { goal: "Meet every LR set type untimed, then from week 4 a DI set beside it: one of each a day, a short drill, and a guide when a type is new.", check: "You have tried a set of every type, LR and DI, and can say where to start one." },
  2: { goal: "Two sets a day by type, three of them a week DI, and a timed DILR section of a past paper every other Saturday.", check: "You pick two or three of five sets in a 40-minute section without being told." },
  3: { goal: "A timed section every Saturday from recent papers, with the analysis the next day.", check: "Your section scores hold steady and the misses are first moves, not misreadings." },
  4: { goal: "Mock DILR sections analysed on Sundays, two short sets on weekdays.", check: "Set selection is the same in every mock: read all, pick, solve, move on." },
  5: { goal: "One easy set a day and your Error log, to stay warm without new strain.", check: "You know your set-picking rule by heart." },
};
