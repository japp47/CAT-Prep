import { addDays } from "../lib/date";
import type { AppState } from "../lib/state";

export const SHIELDS_PER_MONTH = 2;

/** Days on which the student did anything: ticked a block, logged a set, or Practiced in the app. */
export function activityDays(st: AppState): Set<string> {
  const s = new Set<string>();
  Object.entries(st.days).forEach(([d, r]) => { if (r.done && Object.values(r.done).some((m) => m > 0)) s.add(d); });
  [st.practice, st.mocks, st.errors, st.rcAttempts, st.vaAttempts, st.speedRuns, st.sectionals].forEach((list) => list.forEach((x) => x.d && s.add(x.d)));
  st.redo.forEach((r) => r.last && s.add(r.last));
  return s;
}

export interface Streak { days: number; activeToday: boolean; shieldsLeft: number; shielded: string[] }

/**
 * Consecutive active days ending today (or yesterday, while today is still open).
 * A missed day is covered by a shield if that month has one left. Shields are only
 * spent when they actually join two active stretches.
 */
export function computeStreak(active: Set<string>, today: string, perMonth = SHIELDS_PER_MONTH): Streak {
  const activeToday = active.has(today);
  const first = [...active].sort()[0];
  const used: Record<string, number> = {};
  const shielded: string[] = [];
  let days = 0, pending: string[] = [];
  let d = activeToday ? today : addDays(today, -1);
  for (let i = 0; first && d >= first && i < 2000; i++) {
    if (active.has(d)) {
      days++;
      pending.forEach((p) => { used[p.slice(0, 7)] = (used[p.slice(0, 7)] || 0) + 1; shielded.push(p); });
      pending = [];
    } else {
      const m = d.slice(0, 7);
      const taken = (used[m] || 0) + pending.filter((p) => p.slice(0, 7) === m).length;
      if (taken >= perMonth) break;
      pending.push(d);
    }
    d = addDays(d, -1);
  }
  return { days, activeToday, shieldsLeft: perMonth - (used[today.slice(0, 7)] || 0), shielded };
}
