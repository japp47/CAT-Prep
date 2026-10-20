import { addDays } from "../lib/date";
import type { AppState, Recommendation } from "../lib/state";
import { targetBand } from "./percentile";
import { accuracy } from "./report";

/**
 * Did the advice help? (docs/feature.md, F43 and F44). A recommendation on a question type keeps the accuracy before;
 * the accuracy after is read from practice logged since. Small samples are noisy (about 14 points either way on 12
 * questions), so "fixed" needs 12 or more questions after and a rise of 15 points (docs/research/step-2g.md).
 */
export const AFTER_MIN = 12;
export const FIXED_RISE = 15;

export type Progress = "early" | "fixed" | "better" | "notyet" | "unmeasured";
export interface Measured { rec: Recommendation; state: Progress; before: number | null; after: number | null; n: number }

/** Practice on the recommendation's question type logged after the day it was made. */
export function afterOf(st: AppState, rec: Recommendation) {
  return st.practice.filter((p) => p.sec === rec.sec && p.t === rec.skill.key && p.d > rec.d)
    .reduce((o, p) => ({ attempted: o.attempted + p.a, correct: o.correct + p.c }), { attempted: 0, correct: 0 });
}

export function measure(st: AppState, rec: Recommendation): Measured {
  if (rec.skill.kind !== "type" || !rec.before || !rec.before.n) return { rec, state: "unmeasured", before: null, after: null, n: 0 };
  const before = accuracy({ attempted: rec.before.n, correct: rec.before.c });
  const a = afterOf(st, rec), after = accuracy(a);
  if (a.attempted < AFTER_MIN || before == null || after == null) return { rec, state: "early", before, after, n: a.attempted };
  const rise = after - before;
  return { rec, state: rise >= FIXED_RISE ? "fixed" : rise >= 5 ? "better" : "notyet", before, after, n: a.attempted };
}

/** Recommendations still worth showing: not dismissed, newest first, one per skill. */
export function tracked(st: AppState): Measured[] {
  const seen = new Set<string>();
  return [...st.recs].filter((r) => r.status !== "dismissed").sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.updatedAt - a.updatedAt))
    .filter((r) => { const k = r.skill.kind + ":" + r.skill.key; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((r) => measure(st, r));
}

/** Accuracy over two windows of 14 days, for "are you improving?". Each window needs 20 questions to count. */
export function trend(st: AppState, today: string, sec = "VARC") {
  const win = (from: string, to: string) => st.practice.filter((p) => p.sec === sec && p.d > from && p.d <= to)
    .reduce((o, p) => ({ attempted: o.attempted + p.a, correct: o.correct + p.c }), { attempted: 0, correct: 0 });
  const now = win(addDays(today, -14), today), before = win(addDays(today, -28), addDays(today, -14));
  return { now: now.attempted >= 20 ? accuracy(now) : null, before: before.attempted >= 20 ? accuracy(before) : null, n: now.attempted };
}

/** Last three timed results against the target band, for "are you exam ready?". */
export function readiness(st: AppState, sec = "VARC") {
  const ms = st.mocks.filter((m) => m.sec === sec).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).slice(-3);
  if (!ms.length) return null;
  const band = targetBand(st.targets.varc, 24);
  const avg = ms.reduce((s, m) => s + m.c, 0) / ms.length;
  return { count: ms.length, avg: Math.round(avg * 10) / 10, band, onTarget: avg >= band[0] };
}
