import { CAUSES } from "../data/traps";
import { uid } from "../lib/date";
import type { Cause, ErrorEntry, MockQ, MockReview, PracticeSet, Recommendation, SectionalAttempt } from "../lib/state";
import type { Scored } from "./sectional";
import { VA_KIND, type VaKind } from "./va/build";

/**
 * The mock review (docs/feature.md, F12; method in docs/research/step-2f.md): every question gets a status,
 * wrong ones a cause, skipped ones "could I have got it?", and the result is where the marks went
 * and at most three actions. Everything here is pure, so the wizard and its tests share it.
 */

/** CAT 2024 and 2025 VARC: 4 passages of 4 questions, then 2 of each VA type. Odd sentence out and para jumbles are TITA. */
export const DEFAULT_LAYOUT: MockReview["layout"] = { rc: [4, 4, 4, 4], va: ["ps", "ps", "si", "si", "oso", "oso", "pj", "pj"] };
export const VA_ORDER: VaKind[] = ["ps", "si", "oso", "pj"];

export const isTita = (type: string) => !!VA_KIND[type as VaKind]?.tita;
/** The practice-row label of a type ("RC", "Para jumble"…), the one the report card groups by. */
export const typeLabel = (type: string) => (type === "rc" ? "RC" : VA_KIND[type as VaKind]?.practice ?? type);

/** The type of each question, in grid order: the passages, then the VA questions. */
export const typesOf = (l: MockReview["layout"]) => [...l.rc.flatMap((n) => Array<string>(n).fill("rc")), ...l.va];

/** Questions for a layout, all right by default. Answers already given carry over where the type at that place is the same. */
export function questionsFor(l: MockReview["layout"], prev: MockQ[] = []): MockQ[] {
  return typesOf(l).map((type, i) => (prev[i]?.type === type ? prev[i] : { st: "right", type }));
}

/** A question is slow when it took this long. CAT gives 100 seconds a question on average. */
export const SLOW_SECS = 150;

/** A review filled in from a sectional taken on this site: status, type and seconds per question; only the causes are left to ask. */
export function fromSectional(att: SectionalAttempt, rows: Scored[]): Pick<MockReview, "layout" | "qs"> {
  const rc: number[] = [], va: string[] = [];
  let lastSet = "";
  rows.forEach((r) => {
    if (r.ref.kind === "rc") {
      if (r.ref.set.id === lastSet) rc[rc.length - 1]++;
      else { rc.push(1); lastSet = r.ref.set.id; }
    } else va.push(r.ref.item.kind);
  });
  // Grid order is passages then VA; the paper has the same order, so rows map across one to one.
  const ordered = [...rows.filter((r) => r.ref.kind === "rc"), ...rows.filter((r) => r.ref.kind === "va")];
  const qs = ordered.map((r): MockQ => {
    const secs = att.t[r.i] ?? 0;
    const type = r.ref.kind === "rc" ? "rc" : r.ref.item.kind;
    const q: MockQ = { st: r.ok ? "right" : r.blank ? (secs > 0 ? "skip" : "unseen") : "wrong", type, secs };
    if (r.ok && secs > SLOW_SECS) q.slow = true;
    return q;
  });
  return { layout: { rc, va }, qs };
}

/** Marks a question cost: a wrong MCQ costs its 3 and a penalty mark; a wrong TITA, a skip or an unreached question costs 3. */
export const lost = (q: MockQ) => (q.st === "right" ? 0 : q.st === "wrong" && !isTita(q.type) ? 4 : 3);

/** Groups of lost marks, in the order the student reads them. */
export const GROUPS = [
  { key: "careless", label: "Careless", causes: ["slip", "misread"] },
  { key: "options", label: "Reading the options", causes: ["qualifier", "beyond", "trap"] },
  { key: "method", label: "Did not know the method", causes: ["method"] },
  { key: "choices", label: "Choosing what to attempt", causes: ["guess", "select"] },
  { key: "time", label: "Time", causes: ["time"] },
] as const;
export type GroupKey = (typeof GROUPS)[number]["key"] | "doable" | "unsorted";

function groupOf(q: MockQ): GroupKey | null {
  if (q.st === "right") return null;
  if (q.st === "unseen") return "time";
  if (q.st === "skip") return q.could === true ? "doable" : q.could === false ? null : "unsorted";
  return GROUPS.find((g) => (g.causes as readonly string[]).includes(q.cause ?? ""))?.key ?? "unsorted";
}

export const GROUP_LABEL: Record<GroupKey, string> = {
  ...Object.fromEntries(GROUPS.map((g) => [g.key, g.label])) as Record<(typeof GROUPS)[number]["key"], string>,
  doable: "Doable skips", unsorted: "Not sorted yet",
};

export interface TypeRow { type: string; label: string; n: number; right: number; wrong: number; skipped: number; marks: number }
export interface Findings {
  n: number; right: number; wrong: number; skipped: number; attempted: number; score: number; max: number;
  groups: { key: GroupKey; label: string; n: number; marks: number }[];
  goodSkips: number; slow: number; doable: number; solved: number;
  /** The score with no careless slips and the doable skips solved. */
  potential: number;
  byType: TypeRow[];
  /** Seconds on right answers, wrong answers and questions given up; only when the times are known. */
  time?: { right: number; wrong: number; gaveUp: number };
}

export function findings(r: Pick<MockReview, "qs">): Findings {
  const qs = r.qs;
  const right = qs.filter((q) => q.st === "right").length;
  const wrong = qs.filter((q) => q.st === "wrong").length;
  const penalty = qs.filter((q) => q.st === "wrong" && !isTita(q.type)).length;
  const score = 3 * right - penalty;
  const order: GroupKey[] = [...GROUPS.map((g) => g.key), "doable", "unsorted"];
  const groups = order.map((key) => {
    const g = qs.filter((q) => groupOf(q) === key);
    return { key, label: GROUP_LABEL[key], n: g.length, marks: g.reduce((s, q) => s + lost(q), 0) };
  }).filter((g) => g.n > 0);
  const doableQs = qs.filter((q) => q.st === "skip" && q.could === true);
  // Re-solved skips prove it; until the student re-tries them, a doable skip counts as doable.
  const solvedQs = doableQs.filter((q) => q.solved !== false);
  const careless = groups.find((g) => g.key === "careless")?.marks ?? 0;
  const types = [...new Set(qs.map((q) => q.type))];
  const byType = types.map((type): TypeRow => {
    const t = qs.filter((q) => q.type === type);
    const rt = t.filter((q) => q.st === "right").length, wr = t.filter((q) => q.st === "wrong");
    return { type, label: typeLabel(type), n: t.length, right: rt, wrong: wr.length, skipped: t.length - rt - wr.length, marks: 3 * rt - wr.filter((q) => !isTita(q.type)).length };
  });
  const timed = qs.some((q) => q.secs != null);
  const sum = (f: (q: MockQ) => boolean) => qs.filter(f).reduce((s, q) => s + (q.secs ?? 0), 0);
  return {
    n: qs.length, right, wrong, skipped: qs.length - right - wrong, attempted: right + wrong, score, max: 3 * qs.length,
    groups, goodSkips: qs.filter((q) => q.st === "skip" && q.could === false).length,
    slow: qs.filter((q) => q.st === "right" && q.slow).length, doable: doableQs.length, solved: doableQs.filter((q) => q.solved === true).length,
    potential: score + careless + 3 * solvedQs.length,
    byType,
    time: timed ? { right: sum((q) => q.st === "right"), wrong: sum((q) => q.st === "wrong"), gaveUp: sum((q) => q.st === "skip" || q.st === "unseen") } : undefined,
  };
}

/** What to do about each cause, in one line the student can act on this week. */
export const CAUSE_TIP: Record<Cause, string> = {
  misread: "Read each question twice and underline what it asks (except, not, most likely) before you look at the options.",
  qualifier: "Circle the qualifiers in the passage (often, some, partly) and reject options that drop or harden them.",
  beyond: "For every option you pick, point to the line that proves it. If you cannot, drop it.",
  trap: "Name the trap in each option you reject: extreme, out of scope, distorted or half right.",
  method: "Read the guide for this type and drill six of them untimed.",
  slip: "Before you move on, reread the question stem; for TITA answers, check what you typed.",
  guess: "Guess only after cutting two options. Otherwise skip: a wrong MCQ costs a mark.",
  select: "Read the questions before the passage, and leave a set that does not suit you within the first minute.",
  time: "Give each passage about 8 minutes and move on when the time is up.",
};

/** Where to practise a type. */
export function drillFor(type: string): string {
  return type === "rc" ? "/practice/library" : VA_KIND[type as VaKind] ? `/practice/va?type=${type}&n=6` : "/varc/practice";
}

/** Right answers out of attempted on one practice type, across everything logged so far. */
export function accuracyOf(practice: PracticeSet[], sec: string, t: string) {
  return practice.filter((p) => p.sec === sec && p.t === t).reduce((o, p) => ({ c: o.c + p.c, n: o.n + p.a }), { c: 0, n: 0 });
}

export type ActionDraft = Pick<Recommendation, "skill" | "text" | "why" | "to" | "before"> & { lost: number };

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/**
 * Up to three actions, ranked by the marks behind them. Each needs at least two questions of its kind,
 * so one bad question never becomes a week's focus.
 */
export function proposeActions(r: Pick<MockReview, "qs" | "sec">, practice: PracticeSet[], max = 3): ActionDraft[] {
  const out: ActionDraft[] = [];
  const f = findings(r);
  const causes = new Map<Cause, MockQ[]>();
  r.qs.forEach((q) => { if (q.st === "wrong" && q.cause && q.cause !== "method") causes.set(q.cause, [...(causes.get(q.cause) ?? []), q]); });
  causes.forEach((qs, c) => {
    if (qs.length < 2) return;
    const m = qs.reduce((s, q) => s + lost(q), 0);
    out.push({ skill: { kind: "cause", key: c }, text: CAUSE_TIP[c], why: `${plural(qs.length, "wrong answer")} from "${CAUSES[c].toLowerCase()}", ${m} marks.`, lost: m });
  });
  f.byType.forEach((t) => {
    const tq = r.qs.filter((q) => q.type === t.type);
    const missed = tq.filter((q) => (q.st === "wrong") || (q.st === "skip" && q.could));
    const method = tq.filter((q) => q.cause === "method").length;
    const acc = t.right + t.wrong ? t.right / (t.right + t.wrong) : 1;
    if (missed.length < 2 || (acc >= 0.6 && method < 2)) return;
    const m = missed.reduce((s, q) => s + lost(q), 0);
    const text = t.type === "rc"
      ? "Do two RC sets from the library this week, untimed, and check why every wrong option is wrong."
      : `Drill six ${t.label.toLowerCase()} questions this week and read the method first.`;
    const why = `${t.label}: ${t.right} of ${t.n} right${method ? `, ${plural(method, "miss", "misses")} from not knowing the method` : ""}, ${m} marks lost.`;
    out.push({ skill: { kind: "type", key: t.label }, text, why, to: drillFor(t.type), before: accuracyOf(practice, r.sec, t.label), lost: m });
  });
  if (f.doable >= 2) {
    out.push({
      skill: { kind: "skips", key: "doable" }, to: "/practice/sectional", lost: 3 * f.doable,
      text: `Attempt more. Next time, plan for ${f.attempted + f.doable} attempts.`,
      why: `${plural(f.doable, "skipped question was", "skipped questions were")} doable${f.solved ? `, and you solved ${f.solved} untimed` : ""}.`,
    });
  }
  if (f.slow >= 3) {
    out.push({ skill: { kind: "pace", key: "slow" }, to: "/practice/speed", lost: f.slow, text: "Work on pace: one timed RC passage a day this week, 8 minutes for the passage and its questions.", why: `${f.slow} right answers were slow.` });
  }
  return out.sort((a, b) => b.lost - a.lost).slice(0, max);
}

/** Practice rows by type, so the report card counts a mock taken elsewhere. Sectionals on this site already log their own. */
export function toPractice(r: MockReview): PracticeSet[] {
  return findings(r).byType.filter((t) => t.right + t.wrong > 0)
    .map((t) => ({ id: r.id + ":" + t.type, d: r.d, sec: r.sec, t: t.label, a: t.right + t.wrong, c: t.right, src: "Mock: " + (r.name || "unnamed") }));
}

const CAUSE_TRAP: Partial<Record<Cause, string>> = { misread: "Misread the passage", time: "Ran out of time", guess: "Guessed" };

/** Error log entries for the wrong answers. There is no question text for a mock taken elsewhere, so the cause is the record. */
export function toErrors(r: MockReview): ErrorEntry[] {
  return r.qs.flatMap((q, i) => q.st !== "wrong" ? [] : [{
    id: uid(), d: r.d, sec: r.sec, t: typeLabel(q.type), trap: (q.cause && CAUSE_TRAP[q.cause]) ?? "",
    src: `Mock: ${r.name || "unnamed"}, Q${i + 1}`, why: q.cause ? CAUSES[q.cause] + "." : "", fix: "",
  }]);
}

/** Marks lost by group across the last few reviews of a section, for the pattern that one mock cannot show. */
export function acrossReviews(reviews: MockReview[], sec: string, n = 5) {
  const last = reviews.filter((r) => r.sec === sec).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).slice(-n);
  const tally = new Map<GroupKey, number>();
  last.forEach((r) => findings(r).groups.forEach((g) => { if (g.key !== "unsorted") tally.set(g.key, (tally.get(g.key) ?? 0) + g.marks); }));
  return { count: last.length, groups: [...tally].map(([key, marks]) => ({ key, label: GROUP_LABEL[key], marks })).sort((a, b) => b.marks - a.marks) };
}
