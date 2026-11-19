import type { AppState } from "../lib/state";
import { LIVE_SECTIONS } from "../sections";
import { budgetFor, buildDay } from "./engine";

/** The minutes the day's plan holds across the live sections: the same plan Today shows. Loaded after the page. */
export function plannedMinutes(st: AppState, d: string): number {
  return LIVE_SECTIONS.reduce((s, sec) => s + buildDay(sec, st, d, budgetFor(sec, st, d), { today: d }).reduce((t, b) => t + b.mins, 0), 0);
}
