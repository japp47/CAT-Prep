import { CAUSE_TIP } from "./mockreview";
import { addDays, weekStart } from "../lib/date";
import type { AppState, Recommendation, WeekReview } from "../lib/state";
import { budgetFor } from "../planner/engine";
import { LIVE_SECTIONS } from "../sections";
import { accuracy } from "./report";
import { activityDays } from "./streak";
import { VA_KIND, VA_KINDS } from "./va/build";
import { reviewOf, reviewWeek } from "./weekopen";

export { reviewOf, reviewWeek };

/**
 * The weekly review (docs/feature.md, F13; research in docs/research/step-2f.md). It follows the exam-wrapper order:
 * what you did, how it went, what you missed, and one thing to change. Everything is computed from local data,
 * with the report card's own accuracy function, so the two never disagree.
 */

/** Questions a type needs in both weeks before its change is shown. */
export const MIN_TYPE_Q = 6;
/** Points of accuracy a type must move to count as improved or slipped. */
export const MOVE = 10;
/** Times the focus is asked for in its week. */
export const FOCUS_DAYS = 3;

export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

/** The week a review page opens on: the week under review while it is open, otherwise this week so far. */
export const latestWeek = (today: string, hour: number) => reviewWeek(today, hour) ?? weekStart(today);

type Tally = Record<string, { attempted: number; correct: number }>;
function tally(st: AppState, days: string[], sec = "VARC"): Tally {
  const set = new Set(days), out: Tally = {};
  st.practice.forEach((p) => {
    if (p.sec !== sec || !set.has(p.d)) return;
    const t = (out[p.t] ??= { attempted: 0, correct: 0 });
    t.attempted += p.a; t.correct += p.c;
  });
  return out;
}
const total = (t: Tally) => Object.values(t).reduce((o, x) => ({ attempted: o.attempted + x.attempted, correct: o.correct + x.correct }), { attempted: 0, correct: 0 });

export interface Move { type: string; before: number; after: number; n: number }
export interface WeekFacts {
  monday: string;
  /** Days with any study, out of the days of the week that have passed. */
  studied: number; daysSoFar: number;
  minutes: { done: number; planned: number; lastWeek: number };
  questions: { attempted: number; correct: number; acc: number | null; lastAcc: number | null };
  improved: Move[]; slipped: Move[];
  trap: { name: string; n: number } | null;
  redo: { cleared: number; due: number };
  /** Last week's focus and what happened to it this week. */
  lastFocus: { rec: Recommendation; attempted: number; acc: number | null; before: number | null } | null;
  light: boolean;
}

function minutesDone(st: AppState, d: string) {
  return Object.values(st.days[d]?.done ?? {}).reduce((s, m) => s + (m > 0 ? m : 0), 0);
}

export function weekFacts(st: AppState, monday: string, today: string): WeekFacts {
  const days = weekDays(monday).filter((d) => d <= today);
  const prev = weekDays(addDays(monday, -7));
  const active = activityDays(st);
  const cur = tally(st, days), last = tally(st, prev);
  const tc = total(cur), tl = total(last);
  const moves = Object.keys(cur).flatMap((type): Move[] => {
    const a = cur[type], b = last[type];
    if (!b || a.attempted < MIN_TYPE_Q || b.attempted < MIN_TYPE_Q) return [];
    return [{ type, before: accuracy(b)!, after: accuracy(a)!, n: a.attempted }];
  });
  const traps = new Map<string, number>();
  st.errors.forEach((e) => { if (e.trap && days.includes(e.d)) traps.set(e.trap, (traps.get(e.trap) ?? 0) + 1); });
  const top = [...traps].sort((a, b) => b[1] - a[1])[0];
  const lastWeek = prev.reduce((s, d) => s + minutesDone(st, d), 0);
  const done = days.reduce((s, d) => s + minutesDone(st, d), 0);
  // Three missed days in a row inside the week, or half the minutes of the week before.
  let run = 0, longest = 0;
  days.forEach((d) => { run = active.has(d) ? 0 : run + 1; longest = Math.max(longest, run); });

  const prevReview = st.weekReviews.find((r) => r.id === addDays(monday, -7));
  const rec = prevReview?.focus ? st.recs.find((r) => r.id === prevReview.focus) : undefined;
  let lastFocus: WeekFacts["lastFocus"] = null;
  if (rec) {
    const t = rec.skill.kind === "type" ? cur[rec.skill.key] : undefined;
    lastFocus = { rec, attempted: t?.attempted ?? 0, acc: t ? accuracy(t) : null, before: rec.before ? accuracy({ attempted: rec.before.n, correct: rec.before.c }) : null };
  }

  return {
    monday, studied: days.filter((d) => active.has(d)).length, daysSoFar: days.length,
    minutes: { done, planned: days.reduce((s, d) => s + LIVE_SECTIONS.reduce((m, sec) => m + budgetFor(sec, st, d), 0), 0), lastWeek },
    questions: { ...tc, acc: tc.attempted >= 20 ? accuracy(tc) : null, lastAcc: tl.attempted >= 20 && tc.attempted >= 20 ? accuracy(tl) : null },
    improved: moves.filter((m) => m.after - m.before >= MOVE).sort((a, b) => b.after - b.before - (a.after - a.before)),
    slipped: moves.filter((m) => m.before - m.after >= MOVE).sort((a, b) => a.after - a.before - (b.after - b.before)),
    trap: top && top[1] >= 2 ? { name: top[0], n: top[1] } : null,
    redo: {
      cleared: st.redo.filter((r) => r.cleared && days.includes(r.cleared)).length,
      due: st.redo.filter((r) => !r.cleared && r.due <= addDays(monday, 13)).length,
    },
    lastFocus,
    // Minutes are only compared once the week is over: on a Wednesday every week looks light.
    light: longest >= 3 || (days.length === 7 && lastWeek >= 60 && done <= lastWeek / 2),
  };
}

/** Where to practise a practice type ("Para jumble", "RC", "Critical reasoning"). */
export function drillForType(t: string): string {
  const k = VA_KINDS.find((x) => VA_KIND[x].practice === t);
  return k ? `/practice/va?type=${k}&n=6` : t === "Critical reasoning" ? "/practice/cr?n=6" : t === "RC" ? "/practice/library" : "/practice";
}

export type FocusOption = Pick<Recommendation, "skill" | "text" | "why" | "to" | "before"> & { rec?: string };

/**
 * Up to three focus choices for next week, best first: the weakest type over the last four weeks (with enough questions),
 * an open action from a mock review, the trap of the week, and a long redo queue.
 */
export function focusOptions(st: AppState, monday: string, today: string, facts = weekFacts(st, monday, today)): FocusOption[] {
  const out: FocusOption[] = [];
  const four = tally(st, Array.from({ length: 28 }, (_, i) => addDays(monday, i - 21)).filter((d) => d <= today));
  const weak = Object.entries(four).filter(([, x]) => x.attempted >= MIN_TYPE_Q && accuracy(x)! < 70).sort((a, b) => accuracy(a[1])! - accuracy(b[1])!)[0];
  if (weak) {
    const [t, x] = weak;
    out.push({
      skill: { kind: "type", key: t }, to: drillForType(t), before: { c: x.correct, n: x.attempted },
      text: t === "RC" ? "Two RC sets untimed, then check why every wrong option is wrong." : `Drill six ${t.toLowerCase()} questions and read the method first.`,
      why: `${t}: ${x.correct} of ${x.attempted} right over the last four weeks, ${accuracy(x)}%. Your weakest type with enough questions.`,
    });
  }
  st.recs.filter((r) => r.status === "open" && r.from === "mock").slice(-2).reverse().forEach((r) => {
    if (out.length < 3 && !out.some((o) => o.skill.kind === r.skill.kind && o.skill.key === r.skill.key)) out.push({ skill: r.skill, text: r.text, why: "From your mock review: " + r.why, to: r.to, before: r.before, rec: r.id });
  });
  if (facts.trap && out.length < 3) {
    out.push({ skill: { kind: "cause", key: "trap" }, to: "/practice/library", text: CAUSE_TIP.trap, why: `"${facts.trap.name}" caught you ${facts.trap.n} times this week.` });
  }
  if (facts.redo.due >= 10 && out.length < 3) {
    out.push({ skill: { kind: "redo", key: "queue" }, to: "/practice/redo", text: "Clear the redo queue: ten questions a session.", why: `${facts.redo.due} questions are due by next Sunday.` });
  }
  return out.slice(0, 3);
}


/** This week's focus on Today: the one chosen in last week's review, while it is open and asked for on more days. */
export function focusToday(st: AppState, today: string): { review: WeekReview; rec: Recommendation; doneToday: boolean; left: number } | null {
  const review = reviewOf(st, addDays(weekStart(today), -7));
  const rec = review?.focus ? st.recs.find((r) => r.id === review.focus) : undefined;
  if (!review || !rec || rec.status === "dismissed") return null;
  const doneToday = review.days.includes(today);
  if (review.days.length >= FOCUS_DAYS && !doneToday) return null;
  return { review, rec, doneToday, left: Math.max(0, FOCUS_DAYS - review.days.length) };
}
