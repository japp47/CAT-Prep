import { diffDays } from "../lib/date";
import { shuffle } from "./random";
import { RC_SETS } from "./rc";
import { VA_PARAS } from "./va/paragraphs";
import { buildItem, DAILY_MIX, type VaItem } from "./va/build";
import type { RcSet } from "./types";

/** Day 0 of the daily series. Everyone sees the same set on the same date. */
export const DAILY_EPOCH = "2026-10-12";

function cycleOrder<T extends { id: string }>(items: T[], salt: string, cycle: number): T[] {
  const a = shuffle(items, salt + ":" + cycle);
  if (a.length > 2) {
    // Never serve the same item two days running across a cycle boundary.
    const prev = shuffle(items, salt + ":" + (cycle - 1));
    if (a[0].id === prev[prev.length - 1].id) [a[0], a[1]] = [a[1], a[0]];
  }
  return a;
}

/** Picks `per` items for date d. Every item is used once per cycle before any repeats. */
export function dailyPick<T extends { id: string }>(items: T[], d: string, salt: string, per = 1): T[] {
  const days = Math.max(1, Math.floor(items.length / per));
  const idx = diffDays(DAILY_EPOCH, d);
  const cycle = Math.floor(idx / days);
  const pos = ((idx % days) + days) % days;
  return cycleOrder(items, salt, cycle).slice(pos * per, pos * per + per);
}

export const dayNumber = (d: string) => diffDays(DAILY_EPOCH, d) + 1;
export const rcOfDay = (d: string): RcSet => dailyPick(RC_SETS, d, "rc")[0];
export const speedSetOfDay = (d: string): RcSet => dailyPick(RC_SETS, d, "speed")[0];
export function vaOfDay(d: string): VaItem[] {
  return dailyPick(VA_PARAS, d, "va", DAILY_MIX.length).map((p, i) => buildItem(DAILY_MIX[i], p));
}
