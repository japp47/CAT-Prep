import type { AppState } from "../lib/state";
import { REDO_SRC } from "../practice/record";
import { LIVE_SECTIONS } from "../sections";
import type { SectionDef } from "../sections/types";
import { buildDay, budgetFor, markBlockDone, type PlacedBlock } from "./engine";

/**
 * Plan blocks that tick themselves from work done on this site (today-v2, D57): an RC block from RC sets taken that
 * day, a VA or critical reasoning block from those drills, the LR set block from LR sets, a drill block from that
 * drill. Each block is ticked once at most: `auto` remembers it, so a block the student unticks stays unticked.
 */

/** How many of a kind a block asks for, from its name ("Three RCs", "Two LR sets", "Timed RC pair"). */
export function wanted(name: string): number {
  if (/\bthree\b/i.test(name)) return 3;
  if (/\b(two|pair)\b/i.test(name)) return 2;
  return 1;
}

const VA_TYPES = new Set(["Para jumble", "Para summary", "Odd sentence out", "Sentence insertion"]);
const DRILL_OF: Record<string, "clue" | "mcc" | "first"> = { "/practice/clues": "clue", "/practice/must-could": "mcc", "/practice/first-move": "first" };

/**
 * What on-site work that day covers a block, in a few words ("2 LR sets", "RC set, 3 of 4"), or null when the day's
 * work does not cover it (yet).
 */
export function siteWork(b: Pick<PlacedBlock, "id" | "name" | "ptype" | "go">, st: AppState, d: string): string | null {
  const need = wanted(b.name);
  if (b.ptype === "RC") {
    const rc = st.rcAttempts.filter((a) => a.d === d);
    return rc.length >= need ? (rc.length === 1 ? `RC set, ${rc[0].c} of ${rc[0].ans.length} right` : `${rc.length} RC sets`) : null;
  }
  if (b.ptype && VA_TYPES.has(b.ptype)) {
    const va = st.vaAttempts.filter((a) => a.d === d);
    return va.length ? `VA drill, ${va[0].items.filter((i) => i.ok).length} of ${va[0].items.length} right` : null;
  }
  if (b.ptype === "Critical reasoning") {
    const cr = st.crAttempts.filter((a) => a.d === d);
    return cr.length ? `Critical reasoning, ${cr[0].items.filter((i) => i.ok).length} of ${cr[0].items.length} right` : null;
  }
  if (b.go === "lr-next") {
    const lr = st.lrAttempts.filter((a) => a.d === d);
    return lr.length >= need ? (lr.length === 1 ? `LR set, ${3 * lr[0].c - lr[0].w} of ${3 * lr[0].ans.length}` : `${lr.length} LR sets`) : null;
  }
  if (b.go && DRILL_OF[b.go]) {
    const run = st.lrDrills.find((r) => r.d === d && r.kind === DRILL_OF[b.go!]);
    return run ? `${run.items.filter((i) => i.ok).length} of ${run.items.length} right` : null;
  }
  if (b.id === "retake") {
    // A retake: an LR set taken again that day, or LR questions answered from the redo queue.
    const before = new Set(st.lrAttempts.filter((a) => a.d < d).map((a) => a.set));
    const again = st.lrAttempts.some((a) => a.d === d && before.has(a.set));
    const redo = st.practice.some((p) => p.d === d && p.sec === "DILR" && p.src === REDO_SRC);
    return again || redo ? "Retaken on the site" : null;
  }
  return null;
}

/** The blocks of a day that on-site work covers and that were never ticked by it before. */
export function autoTicks(st: AppState, d: string): { sec: SectionDef; b: PlacedBlock }[] {
  const rec = st.days[d];
  return LIVE_SECTIONS.flatMap((sec) => buildDay(sec, st, d, budgetFor(sec, st, d), { today: d })
    .filter((b) => !rec?.done?.[b.key] && !rec?.auto?.[b.key] && siteWork(b, st, d) !== null)
    .map((b) => ({ sec, b })));
}

/** Ticks those blocks and remembers that it did, so an untick by the student is never undone. */
export function applyAutoTicks(st: AppState, d: string): void {
  autoTicks(st, d).forEach(({ sec, b }) => {
    markBlockDone(st, d, sec.id, b.key, b.mins, b.carryFrom);
    ((st.days[d] ??= {}).auto ??= {})[b.key] = 1;
  });
}
