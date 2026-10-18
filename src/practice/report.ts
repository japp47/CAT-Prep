import type { CrAttempt, ErrorEntry, PracticeSet, RcAttempt, SpeedRun } from "../lib/state";
import { CR_TYPE, CR_TYPES, GENRES, RC_QTYPE, type CrMeta, type Difficulty, type RcMeta, type RcSet } from "./types";

/** Questions attempted and right for one group, such as one question type or one genre. Skipped questions are not counted. */
export interface Row { key: string; label: string; attempted: number; correct: number }

/** Accuracy as a whole percent, or null when nothing was attempted. */
export const accuracy = (r: { attempted: number; correct: number }) => (r.attempted ? Math.round((r.correct / r.attempted) * 100) : null);

/** Fewest questions a group needs before the report card says anything about it. */
export const MIN_Q = 6;
/** Fewest questions overall before the report card has a story to tell. */
export const MIN_TOTAL = 20;

const add = (m: Map<string, Row>, key: string, label: string, ok: boolean) => {
  const r = m.get(key) ?? { key, label, attempted: 0, correct: 0 };
  r.attempted++;
  if (ok) r.correct++;
  m.set(key, r);
};
const inOrder = (m: Map<string, Row>, order: string[]) => [...order.filter((k) => m.has(k)).map((k) => m.get(k)!), ...[...m.values()].filter((r) => !order.includes(r.key))];

/** Accuracy per practice type from the logged sets of one section. Types without sets are kept, with zero, so the list stays complete. */
export function byPracticeType(practice: PracticeSet[], sec: string, types: string[]): Row[] {
  const m = new Map<string, Row>(types.map((t) => [t, { key: t, label: t, attempted: 0, correct: 0 }]));
  practice.filter((p) => p.sec === sec).forEach((p) => {
    const r = m.get(p.t) ?? { key: p.t, label: p.t, attempted: 0, correct: 0 };
    r.attempted += p.a;
    r.correct += p.c;
    m.set(p.t, r);
  });
  return [...m.values()];
}

/** Accuracy of RC attempts grouped by something about the passage, read from the catalog. Only groups with attempts are returned. */
function rcGrouped(attempts: RcAttempt[], catalog: RcMeta[], group: (m: RcMeta) => [string, string], order: string[]): Row[] {
  const meta = new Map(catalog.map((m) => [m.id, m]));
  const m = new Map<string, Row>();
  attempts.forEach((a) => {
    const x = meta.get(a.set);
    if (!x) return;
    const [key, label] = group(x);
    const r = m.get(key) ?? { key, label, attempted: 0, correct: 0 };
    r.attempted += a.c + a.w;
    r.correct += a.c;
    m.set(key, r);
  });
  return inOrder(m, order);
}

export const rcByGenre = (attempts: RcAttempt[], catalog: RcMeta[]) => rcGrouped(attempts, catalog, (x) => [x.genre, GENRES[x.genre]], Object.keys(GENRES));
const LEVELS: Difficulty[] = ["easy", "medium", "hard"];
export const rcByDifficulty = (attempts: RcAttempt[], catalog: RcMeta[]) => rcGrouped(attempts, catalog, (x) => [x.difficulty, x.difficulty[0].toUpperCase() + x.difficulty.slice(1)], LEVELS);

/** Accuracy of RC attempts by kind of question (main idea, inference, tone…). Needs the passages, so it is built once they have loaded. */
export function rcByQuestionType(attempts: RcAttempt[], rcById: (id: string) => RcSet | undefined): Row[] {
  const m = new Map<string, Row>();
  attempts.forEach((a) => {
    const set = rcById(a.set);
    if (!set) return;
    set.questions.forEach((q, i) => {
      if (a.ans[i] == null) return;
      add(m, q.type, RC_QTYPE[q.type].label, a.ans[i] === q.answer);
    });
  });
  return inOrder(m, Object.keys(RC_QTYPE));
}

/** Accuracy of critical reasoning drills by kind of question (assumption, weaken, flaw…). Blank questions are not counted. */
export function crByKind(attempts: CrAttempt[], catalog: CrMeta[]): Row[] {
  const meta = new Map(catalog.map((m) => [m.id, m]));
  const m = new Map<string, Row>();
  attempts.forEach((a) => a.items.forEach((i) => {
    const x = meta.get(i.k.slice(3));
    if (x && i.a !== null) add(m, x.type, CR_TYPE[x.type].label, i.ok);
  }));
  return inOrder(m, CR_TYPES);
}

/** The group with the lowest accuracy among those with at least `min` questions. Ties go to the one with more questions. */
export function weakest(rows: Row[], min = MIN_Q): Row | null {
  const ok = rows.filter((r) => r.attempted >= min);
  if (!ok.length) return null;
  return ok.reduce((w, r) => (accuracy(r)! < accuracy(w)! || (accuracy(r) === accuracy(w) && r.attempted > w.attempted) ? r : w));
}

export interface Pace {
  /** Runs with both recall questions right, oldest first. Faster reading without recall proves nothing. */
  runs: SpeedRun[];
  best: number;
  /** Average of the first and the last three runs, to show the direction. Null until there are two runs. */
  first: number | null;
  last: number | null;
}

export function paceTrend(runs: SpeedRun[]): Pace {
  const ok = runs.filter((r) => r.recall === 2).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  const avg = (xs: SpeedRun[]) => Math.round(xs.reduce((s, r) => s + r.wpm, 0) / xs.length);
  return {
    runs: ok,
    best: ok.reduce((m, r) => Math.max(m, r.wpm), 0),
    first: ok.length >= 2 ? avg(ok.slice(0, 3)) : null,
    last: ok.length >= 2 ? avg(ok.slice(-3)) : null,
  };
}

/** The traps behind a section's logged mistakes, most common first. */
export function topTraps(errors: ErrorEntry[], sec: string, n = 6): [string, number][] {
  const m = new Map<string, number>();
  errors.filter((e) => e.sec === sec && e.trap).forEach((e) => m.set(e.trap, (m.get(e.trap) ?? 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n);
}

export interface FocusLine { text: string; to: string; cta: string }

/** Plain sentences on what to work on next, from what the student has logged. Empty until there is enough to say. */
export function focusLines(i: { types: Row[]; genres: Row[]; traps: [string, number][]; pace: Pace; examPace: number }): FocusLine[] {
  const total = i.types.reduce((s, r) => s + r.attempted, 0);
  if (total < MIN_TOTAL) return [];
  const out: FocusLine[] = [];

  const t = weakest(i.types);
  if (t && accuracy(t)! < 80) out.push({ text: `${t.label} is your weakest type: ${t.correct} of ${t.attempted} right, ${accuracy(t)}%.`, to: "/practice", cta: "Drill it in Practice" });

  const rc = i.genres.reduce((s, r) => ({ attempted: s.attempted + r.attempted, correct: s.correct + r.correct }), { attempted: 0, correct: 0 });
  const g = weakest(i.genres, 8);
  if (g && accuracy(rc) !== null && accuracy(g)! <= accuracy(rc)! - 10) {
    out.push({ text: `${g.label} passages trail the rest: ${accuracy(g)}% right, against ${accuracy(rc)}% across all your RCs.`, to: "/practice/library", cta: "Pick one in the library" });
  }

  if (i.pace.best) {
    out.push(i.pace.best < i.examPace
      ? { text: `Your best reading pace with full recall is ${i.pace.best} words a minute. CAT needs about ${i.examPace}.`, to: "/practice/speed", cta: "Test your pace again" }
      : { text: `Your reading pace with full recall, ${i.pace.best} words a minute, is at CAT pace.`, to: "/practice/speed", cta: "Test your pace again" });
  }

  const [trap, n] = i.traps[0] ?? [];
  if (trap && n >= 2) out.push({ text: `The trap that caught you most is “${trap}”, ${n} times.`, to: "/errors", cta: "Open the Error log" });
  return out;
}

