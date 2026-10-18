import { addDays } from "../lib/date";
import type { AppState, RedoItem } from "../lib/state";
import { CR_CATALOG, RC_CATALOG, VA_CATALOG } from "./catalog.gen";
import type { Content } from "./content";
import type { CrItem, RcSet } from "./types";
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
const vaIds = new Set(VA_CATALOG.map((m) => m.id));
const crIds = new Set(CR_CATALOG.map((m) => m.id));

export const crRedoKey = (id: string) => `cr:${id}`;

/** Whether a key still points at a question in the library. Uses the catalog, so it works before the content loads. */
export function redoKeyExists(key: string): boolean {
  const [kind, id, n] = key.split(":");
  if (kind === "rc") return Number(n) < (rcQuestions.get(id) ?? 0);
  if (kind === "cr") return crIds.has(id);
  return kind in VA_KIND && vaIds.has(id);
}

/** A question the timed sectional can ask: an RC question or a VA item. */
export type ExamRef = { kind: "rc"; key: string; set: RcSet; qi: number } | { kind: "va"; key: string; item: VaItem };
export type RedoRef = ExamRef | { kind: "cr"; key: string; item: CrItem };

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
  const item = parseKey(key, c.vaParas);
  return item ? { kind: "va", key, item } : null;
}

/** Like resolveRedo, for the sectional, which asks no critical reasoning. */
export function resolveExam(key: string, c: Content): ExamRef | null {
  const ref = resolveRedo(key, c);
  return ref && ref.kind !== "cr" ? ref : null;
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
export const redoPracticeType = (ref: RedoRef) => (ref.kind === "rc" ? "RC" : ref.kind === "cr" ? "Critical reasoning" : VA_KIND[ref.item.kind].practice);

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
  events.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  // A later right answer on a full retake takes the question back out.
  const open = new Map<string, string>();
  events.forEach((e) => { if (e.ok) open.delete(e.k); else open.set(e.k, e.d); });
  open.forEach((d, k) => queueMiss(st, k, d));
}
