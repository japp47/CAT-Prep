import { EXAM_ISO, phaseOf } from "../../data/exam";
import { paperPdf } from "../../data/papers";
import { diffDays, dow } from "../../lib/date";
import type { Block, DayTemplate, Link, PhaseText, PlanCtx } from "../types";
import { PRACTICE_PAPERS, REAL_PAPERS } from "../varc/plan";

/**
 * DILR's day plan (F22, D56): LR sets from this site, the drills, and from the Build phase timed DILR sections of past
 * papers. A block's `go` is the on-site action its button opens; "lr-next" means the next set in the practice order,
 * which the page resolves from the student's attempts (planner/go.ts).
 */

type Opt = Partial<Block>;
const B = (id: string, name: string, m: number, mm: number, pri: number, ord: number, desc: string, links: Link[], x?: Opt): Block =>
  ({ id, name, m, mm, pri, ord, desc, links, ...x });

const PRACTICE: Link = ["DILR practice", "/dilr/practice"];
const GUIDES: Link = ["LR guides", "/dilr"];

const setOfDay = (m: number, mm: number, ord: number, two = false): Block =>
  B("lrset", two ? "Two LR sets" : "LR set of the day", m, mm, 1, ord,
    two ? "The next two sets in the practice list, each within its target time, then the two-minute post-mortem for each."
      : "The next set in the practice list, within its target time, then the two-minute post-mortem.",
    [PRACTICE, GUIDES], { go: "lr-next" });

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
  const info = phaseOf(d);
  if (info.kind !== "phase" || d === EXAM_ISO) return { base: [], extra: [] };
  const ph = info.phase.id, g = dow(d), we = g === 0 || g === 6;
  // Timed past-paper sections every other Saturday in Build, every Saturday from Apply.
  const fortnight = Math.floor(diffDays(info.phase.start, d) / 7) % 2 === 1;

  if (ph === 1) return we ? { base: [setOfDay(35, 20, 1, true), drill(d, 2), retake(3)], extra: [guide(4)] } : { base: [setOfDay(20, 12, 1), drill(d, 2)], extra: [guide(3)] };
  if (ph === 2) {
    if (we && g === 6 && fortnight) return { base: [paper(PRACTICE_PAPERS, "Past paper", 1, ctx), analysis(2)], extra: [] };
    return we ? { base: [setOfDay(35, 20, 1, true), drill(d, 2), retake(3)], extra: [guide(4)] } : { base: [setOfDay(30, 20, 1, true), drill(d, 2)], extra: [] };
  }
  if (ph === 3) {
    if (g === 6) return { base: [paper(REAL_PAPERS, "Past paper", 1, ctx), analysis(2)], extra: [] };
    return { base: [setOfDay(30, 20, 1, true), drill(d, 2)], extra: [retake(3)] };
  }
  if (ph === 4) {
    if (g === 0) return { base: [analysis(1)], extra: [retake(2)] };
    return { base: [setOfDay(25, 15, 1, true), drill(d, 2)], extra: [] };
  }
  return { base: [setOfDay(15, 10, 1), B("errrev", "Error log review", 10, 5, 2, 2, "Your LR entries: say the right first move before you read it.", [["Error log", "/errors"]])], extra: [] };
}

export const DILR_PHASE_TEXT: Record<number, PhaseText> = {
  1: { goal: "Meet every LR set type untimed: one set a day, a short drill, and a guide when a type is new.", check: "You have tried a set of every type and can say where to start one." },
  2: { goal: "Two sets a day by type, and a timed DILR section of a past paper every other Saturday.", check: "You pick two or three of five sets in a 40-minute section without being told." },
  3: { goal: "A timed section every Saturday from recent papers, with the analysis the next day.", check: "Your section scores hold steady and the misses are first moves, not misreadings." },
  4: { goal: "Mock DILR sections analysed on Sundays, two short sets on weekdays.", check: "Set selection is the same in every mock: read all, pick, solve, move on." },
  5: { goal: "One easy set a day and your Error log, to stay warm without new strain.", check: "You know your set-picking rule by heart." },
};
