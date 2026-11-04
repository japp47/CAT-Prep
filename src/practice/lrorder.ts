import type { LrAttempt } from "../lib/state";
import { LR_CATALOG } from "./catalog.gen";
import { isDi, LR_TYPES, type LrMeta } from "./types";

const LEVEL = { easy: 0, medium: 1, hard: 2 } as const;
const easierFirst = (a: LrMeta, b: LrMeta) => LEVEL[a.difficulty] - LEVEL[b.difficulty] || a.minutes - b.minutes;
/** Easiest first, then shorter first, type by type: the order a student should meet the sets in (the practice list). */
export const LR_ORDER: LrMeta[] = [...LR_CATALOG].sort((a, b) => LR_TYPES.indexOf(a.type) - LR_TYPES.indexOf(b.type) || easierFirst(a, b));

/**
 * The data interpretation sets in the order the plan's DI block deals them (D82): easiest first within each picture,
 * charts and tables taking turns, so a week of DI meets both.
 */
export const DI_ORDER: LrMeta[] = (() => {
  const charts = LR_CATALOG.filter((s) => s.type === "di-chart").sort(easierFirst), tables = LR_CATALOG.filter((s) => s.type === "di-table").sort(easierFirst);
  return Array.from({ length: Math.max(charts.length, tables.length) }, (_, i) => [charts[i], tables[i]]).flat().filter((s): s is LrMeta => !!s);
})();

const untried = (order: LrMeta[], lr: LrAttempt[]) => { const tried = new Set(lr.map((a) => a.set)); return order.find((s) => !tried.has(s.id)); };
/** The first logical reasoning set in the practice order the student has not tried (DI sets have their own block). */
export const nextLrSet = (lr: LrAttempt[]): LrMeta | undefined => untried(LR_ORDER.filter((s) => !isDi(s.type)), lr);
/** The next data interpretation set the student has not tried. */
export const nextDiSet = (lr: LrAttempt[]): LrMeta | undefined => untried(DI_ORDER, lr);
