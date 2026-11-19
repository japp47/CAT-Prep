import type { AppState } from "../lib/state";
import type { SectionDef } from "../sections/types";

/**
 * What is done in a day's plan: the ticks and their minutes. Kept apart from the planner (engine.ts) because the focus
 * timer and the sidebar need it on every page, and the planner, with its templates, need not load with them (F97).
 */

export const doneKey = (sec: SectionDef, id: string) => sec.id + ":" + id;
/** A catch-up block's id carries the day it makes up for, so a newer catch-up never inherits an older one's tick. */
export const carryId = (date: string) => "carry:" + date;

/**
 * Ticks a block as done. Its minutes are the focus-timer time if there is any, else the planned length.
 * Finishing a catch-up block also marks the missed day as caught up.
 */
export function markBlockDone(st: AppState, d: string, secId: SectionDef["id"], key: string, planned: number, carryFrom?: string): void {
  const rec = (st.days[d] ??= {});
  (rec.done ??= {})[key] = rec.spent?.[key] || planned;
  if (carryFrom) ((st.days[carryFrom] ??= {}).carried ??= {})[secId] = 1;
}

export function doneMinutes(st: AppState, d: string, sec?: SectionDef): number {
  const m = st.days[d]?.done ?? {};
  return Object.keys(m).filter((k) => !sec || k.startsWith(sec.id + ":")).reduce((s, k) => s + m[k], 0);
}
