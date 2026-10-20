import type { AppState } from "../lib/state";
import { RC_CATALOG, VA_CATALOG } from "./catalog.gen";
import type { Content } from "./content";
import { queueMiss, rcRedoKey, resolveExam, type ExamRef } from "./redo";
import { shuffle } from "./random";
import { rcVersion, vaVersion, type RcMeta } from "./types";
import { DAILY_MIX, scoreItem, VA_KIND, VA_KINDS } from "./va/build";

/** CAT's VARC section: 4 passages of 4 questions, then 8 VA questions, in 40 minutes. */
export const SECTIONAL_SECS = 40 * 60;
export const SECTIONAL_RC = 4;
/** Library sets may carry a fifth question for extra practice; the sectional keeps CAT's 4 by taking the first four. */
export const SECTIONAL_RC_QS = 4;
export const SECTIONAL_SRC = "VARC sectional";
/** Where a sectional in progress is kept, so a reload or a closed tab does not lose it. */
export const DRAFT_KEY = "cat-prep-sectional";

/** Keys of questions the student has already met anywhere in Practice. */
function seenKeys(st: AppState) {
  const sets = new Set(st.rcAttempts.map((a) => a.set));
  const va = new Set(st.vaAttempts.flatMap((a) => a.items.map((i) => i.k.split(":")[1])));
  st.sectionals.forEach((s) => s.qs.forEach((k) => {
    const [kind, id] = k.split(":");
    (kind === "rc" ? sets : va).add(id);
  }));
  st.redo.forEach((r) => { const [kind, id] = r.k.split(":"); if (kind !== "rc") va.add(id); });
  return { sets, va };
}

/**
 * Picks a paper: 4 RC sets and 8 VA questions (2 of each type, on 8 different paragraphs).
 * Unseen material comes first. Among RC sets it aims for one easy, two medium and one hard, in different genres.
 */
export function buildPaper(st: AppState, seed: string): string[] {
  const seen = seenKeys(st);
  const fresh = <T,>(xs: T[], isSeen: (x: T) => boolean) => [...xs.filter((x) => !isSeen(x)), ...xs.filter(isSeen)];

  const pool = fresh(shuffle(RC_CATALOG, seed + ":rc"), (s) => seen.sets.has(s.id));
  const want: RcMeta["difficulty"][] = ["easy", "medium", "medium", "hard"];
  const rc: RcMeta[] = [];
  for (const level of want) {
    const pick = pool.find((s) => !rc.includes(s) && s.difficulty === level && !rc.some((r) => r.genre === s.genre))
      ?? pool.find((s) => !rc.includes(s) && s.difficulty === level)
      ?? pool.find((s) => !rc.includes(s));
    if (pick) rc.push(pick);
  }

  const paras = fresh(shuffle(VA_CATALOG, seed + ":va"), (p) => seen.va.has(p.id)).slice(0, DAILY_MIX.length);
  const va = DAILY_MIX.map((kind, i) => kind + ":" + paras[i].id);

  return [...rc.flatMap((s) => Array.from({ length: Math.min(s.questions, SECTIONAL_RC_QS) }, (_, qi) => rcRedoKey(s.id, qi))), ...va];
}

/** One scored question. i is its position in the paper, so it still lines up with the times if a question was removed. */
export interface Scored { i: number; ref: ExamRef; ok: boolean; blank: boolean; pts: number; type: string }

/** Scores one answer. RC answers are stored as the option index ("0" to "3"). */
export function scoreOne(ref: ExamRef, a: string, i = 0): Scored {
  if (ref.kind === "rc") {
    const blank = a === "";
    const ok = !blank && Number(a) === ref.set.questions[ref.qi].answer;
    return { i, ref, ok, blank, pts: blank ? 0 : ok ? 3 : -1, type: "RC" };
  }
  const s = scoreItem(ref.item, a);
  return { i, ref, ok: s.ok, blank: s.blank, pts: s.pts, type: VA_KIND[ref.item.kind].practice };
}

/** Scores every question that still exists in the library. */
export function scorePaper(qs: string[], a: string[], c: Content): Scored[] {
  return qs.flatMap((k, i) => { const ref = resolveExam(k, c); return ref ? [scoreOne(ref, a[i] ?? "", i)] : []; });
}

export const marksOf = (rows: Scored[]) => rows.reduce((s, r) => s + r.pts, 0);

/** Rows per question type, in exam order, for the score breakdown. */
export function byType(rows: Scored[], t: number[]) {
  const order = ["RC", ...VA_KINDS.map((k) => VA_KIND[k].practice)];
  return order.map((type) => {
    const rs = rows.filter((r) => r.type === type);
    return {
      type, n: rs.length,
      attempted: rs.filter((r) => !r.blank).length,
      correct: rs.filter((r) => r.ok).length,
      marks: marksOf(rs),
      secs: rs.reduce((s, r) => s + (t[r.i] ?? 0), 0),
    };
  }).filter((x) => x.n > 0);
}

/**
 * Saves a finished sectional. It also logs one practice row per question type, puts every wrong or blank
 * question in the redo queue, and adds the score to the mock chart in Progress as a "Sectional".
 */
export function recordSectional(st: AppState, id: string, qs: string[], a: string[], t: number[], secs: number, d: string, c: Content, now: number): void {
  const rows = scorePaper(qs, a, c);
  const correct = rows.filter((r) => r.ok).length;
  const penalised = rows.filter((r) => r.pts < 0).length;
  const v = qs.map((k) => { const ref = resolveExam(k, c); return !ref ? "" : ref.kind === "rc" ? rcVersion(ref.set) : vaVersion(ref.item.para); });
  st.sectionals.push({ id, d, qs, a, t: t.map(Math.round), secs: Math.round(secs), c: correct, w: penalised, updatedAt: now, v });
  byType(rows, t).forEach((x) => { if (x.attempted) st.practice.push({ id: id + x.type, d, sec: "VARC", t: x.type, a: x.attempted, c: x.correct, src: SECTIONAL_SRC }); });
  rows.forEach((r) => { if (!r.ok) queueMiss(st, r.ref.kind === "rc" ? rcRedoKey(r.ref.set.id, r.ref.qi) : r.ref.item.key, d); });
  st.mocks.push({ id: id + "m", d, sec: "VARC", n: "VARC sectional on this site", k: "Sectional", c: correct, w: penalised });
}

/** A sectional in progress. The clock runs from startedAt, so time away from the page still counts. */
export interface Draft { id: string; qs: string[]; a: string[]; t: number[]; marked: boolean[]; seen: boolean[]; cur: number; startedAt: number }

export function newDraft(id: string, qs: string[], now: number): Draft {
  const n = qs.length;
  return { id, qs, a: Array(n).fill(""), t: Array(n).fill(0), marked: Array(n).fill(false), seen: Array(n).fill(false).map((_, i) => i === 0), cur: 0, startedAt: now };
}

export const secsLeft = (d: Draft, now: number) => Math.max(0, SECTIONAL_SECS - Math.floor((now - d.startedAt) / 1000));

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    const n = d.qs?.length;
    return n && [d.a, d.t, d.marked, d.seen].every((x) => Array.isArray(x) && x.length === n) && typeof d.startedAt === "number" ? d : null;
  } catch {
    return null;
  }
}
export function saveDraft(d: Draft | null): void {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage blocked: the sectional still works, it just will not survive a reload */
  }
}

/** Palette state of one question, as the CAT screen shows it. */
export type QStatus = "unseen" | "open" | "done" | "marked" | "doneMarked";
export function qStatus(d: Draft, i: number): QStatus {
  const has = d.a[i] !== "";
  if (d.marked[i]) return has ? "doneMarked" : "marked";
  return has ? "done" : d.seen[i] ? "open" : "unseen";
}
