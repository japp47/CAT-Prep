import { addDays } from "../lib/date";
import type { AppState, RedoItem } from "../lib/state";
import { CR_CATALOG, LR_CATALOG, RC_CATALOG, VA_CATALOG } from "./catalog.gen";
import type { Content, Need } from "./content";
import { lrRight } from "./lrcheck";
import { LR_TYPE, type CrItem, type LrSet, type RcSet } from "./types";
import { parseKey, scoreItem, VA_KIND, type VaItem } from "./va/build";

/**
 * Days until a missed question comes back. A miss puts it in box 0 (back tomorrow);
 * each right answer moves it up a box. Right in the last box clears it.
 */
export const REDO_GAPS = [1, 3, 7];
/** Most questions served in one sitting, so a long backlog never turns into a wall. */
export const REDO_PER_SESSION = 10;

export const rcRedoKey = (set: string, qi: number) => `rc:${set}:${qi}`;

const rcQuestions = new Map(RC_CATALOG.map((m) => [m.id, m.questions]));
const lrQuestions = new Map(LR_CATALOG.map((m) => [m.id, m.questions]));
const vaIds = new Set(VA_CATALOG.map((m) => m.id));
const crIds = new Set(CR_CATALOG.map((m) => m.id));

export const crRedoKey = (id: string) => `cr:${id}`;
/** An LR question: its set and its place in it. It comes back with its whole set, which it needs to be solved. */
export const lrRedoKey = (set: string, qi: number) => `lr:${set}:${qi}`;

/** Whether a key still points at a question in the library. Uses the catalog, so it works before the content loads. */
export function redoKeyExists(key: string): boolean {
  const [kind, id, n] = key.split(":");
  if (kind === "rc") return Number(n) < (rcQuestions.get(id) ?? 0);
  if (kind === "lr") return Number(n) < (lrQuestions.get(id) ?? 0);
  if (kind === "cr") return crIds.has(id);
  return kind in VA_KIND && vaIds.has(id);
}

/** A question the timed sectional can ask: an RC question or a VA item. */
export type ExamRef = { kind: "rc"; key: string; set: RcSet; qi: number } | { kind: "va"; key: string; item: VaItem };
export type RedoRef = ExamRef | { kind: "cr"; key: string; item: CrItem } | { kind: "lr"; key: string; set: LrSet; qi: number };

/** Finds the question behind a key. Null when it was removed from the library. */
export function resolveRedo(key: string, c: Content): RedoRef | null {
  if (key.startsWith("rc:")) {
    const [, id, n] = key.split(":");
    const set = c.rcById(id), qi = Number(n);
    return set && set.questions[qi] ? { kind: "rc", key, set, qi } : null;
  }
  if (key.startsWith("cr:")) {
    const item = c.crById(key.slice(3));
    return item ? { kind: "cr", key, item } : null;
  }
  if (key.startsWith("lr:")) {
    const [, id, n] = key.split(":");
    const set = c.lrById(id), qi = Number(n);
    return set && set.questions[qi] ? { kind: "lr", key, set, qi } : null;
  }
  const item = parseKey(key, c.vaParas);
  return item ? { kind: "va", key, item } : null;
}

/** Like resolveRedo, for the VARC sectional, which asks no critical reasoning or LR. */
export function resolveExam(key: string, c: Content): ExamRef | null {
  const ref = resolveRedo(key, c);
  return ref && (ref.kind === "rc" || ref.kind === "va") ? ref : null;
}

/** Only the content a set of redo keys needs, so a session loads its own files and no others. */
export function redoNeed(keys: string[]): Need {
  const rc = new Set<string>(), lr = new Set<string>();
  let va = false, cr = false;
  keys.forEach((k) => {
    const [kind, id] = k.split(":");
    if (kind === "rc") rc.add(id); else if (kind === "lr") lr.add(id); else if (kind === "cr") cr = true; else va = true;
  });
  return { rc: [...rc], va, cr, lr: [...lr] };
}

/**
 * The session's order: due order, except that an LR set's questions sit together, so the set is solved once for
 * all of them.
 */
export function groupBySet(keys: string[]): string[] {
  const set = (k: string) => (k.startsWith("lr:") ? k.split(":").slice(0, 2).join(":") : k);
  const firsts: string[] = [];
  keys.forEach((k) => { if (!firsts.includes(set(k))) firsts.push(set(k)); });
  return firsts.flatMap((f) => keys.filter((k) => set(k) === f));
}

/** Puts a missed question in the queue, or back to box 0 if it is already there. */
export function queueMiss(st: AppState, k: string, d: string): void {
  const due = addDays(d, REDO_GAPS[0]);
  const it = st.redo.find((r) => r.k === k);
  if (!it) { st.redo.push({ k, added: d, due, box: 0, tries: 0 }); return; }
  it.box = 0;
  it.due = due;
  delete it.cleared;
}

/** Records one answer from the redo queue. Returns true when the question leaves the queue. */
export function answerRedo(st: AppState, k: string, ok: boolean, d: string): boolean {
  const it = st.redo.find((r) => r.k === k);
  if (!it) return false;
  it.tries++;
  it.last = d;
  if (!ok) { it.box = 0; it.due = addDays(d, REDO_GAPS[0]); return false; }
  it.box++;
  if (it.box >= REDO_GAPS.length) { it.cleared = d; return true; }
  it.due = addDays(d, REDO_GAPS[it.box]);
  return false;
}

/**
 * "Try it again" from the Error log: the question is due today, in the queue again if it had left it. Its run of
 * right answers starts over only if it had left; an open item keeps its progress and is just due now.
 */
export function redoNow(st: AppState, k: string, d: string): void {
  const it = st.redo.find((r) => r.k === k);
  if (!it) { st.redo.push({ k, added: d, due: d, box: 0, tries: 0 }); return; }
  if (it.cleared) { delete it.cleared; it.box = 0; }
  if (it.due > d) it.due = d;
}

/** Open questions due on or before d, oldest first, skipping any that no longer exist. */
export function dueRedo(items: RedoItem[], d: string): RedoItem[] {
  return items.filter((r) => !r.cleared && r.due <= d && redoKeyExists(r.k)).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
}

/** Open questions due after d, counted by date. */
export function upcomingRedo(items: RedoItem[], d: string): [string, number][] {
  const by: Record<string, number> = {};
  items.forEach((r) => { if (!r.cleared && r.due > d) by[r.due] = (by[r.due] || 0) + 1; });
  return Object.entries(by).sort(([a], [b]) => (a < b ? -1 : 1));
}

/** The Progress row a redo answer counts toward: "RC" or the VA type. */
export const redoPracticeType = (ref: RedoRef) => (ref.kind === "rc" ? "RC" : ref.kind === "cr" ? "Critical reasoning" : ref.kind === "lr" ? "LR" : VA_KIND[ref.item.kind].practice);
/** The section a redo answer counts in. */
export const redoSection = (ref: RedoRef) => (ref.kind === "lr" ? "DILR" : "VARC");
/** How the queue names a question's kind. */
export const lrRedoLabel = (set: LrSet) => "LR, " + LR_TYPE[set.type].label.charAt(0).toLowerCase() + LR_TYPE[set.type].label.slice(1);

/**
 * Builds the queue from past attempts, for saves made before the queue existed.
 * It needs the answer keys, so it runs once the content has loaded (see RedoSeeder).
 */
export function seedRedo(st: AppState, c: Content): void {
  const events: { d: string; k: string; ok: boolean }[] = [];
  st.rcAttempts.forEach((a) => {
    const set = c.rcById(a.set);
    set?.questions.forEach((q, qi) => events.push({ d: a.d, k: rcRedoKey(a.set, qi), ok: a.ans[qi] === q.answer }));
  });
  st.vaAttempts.forEach((a) => a.items.forEach((i) => {
    const item = parseKey(i.k, c.vaParas);
    if (item) events.push({ d: a.d, k: i.k, ok: scoreItem(item, i.a).ok });
  }));
  st.crAttempts.forEach((a) => a.items.forEach((i) => events.push({ d: a.d, k: i.k, ok: i.ok })));
  lrEvents(st, c).forEach((e) => events.push(e));
  events.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  // A later right answer on a full retake takes the question back out.
  const open = new Map<string, string>();
  events.forEach((e) => { if (e.ok) open.delete(e.k); else open.set(e.k, e.d); });
  open.forEach((d, k) => queueMiss(st, k, d));
}

/** Every LR answer ever given, as right or not; an unsure answer counts as not, as at the time. */
function lrEvents(st: AppState, c: Content): { d: string; k: string; ok: boolean }[] {
  return st.lrAttempts.flatMap((a) => {
    const set = c.lrById(a.set);
    return set ? set.questions.map((q, qi) => ({ d: a.d, k: lrRedoKey(a.set, qi), ok: lrRight(q, a.ans[qi] ?? null) && !a.unsure?.includes(qi) })) : [];
  });
}

/**
 * LR sets taken before LR joined the queue (29 Oct 2026): their misses go in once, the same way seedRedo builds the
 * rest, with a later right retake taking a question back out.
 */
export function seedLrRedo(st: AppState, c: Content): void {
  const open = new Map<string, string>();
  lrEvents(st, c).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).forEach((e) => { if (e.ok) open.delete(e.k); else open.set(e.k, e.d); });
  open.forEach((d, k) => { if (!st.redo.some((r) => r.k === k)) queueMiss(st, k, d); });
}
