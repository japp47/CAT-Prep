import { DEFAULT_TARGET, TARGET_CHOICES } from "../data/targets";
import { clamp, isIsoDate, todayIso } from "./date";
import type { SectionId } from "../sections/types";

export const SECTION_IDS: SectionId[] = ["varc", "dilr", "quant"];
const DEFAULT_TIME: Record<SectionId, { wd: number; we: number }> = {
  varc: { wd: 60, we: 120 },
  dilr: { wd: 45, we: 90 },
  quant: { wd: 45, we: 90 },
};

export interface TimeSettings {
  /** Minutes on Monday to Friday */
  wd: number;
  /** Minutes on Saturday and Sunday */
  we: number;
  /** Optional override per day of week, index 0 is Sunday. null means use wd or we. */
  dow: (number | null)[];
}

export interface DayRec {
  /** Minutes set for this one day, per section */
  min?: Partial<Record<SectionId, number>>;
  /** Finished blocks, keyed "section:block", value is minutes spent */
  done?: Record<string, number>;
  /** Minutes measured with the focus timer, keyed like done. Used as the block's time when it is ticked. */
  spent?: Record<string, number>;
  /** The core task of this day was caught up later */
  carried?: Partial<Record<SectionId, 1>>;
  /** The catch-up for this day was skipped */
  dismiss?: Partial<Record<SectionId, 1>>;
}

export interface Mock { id: string; d: string; sec: string; n: string; k: string; c: number; w: number }
export interface ErrorEntry { id: string; d: string; sec: string; t: string; trap: string; src: string; why: string; fix: string }
export interface Word { id: string; w: string; m: string; s: string; b: number; due: string }
export interface PracticeSet { id: string; d: string; sec: string; t: string; a: number; c: number; src: string }
/** One attempt at an in-app RC set. ans[i] is the chosen option index, or null when skipped. */
export interface RcAttempt { id: string; d: string; set: string; mode: "daily" | "library"; ans: (number | null)[]; c: number; w: number; secs: number; first: number }
/** One VA drill run. a is what the student entered for each item, pts the marks it earned. */
export interface VaAttempt { id: string; d: string; mode: "daily" | "custom"; items: { k: string; a: string; ok: boolean; pts: number }[]; secs: number }
/** One critical reasoning drill. a is the option index chosen for each item, or null when it was left blank. */
export interface CrAttempt { id: string; d: string; items: { k: string; a: number | null; ok: boolean }[]; secs: number }
/** One reading speed test. recall is the number of recall questions answered correctly, out of 2. */
export interface SpeedRun { id: string; d: string; set: string; words: number; secs: number; wpm: number; recall: number }
/**
 * One timed VARC sectional. qs holds the question keys in paper order ("rc:<set>:<question>" or a VA key such as "pj:bees"),
 * a the answer to each ("" for blank; an RC option index such as "2"; a VA answer as typed), t the seconds spent on each.
 * w counts only wrong answers that cost a mark (MCQs), so 3c - w is the score. updatedAt is for sync (docs/plan.md, 2D).
 */
export interface SectionalAttempt { id: string; d: string; qs: string[]; a: string[]; t: number[]; secs: number; c: number; w: number; updatedAt: number }
/**
 * A question in the redo queue. k is "rc:<set>:<question>", a VA item key such as "pj:bees", or a critical reasoning key such as "cr:CR-01".
 * box counts right answers in a row; cleared is the date it left the queue.
 */
export interface RedoItem { k: string; added: string; due: string; box: number; tries: number; last?: string; cleared?: string }
/**
 * One written summary. src "rc" is a summary of a set on this site (set and att name it); "article" is one of an outside
 * article from the Today reading block (from, title and url describe it). checks are the four self-checks in
 * practice/summary.ts, ticked or not; the score is how many are ticked. updatedAt is for sync (docs/plan.md, 2D).
 */
export interface SummaryEntry {
  id: string; d: string; src: "rc" | "article"; text: string; tone: string; checks: boolean[]; words: number; updatedAt: number;
  set?: string; att?: string; from?: string; title?: string; url?: string;
}

export interface AppState {
  version: 4;
  ticks: Record<string, 1>;
  settings: Record<SectionId, TimeSettings>;
  days: Record<string, DayRec>;
  since: string;
  mocks: Mock[];
  errors: ErrorEntry[];
  vocab: Word[];
  practice: PracticeSet[];
  rcAttempts: RcAttempt[];
  vaAttempts: VaAttempt[];
  crAttempts: CrAttempt[];
  speedRuns: SpeedRun[];
  redo: RedoItem[];
  sectionals: SectionalAttempt[];
  summaries: SummaryEntry[];
  /** False for saves from before the redo queue; RedoSeeder then builds the queue from past attempts. */
  redoSeeded: boolean;
  /** The percentile the student is aiming for in each section. Only VARC has percentile tables so far. */
  targets: { varc: number };
}

const emptyDow = () => [null, null, null, null, null, null, null] as (number | null)[];

export function blankState(): AppState {
  const settings = {} as Record<SectionId, TimeSettings>;
  SECTION_IDS.forEach((id) => (settings[id] = { ...DEFAULT_TIME[id], dow: emptyDow() }));
  return { version: 4, ticks: {}, settings, days: {}, since: todayIso(), mocks: [], errors: [], vocab: [], practice: [], rcAttempts: [], vaAttempts: [], crAttempts: [], speedRuns: [], redo: [], sectionals: [], summaries: [], redoSeeded: true, targets: { varc: DEFAULT_TARGET } };
}

type Obj = Record<string, unknown>;
const isObj = (o: unknown): o is Obj => !!o && typeof o === "object" && !Array.isArray(o);
const str = (x: unknown) => String(x == null ? "" : x);
const num = (x: unknown) => (isFinite(Number(x)) ? Number(x) : 0);
const mins = (x: unknown) => clamp(Math.round(num(x)), 0, 600);
const flags = (o: unknown) => {
  const out: Partial<Record<SectionId, 1>> = {};
  if (isObj(o)) SECTION_IDS.forEach((id) => { if (o[id]) out[id] = 1; });
  return out;
};
/** CAT's "para completion" questions are sentence insertion; older saves used the old name. */
const renamed = (t: string) => (t === "Para completion" ? "Sentence insertion" : t);
const list = <T,>(arr: unknown, f: (x: Obj) => T): T[] => (Array.isArray(arr) ? arr.filter(isObj).map(f) : []);

/** Turns anything read from storage or an imported backup into a valid state. Unknown fields are dropped. */
export function normalize(raw: unknown): AppState {
  const b = blankState();
  if (!isObj(raw)) return b;
  if (isObj(raw.ticks)) Object.keys(raw.ticks).forEach((k) => { if ((raw.ticks as Obj)[k]) b.ticks[k] = 1; });
  if (isObj(raw.settings)) {
    SECTION_IDS.forEach((id) => {
      const s = (raw.settings as Obj)[id];
      if (!isObj(s)) return;
      if (isFinite(Number(s.wd))) b.settings[id].wd = mins(s.wd);
      if (isFinite(Number(s.we))) b.settings[id].we = mins(s.we);
      if (Array.isArray(s.dow)) { const dw: unknown[] = s.dow; b.settings[id].dow = emptyDow().map((_, i) => (typeof dw[i] === "number" ? mins(dw[i]) : null)); }
    });
  }
  if (isObj(raw.days)) {
    Object.keys(raw.days).forEach((k) => {
      const v = (raw.days as Obj)[k];
      if (!isIsoDate(k) || !isObj(v)) return;
      const rec: DayRec = {};
      if (isObj(v.min)) {
        rec.min = {};
        SECTION_IDS.forEach((id) => { const m = (v.min as Obj)[id]; if (typeof m === "number") rec.min![id] = mins(m); });
      }
      if (isObj(v.done)) { rec.done = {}; Object.keys(v.done).forEach((bk) => (rec.done![bk] = num((v.done as Obj)[bk]))); }
      if (isObj(v.spent)) { rec.spent = {}; Object.keys(v.spent).forEach((bk) => (rec.spent![bk] = mins((v.spent as Obj)[bk]))); }
      if (v.carried) rec.carried = flags(v.carried);
      if (v.dismiss) rec.dismiss = flags(v.dismiss);
      b.days[k] = rec;
    });
  }
  if (isIsoDate(raw.since)) b.since = raw.since;
  b.mocks = list(raw.mocks, (x) => ({ id: str(x.id), d: str(x.d), sec: str(x.sec) || "VARC", n: str(x.n), k: str(x.k), c: num(x.c), w: num(x.w) }));
  b.errors = list(raw.errors, (x) => ({ id: str(x.id), d: str(x.d), sec: str(x.sec) || "VARC", t: str(x.t), trap: str(x.trap), src: str(x.src), why: str(x.why), fix: str(x.fix) }));
  b.vocab = list(raw.vocab, (x) => ({ id: str(x.id), w: str(x.w), m: str(x.m), s: str(x.s), b: clamp(num(x.b), 0, 5), due: str(x.due) }));
  b.practice = list(raw.practice, (x) => ({ id: str(x.id), d: str(x.d), sec: str(x.sec) || "VARC", t: renamed(str(x.t)), a: num(x.a), c: num(x.c), src: str(x.src) }));
  b.errors.forEach((e) => (e.t = renamed(e.t)));
  b.rcAttempts = list(raw.rcAttempts, (x) => ({
    id: str(x.id), d: str(x.d), set: str(x.set), mode: x.mode === "daily" ? "daily" : "library",
    ans: Array.isArray(x.ans) ? x.ans.map((a: unknown) => (typeof a === "number" ? a : null)) : [],
    c: num(x.c), w: num(x.w), secs: num(x.secs), first: num(x.first),
  }));
  b.vaAttempts = list(raw.vaAttempts, (x) => ({
    id: str(x.id), d: str(x.d), mode: x.mode === "daily" ? "daily" : "custom", secs: num(x.secs),
    items: list(x.items, (i) => ({ k: str(i.k), a: str(i.a), ok: !!i.ok, pts: num(i.pts) })),
  }));
  b.crAttempts = list(raw.crAttempts, (x) => ({
    id: str(x.id), d: str(x.d), secs: num(x.secs),
    items: list(x.items, (i) => ({ k: str(i.k), a: typeof i.a === "number" ? i.a : null, ok: !!i.ok })),
  }));
  b.speedRuns = list(raw.speedRuns, (x) => ({ id: str(x.id), d: str(x.d), set: str(x.set), words: num(x.words), secs: num(x.secs), wpm: num(x.wpm), recall: clamp(num(x.recall), 0, 2) }));
  b.sectionals = list(raw.sectionals, (x) => ({
    id: str(x.id), d: str(x.d), secs: num(x.secs), c: num(x.c), w: num(x.w), updatedAt: num(x.updatedAt),
    qs: Array.isArray(x.qs) ? x.qs.map(str) : [], a: Array.isArray(x.a) ? x.a.map(str) : [], t: Array.isArray(x.t) ? x.t.map(num) : [],
  })).filter((x) => x.id && x.qs.length && x.a.length === x.qs.length);
  b.summaries = list(raw.summaries, (x) => {
    const e: SummaryEntry = {
      id: str(x.id), d: str(x.d), src: x.src === "article" ? "article" : "rc", text: str(x.text), tone: str(x.tone),
      checks: [0, 1, 2, 3].map((i) => Array.isArray(x.checks) && x.checks[i] === true), words: num(x.words), updatedAt: num(x.updatedAt),
    };
    (["set", "att", "from", "title", "url"] as const).forEach((k) => { const v = x[k]; if (typeof v === "string" && v) e[k] = v; });
    return e;
  }).filter((e) => e.id && e.text.trim() && isIsoDate(e.d));
  if (Array.isArray(raw.redo)) {
    b.redo = list(raw.redo, (x) => {
      const r: RedoItem = { k: str(x.k), added: str(x.added), due: str(x.due), box: clamp(num(x.box), 0, 9), tries: num(x.tries) };
      if (isIsoDate(x.last)) r.last = x.last;
      if (isIsoDate(x.cleared)) r.cleared = x.cleared;
      return r;
    }).filter((r) => r.k && isIsoDate(r.due));
  }
  if (isObj(raw.targets) && (TARGET_CHOICES as readonly number[]).includes(Number(raw.targets.varc))) b.targets.varc = Number(raw.targets.varc);
  // Saves from before the redo queue have none; it is built from their attempts once the content loads.
  b.redoSeeded = Array.isArray(raw.redo) && raw.redoSeeded !== false;
  return b;
}

export const STORAGE_KEY = "cat-prep-hub-v3";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return blankState();
}
export function saveState(s: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
