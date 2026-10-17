import { addDays, diffDays } from "../lib/date";
import { RC_CATALOG, VA_CATALOG } from "./catalog.gen";
import { shuffle } from "./random";
import type { RcMeta } from "./types";
import { DAILY_MIX } from "./va/build";

/** Day 0 of the daily series. Everyone sees the same set on the same date. */
export const DAILY_EPOCH = "2026-10-12";

interface Dated { id: string; since?: string }

/**
 * Picks `per` items for date d. The series runs in cycles: each cycle shuffles the items that
 * had joined by the day it starts, and serves each of them once before the next cycle begins.
 *
 * New content therefore never changes a day that has already been served. Give a new item a
 * `since` date of the day after you publish it (or later); it joins at the first cycle that starts
 * on or after that date. Content without `since` is the launch set, in the rotation from the start.
 * A test in engine.test.ts freezes the days already served, so a mistake here fails the build.
 */
export function dailyPick<T extends Dated>(items: T[], d: string, salt: string, per = 1): T[] {
  const joined = (start: string) => items.filter((x) => (x.since ?? DAILY_EPOCH) <= start);
  const order = (pool: T[], cycle: number, prevLast: string | null) => {
    const a = shuffle(pool, salt + ":" + cycle);
    // Never serve the same item two days running across a cycle boundary.
    if (prevLast && a.length > 2 && a[0].id === prevLast) [a[0], a[1]] = [a[1], a[0]];
    return a;
  };
  const lastOf = (a: T[], days: number) => a[days * per - 1].id;

  if (d < DAILY_EPOCH) {
    // Before the series began: count cycles backwards over the launch set.
    const pool = joined(DAILY_EPOCH);
    const days = Math.max(1, Math.floor(pool.length / per));
    const idx = diffDays(DAILY_EPOCH, d);
    const cycle = Math.floor(idx / days);
    const prev = shuffle(pool, salt + ":" + (cycle - 1));
    const pos = ((idx % days) + days) % days;
    return order(pool, cycle, prev[prev.length - 1].id).slice(pos * per, pos * per + per);
  }

  let start = DAILY_EPOCH, prevLast: string | null = null;
  for (let cycle = 0; ; cycle++) {
    const pool = joined(start);
    const days = Math.max(1, Math.floor(pool.length / per));
    const a = order(pool, cycle, prevLast);
    const end = addDays(start, days);
    if (d < end) {
      const pos = diffDays(start, d);
      return a.slice(pos * per, pos * per + per);
    }
    prevLast = lastOf(a, days);
    start = end;
  }
}

export const dayNumber = (d: string) => diffDays(DAILY_EPOCH, d) + 1;
export const rcOfDay = (d: string): RcMeta => dailyPick(RC_CATALOG, d, "rc")[0];
export const speedSetOfDay = (d: string): RcMeta => dailyPick(RC_CATALOG, d, "speed")[0];
/** The daily VA drill as item keys, such as "ps:bees". The VA player builds the items once the content has loaded. */
export function vaKeysOfDay(d: string): string[] {
  return dailyPick(VA_CATALOG, d, "va", DAILY_MIX.length).map((p, i) => DAILY_MIX[i] + ":" + p.id);
}
