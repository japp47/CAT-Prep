import { CAUSES, OPTION_TRAPS } from "../data/traps";
import { addDays } from "../lib/date";
import { filterHref } from "./errorfilter";
import type { Cause, CrAttempt, ErrorEntry, PracticeSet, RcAttempt, SpeedRun } from "../lib/state";
import { rcStale } from "./versions";
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
    // An attempt on a set rewritten since would count its answers against the new questions.
    if (!set || rcStale(a)) return;
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
export function focusLines(i: { types: Row[]; genres: Row[]; traps: [string, number][]; pace: Pace; examPace: number; pattern?: Pattern }): FocusLine[] {
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

  // A pattern (same trap on the same kind of question) says more than the most common trap overall.
  if (i.pattern) { out.push({ text: i.pattern.text, to: i.pattern.to, cta: "Drill it" }); return out; }
  const [trap, n] = i.traps[0] ?? [];
  if (trap && n >= 2) out.push({ text: `The trap that caught you most is “${trap}”, ${n} times.`, to: "/errors", cta: "Open the Error log" });
  return out;
}


/** The practice type an Error log type belongs to: "RC: inference" counts under "RC". */
export const practiceTypeOf = (t: string) => (t.startsWith("RC") ? "RC" : t);

/** Where to drill a practice type ("Para jumble", "RC", "Critical reasoning"). */
export function drillForType(t: string): string {
  const va: Record<string, string> = { "Para summary": "ps", "Para jumble": "pj", "Odd sentence out": "oso", "Sentence insertion": "si" };
  return va[t] ? `/practice/va?type=${va[t]}&n=6` : t === "Critical reasoning" ? "/practice/cr?n=6" : t === "RC" ? "/practice/library" : "/practice";
}

/** to drills the pattern; list opens its entries in the Error log. */
export interface Pattern { key: string; text: string; n: number; of: number; to: string; list: string }
/** Errors in one pair before it is a pattern, and questions of the type practised (docs/research/step-2g.md). */
export const PATTERN_MIN = 4;

/**
 * Mistakes that repeat: the same trap, or the same cause, on the same kind of question within the last 30 days.
 * Traps come from the content, so they are evidence; causes are the student's own read, so they come second.
 */
export function patterns(errors: ErrorEntry[], practice: PracticeSet[], today: string, sec = "VARC", days = 30): Pattern[] {
  const from = addDays(today, -days);
  const recent = errors.filter((e) => e.sec === sec && e.d >= from && e.d <= today);
  const practised = new Map<string, number>();
  practice.forEach((p) => { if (p.sec === sec) practised.set(p.t, (practised.get(p.t) ?? 0) + p.a); });
  const ofType = new Map<string, number>(), pairs = new Map<string, { t: string; what: string; kind: "trap" | "cause"; n: number }>();
  const traps = new Set<string>(OPTION_TRAPS);
  recent.forEach((e) => {
    ofType.set(e.t, (ofType.get(e.t) ?? 0) + 1);
    const bump = (kind: "trap" | "cause", what: string) => {
      const k = kind + "|" + e.t + "|" + what;
      const p = pairs.get(k) ?? { t: e.t, what, kind, n: 0 };
      p.n++; pairs.set(k, p);
    };
    if (e.trap && traps.has(e.trap)) bump("trap", e.trap);
    if (e.cause) bump("cause", e.cause);
  });
  const name = (t: string) => (t.startsWith("RC: ") ? t.slice(4) : t.toLowerCase());
  return [...pairs.entries()]
    .filter(([, p]) => p.n >= PATTERN_MIN && (practised.get(practiceTypeOf(p.t)) ?? 0) >= MIN_Q)
    .sort((a, b) => (a[1].kind === b[1].kind ? b[1].n - a[1].n : a[1].kind === "trap" ? -1 : 1))
    .slice(0, 3)
    .map(([key, p]) => {
      const of = ofType.get(p.t) ?? p.n;
      const text = p.kind === "trap"
        ? `${p.n} of your last ${of} ${name(p.t)} misses fell for “${p.what.toLowerCase()}”.`
        : `${p.n} of your last ${of} ${name(p.t)} misses: you marked “${CAUSES[p.what as keyof typeof CAUSES].toLowerCase()}”.`;
      const list = filterHref(p.kind === "trap" ? { sec, t: p.t, trap: p.what } : { sec, t: p.t, cause: p.what as Cause });
      return { key, text, n: p.n, of, to: drillForType(practiceTypeOf(p.t)), list };
    });
}

const VA_LABEL: Record<string, string> = { ps: "Para summary", pj: "Para jumble", oso: "Odd sentence out", si: "Sentence insertion" };
/**
 * Right answers the student marked "Not sure", by practice type, most first. Lucky guesses: the score counted them,
 * but the skill may not be there yet (docs/research/step-2g.md).
 */
export function luckyGuesses(st: { rcAttempts: RcAttempt[]; vaAttempts: { items: { k: string; ok: boolean; unsure?: true }[] }[]; crAttempts: CrAttempt[] }): [string, number][] {
  const m = new Map<string, number>();
  const bump = (t: string) => m.set(t, (m.get(t) ?? 0) + 1);
  st.rcAttempts.forEach((a) => a.lucky?.forEach(() => bump("RC")));
  st.vaAttempts.forEach((a) => a.items.forEach((i) => { if (i.unsure && i.ok) bump(VA_LABEL[i.k.split(":")[0]] ?? "VA"); }));
  st.crAttempts.forEach((a) => a.items.forEach((i) => { if (i.unsure && i.ok) bump("Critical reasoning"); }));
  return [...m].sort((a, b) => b[1] - a[1]);
}
