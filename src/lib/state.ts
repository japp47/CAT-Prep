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
/**
 * One logged mistake. trap is what the wrong option did (from the content); cause is what happened to the student
 * (types below, picked by the student or pre-filled from data). trapWas and causeWas keep the first values when corrected.
 */
/**
 * One Error log entry. Entries made from practice also name the question (q: its redo key, "rc:<set>:<i>", a VA key
 * such as "pj:bees" or "cr:CR-01") and the attempt it was missed in (att: an RC, VA or CR attempt id), so the log can
 * open the question again (docs/feature.md F52). Older entries have neither; practice/errorlink.ts matches them.
 */
export interface ErrorEntry { id: string; d: string; sec: string; t: string; trap: string; src: string; why: string; fix: string; cause?: Cause; trapWas?: string; causeWas?: Cause; q?: string; att?: string }
export interface Word { id: string; w: string; m: string; s: string; b: number; due: string }
export interface PracticeSet { id: string; d: string; sec: string; t: string; a: number; c: number; src: string }
/**
 * One attempt at an in-app RC set. ans[i] is the chosen option index, or null when skipped.
 * v is the set's content version when it was taken (practice/types.ts, contentHash); unsure lists the questions marked "Not sure",
 * lucky those of them answered right.
 */
export interface RcAttempt { id: string; d: string; set: string; mode: "daily" | "library"; ans: (number | null)[]; c: number; w: number; secs: number; first: number; v?: string; unsure?: number[]; lucky?: number[] }
/** One VA drill run. a is what the student entered for each item, pts the marks it earned; v and unsure as for RC, per item. */
export interface VaAttempt { id: string; d: string; mode: "daily" | "custom"; items: { k: string; a: string; ok: boolean; pts: number; v?: string; unsure?: true }[]; secs: number }
/** One critical reasoning drill. a is the option index chosen for each item, or null when it was left blank. */
export interface CrAttempt { id: string; d: string; items: { k: string; a: number | null; ok: boolean; v?: string; unsure?: true }[]; secs: number }
/**
 * One attempt at a logical reasoning set (F23). ans[i] is the chosen option (MCQ) or the typed answer (TITA), null when
 * blank. c counts right answers and w wrong MCQs only (TITA has no negative marking), so 3c - w is the score. pm is the
 * post-mortem (F86), written after the review opens; that is why this kind syncs by updatedAt instead of write-once.
 */
export interface LrAttempt { id: string; d: string; set: string; ans: (number | string | null)[]; c: number; w: number; secs: number; updatedAt: number; v?: string; unsure?: number[]; pm?: LrPostMortem }
/** Where the time went in an LR set, and the slip that cost an answer (F86). */
export const LR_TIME_SINKS = ["reading", "drawing", "cases", "calculation", "stuck"] as const;
export const LR_SLIPS = ["misread", "missed-case", "assumption", "calculation", "none"] as const;
export type LrTimeSink = (typeof LR_TIME_SINKS)[number];
export type LrSlip = (typeof LR_SLIPS)[number];
/** The set post-mortem (F86): the clue that opened the set, where the time went, and the slip with its clue. Each part is optional. */
export interface LrPostMortem { key?: number; time?: LrTimeSink; slip?: LrSlip; slipClue?: number }
/** One reading speed test. recall is the number of recall questions answered correctly, out of 2. */
export interface SpeedRun { id: string; d: string; set: string; words: number; secs: number; wpm: number; recall: number }
/**
 * One timed VARC sectional. qs holds the question keys in paper order ("rc:<set>:<question>" or a VA key such as "pj:bees"),
 * a the answer to each ("" for blank; an RC option index such as "2"; a VA answer as typed), t the seconds spent on each.
 * w counts only wrong answers that cost a mark (MCQs), so 3c - w is the score. updatedAt is for sync (docs/plan.md, 2D).
 */
export interface SectionalAttempt { id: string; d: string; qs: string[]; a: string[]; t: number[]; secs: number; c: number; w: number; updatedAt: number; v?: string[] }
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

/** What happened to the student on a question they got wrong. Labels are in data/traps.ts (CAUSES). */
export type Cause = "misread" | "qualifier" | "beyond" | "trap" | "method" | "slip" | "guess" | "select" | "time";
export const CAUSE_IDS: Cause[] = ["misread", "qualifier", "beyond", "trap", "method", "slip", "guess", "select", "time"];
/**
 * One question of a reviewed mock. type is "rc" or a VA kind ("ps", "si", "oso", "pj").
 * Right answers can be slow; wrong ones carry a cause; skipped or unreached ones say whether they were doable (could),
 * and, for doable ones re-tried untimed after the mock, whether they were solved.
 */
export interface MockQ { st: "right" | "wrong" | "skip" | "unseen"; type: string; slow?: boolean; cause?: Cause; could?: boolean; solved?: boolean; secs?: number }
/**
 * A guided review of one mock or sectional (docs/feature.md, F12). mock is the Mock row it explains; att the sectional
 * when it came from this site. layout gives the questions per RC passage, then the VA questions by kind, in grid order.
 * recs are the recommendations kept at the end.
 */
export interface MockReview {
  id: string; d: string; updatedAt: number; mock: string; sec: string; from: "manual" | "sectional"; att?: string; name: string;
  layout: { rc: number[]; va: string[] }; planned?: number; qs: MockQ[]; recs: string[];
}
/**
 * A suggestion made to the student, with its evidence, kept so we can later tell whether it helped (F43).
 * skill names what it targets; before and after are right answers out of attempted on that skill.
 */
export interface Recommendation {
  id: string; d: string; updatedAt: number; from: "mock" | "week" | "next"; src?: string; sec: string;
  skill: { kind: "type" | "cause" | "pace" | "skips" | "redo"; key: string }; text: string; why: string; to?: string;
  status: "open" | "done" | "dismissed"; before?: { c: number; n: number }; after?: { c: number; n: number; d: string };
}

/**
 * One weekly review (F13). id is the Monday of the week reviewed. focus is the recommendation chosen for the next week,
 * or absent for "no focus"; days are the dates in that next week the focus was done (it asks for three).
 * closed means the review card was dismissed or the review saved; skipped, that it was dismissed with "Not now".
 */
export interface WeekReview { id: string; d: string; updatedAt: number; focus?: string; light?: boolean; note?: string; days: string[]; closed: boolean; skipped?: boolean }

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
  lrAttempts: LrAttempt[];
  speedRuns: SpeedRun[];
  redo: RedoItem[];
  sectionals: SectionalAttempt[];
  summaries: SummaryEntry[];
  mockReviews: MockReview[];
  recs: Recommendation[];
  weekReviews: WeekReview[];
  /** False for saves from before the redo queue; RedoSeeder then builds the queue from past attempts. */
  redoSeeded: boolean;
  /** The percentile the student is aiming for in each section. Only VARC has percentile tables so far. */
  targets: { varc: number };
  /** About the student, from the You page (F81): unset until they answer. */
  about: About;
}

/** First CAT or taken before; studying or working. Each is absent until the student picks it. */
export interface About { attempt?: "first" | "repeat"; work?: "studying" | "working" }
export const ATTEMPTS = ["first", "repeat"] as const;
export const WORKS = ["studying", "working"] as const;

const emptyDow = () => [null, null, null, null, null, null, null] as (number | null)[];

export function blankState(): AppState {
  const settings = {} as Record<SectionId, TimeSettings>;
  SECTION_IDS.forEach((id) => (settings[id] = { ...DEFAULT_TIME[id], dow: emptyDow() }));
  return { version: 4, ticks: {}, settings, days: {}, since: todayIso(), mocks: [], errors: [], vocab: [], practice: [], rcAttempts: [], vaAttempts: [], crAttempts: [], lrAttempts: [], speedRuns: [], redo: [], sectionals: [], summaries: [], mockReviews: [], recs: [], weekReviews: [], redoSeeded: true, targets: { varc: DEFAULT_TARGET }, about: {} };
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
/** The optional per-item fields of VA and CR attempts: the content version and the "Not sure" flag. */
const extra = (i: Obj) => ({ ...(typeof i.v === "string" && i.v ? { v: i.v } : {}), ...(i.unsure === true ? { unsure: true as const } : {}) });

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
  b.errors = list(raw.errors, (x) => {
    const e: ErrorEntry = { id: str(x.id), d: str(x.d), sec: str(x.sec) || "VARC", t: str(x.t), trap: str(x.trap), src: str(x.src), why: str(x.why), fix: str(x.fix) };
    if ((CAUSE_IDS as unknown[]).includes(x.cause)) e.cause = x.cause as Cause;
    if ((CAUSE_IDS as unknown[]).includes(x.causeWas)) e.causeWas = x.causeWas as Cause;
    if (typeof x.q === "string" && x.q && x.q.length <= 200) e.q = x.q;
    if (typeof x.att === "string" && x.att && x.att.length <= 100) e.att = x.att;
    if (typeof x.trapWas === "string") e.trapWas = x.trapWas;
    return e;
  });
  b.vocab = list(raw.vocab, (x) => ({ id: str(x.id), w: str(x.w), m: str(x.m), s: str(x.s), b: clamp(num(x.b), 0, 5), due: str(x.due) }));
  b.practice = list(raw.practice, (x) => ({ id: str(x.id), d: str(x.d), sec: str(x.sec) || "VARC", t: renamed(str(x.t)), a: num(x.a), c: num(x.c), src: str(x.src) }));
  b.errors.forEach((e) => (e.t = renamed(e.t)));
  b.rcAttempts = list(raw.rcAttempts, (x) => ({
    id: str(x.id), d: str(x.d), set: str(x.set), mode: x.mode === "daily" ? "daily" : "library",
    ans: Array.isArray(x.ans) ? x.ans.map((a: unknown) => (typeof a === "number" ? a : null)) : [],
    c: num(x.c), w: num(x.w), secs: num(x.secs), first: num(x.first),
    ...(typeof x.v === "string" && x.v ? { v: x.v } : {}),
    ...(Array.isArray(x.unsure) ? { unsure: x.unsure.filter((n: unknown) => Number.isInteger(n)) as number[] } : {}),
    ...(Array.isArray(x.lucky) ? { lucky: x.lucky.filter((n: unknown) => Number.isInteger(n)) as number[] } : {}),
  }));
  b.vaAttempts = list(raw.vaAttempts, (x) => ({
    id: str(x.id), d: str(x.d), mode: x.mode === "daily" ? "daily" : "custom", secs: num(x.secs),
    items: list(x.items, (i) => ({ k: str(i.k), a: str(i.a), ok: !!i.ok, pts: num(i.pts), ...extra(i) })),
  }));
  b.crAttempts = list(raw.crAttempts, (x) => ({
    id: str(x.id), d: str(x.d), secs: num(x.secs),
    items: list(x.items, (i) => ({ k: str(i.k), a: typeof i.a === "number" ? i.a : null, ok: !!i.ok, ...extra(i) })),
  }));
  b.lrAttempts = list(raw.lrAttempts, (x) => {
    const a: LrAttempt = {
      id: str(x.id), d: str(x.d), set: str(x.set), c: num(x.c), w: num(x.w), secs: num(x.secs), updatedAt: num(x.updatedAt),
      ans: Array.isArray(x.ans) ? x.ans.map((v: unknown) => (typeof v === "number" || typeof v === "string" ? v : null)) : [],
    };
    if (typeof x.v === "string" && x.v) a.v = x.v;
    if (Array.isArray(x.unsure)) a.unsure = x.unsure.filter((n: unknown) => Number.isInteger(n)) as number[];
    if (isObj(x.pm)) {
      const p = x.pm, pm: LrPostMortem = {};
      if (Number.isInteger(p.key) && (p.key as number) > 0) pm.key = p.key as number;
      if ((LR_TIME_SINKS as readonly unknown[]).includes(p.time)) pm.time = p.time as LrTimeSink;
      if ((LR_SLIPS as readonly unknown[]).includes(p.slip)) pm.slip = p.slip as LrSlip;
      if (Number.isInteger(p.slipClue) && (p.slipClue as number) > 0) pm.slipClue = p.slipClue as number;
      a.pm = pm;
    }
    return a;
  }).filter((a) => a.id && a.set);
  b.speedRuns = list(raw.speedRuns, (x) => ({ id: str(x.id), d: str(x.d), set: str(x.set), words: num(x.words), secs: num(x.secs), wpm: num(x.wpm), recall: clamp(num(x.recall), 0, 2) }));
  b.sectionals = list(raw.sectionals, (x) => ({
    id: str(x.id), d: str(x.d), secs: num(x.secs), c: num(x.c), w: num(x.w), updatedAt: num(x.updatedAt),
    qs: Array.isArray(x.qs) ? x.qs.map(str) : [], a: Array.isArray(x.a) ? x.a.map(str) : [], t: Array.isArray(x.t) ? x.t.map(num) : [],
    ...(Array.isArray(x.v) ? { v: x.v.map(str) } : {}),
  })).filter((x) => x.id && x.qs.length && x.a.length === x.qs.length);
  b.summaries = list(raw.summaries, (x) => {
    const e: SummaryEntry = {
      id: str(x.id), d: str(x.d), src: x.src === "article" ? "article" : "rc", text: str(x.text), tone: str(x.tone),
      checks: [0, 1, 2, 3].map((i) => Array.isArray(x.checks) && x.checks[i] === true), words: num(x.words), updatedAt: num(x.updatedAt),
    };
    (["set", "att", "from", "title", "url"] as const).forEach((k) => { const v = x[k]; if (typeof v === "string" && v) e[k] = v; });
    return e;
  }).filter((e) => e.id && e.text.trim() && isIsoDate(e.d));
  b.mockReviews = list(raw.mockReviews, (x) => {
    const layout = isObj(x.layout) ? x.layout : {};
    const r: MockReview = {
      id: str(x.id), d: str(x.d), updatedAt: num(x.updatedAt), mock: str(x.mock), sec: str(x.sec) || "VARC",
      from: x.from === "sectional" ? "sectional" : "manual", name: str(x.name),
      layout: { rc: Array.isArray(layout.rc) ? layout.rc.map((n: unknown) => clamp(Math.round(num(n)), 1, 10)) : [], va: Array.isArray(layout.va) ? layout.va.map(str) : [] },
      qs: list(x.qs, (q) => {
        const o: MockQ = { st: q.st === "wrong" || q.st === "skip" || q.st === "unseen" ? q.st : "right", type: str(q.type) };
        if (q.slow === true) o.slow = true;
        if ((CAUSE_IDS as unknown[]).includes(q.cause)) o.cause = q.cause as Cause;
        if (typeof q.could === "boolean") o.could = q.could;
        if (typeof q.solved === "boolean") o.solved = q.solved;
        if (isFinite(Number(q.secs)) && q.secs != null) o.secs = num(q.secs);
        return o;
      }),
      recs: Array.isArray(x.recs) ? x.recs.map(str) : [],
    };
    if (typeof x.att === "string" && x.att) r.att = x.att;
    if (isFinite(Number(x.planned)) && x.planned != null) r.planned = Math.round(num(x.planned));
    return r;
  }).filter((r) => r.id && isIsoDate(r.d) && r.qs.length);
  const KINDS = ["type", "cause", "pace", "skips", "redo"] as const;
  b.recs = list(raw.recs, (x) => {
    const sk = isObj(x.skill) ? x.skill : {};
    const r: Recommendation = {
      id: str(x.id), d: str(x.d), updatedAt: num(x.updatedAt), from: x.from === "week" || x.from === "next" ? x.from : "mock", sec: str(x.sec) || "VARC",
      skill: { kind: (KINDS as readonly unknown[]).includes(sk.kind) ? (sk.kind as Recommendation["skill"]["kind"]) : "type", key: str(sk.key) },
      text: str(x.text), why: str(x.why), status: x.status === "done" || x.status === "dismissed" ? x.status : "open",
    };
    if (typeof x.src === "string" && x.src) r.src = x.src;
    if (typeof x.to === "string" && x.to.startsWith("/")) r.to = x.to;
    const cn = (o: unknown) => (isObj(o) ? { c: num(o.c), n: num(o.n) } : undefined);
    if (cn(x.before)) r.before = cn(x.before);
    if (isObj(x.after) && isIsoDate(x.after.d)) r.after = { ...cn(x.after)!, d: x.after.d };
    return r;
  }).filter((r) => r.id && isIsoDate(r.d) && r.text.trim());
  b.weekReviews = list(raw.weekReviews, (x) => {
    const r: WeekReview = { id: str(x.id), d: str(x.d), updatedAt: num(x.updatedAt), days: Array.isArray(x.days) ? x.days.filter(isIsoDate) : [], closed: x.closed !== false };
    if (typeof x.focus === "string" && x.focus) r.focus = x.focus;
    if (x.light === true) r.light = true;
    if (x.skipped === true) r.skipped = true;
    if (typeof x.note === "string" && x.note.trim()) r.note = x.note.slice(0, 300);
    return r;
  }).filter((r) => isIsoDate(r.id) && isIsoDate(r.d));
  if (Array.isArray(raw.redo)) {
    b.redo = list(raw.redo, (x) => {
      const r: RedoItem = { k: str(x.k), added: str(x.added), due: str(x.due), box: clamp(num(x.box), 0, 9), tries: num(x.tries) };
      if (isIsoDate(x.last)) r.last = x.last;
      if (isIsoDate(x.cleared)) r.cleared = x.cleared;
      return r;
    }).filter((r) => r.k && isIsoDate(r.due));
  }
  if (isObj(raw.targets) && (TARGET_CHOICES as readonly number[]).includes(Number(raw.targets.varc))) b.targets.varc = Number(raw.targets.varc);
  if (isObj(raw.about)) {
    const { attempt, work } = raw.about;
    if ((ATTEMPTS as readonly unknown[]).includes(attempt)) b.about.attempt = attempt as About["attempt"];
    if ((WORKS as readonly unknown[]).includes(work)) b.about.work = work as About["work"];
  }
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
