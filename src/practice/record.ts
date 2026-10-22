import { uid } from "../lib/date";
import type { AppState, ErrorEntry, RcAttempt, VaAttempt } from "../lib/state";
import { crRedoKey, queueMiss, rcRedoKey } from "./redo";
import { contentHash, CR_TYPE, RC_QTYPE, rcVersion, vaVersion, type CrItem, type RcSet } from "./types";
import { answerLabel, scoreItem, sumAt, VA_KIND, VA_KINDS, type VaItem } from "./va/build";

export const LETTERS = ["A", "B", "C", "D", "E"];

export function scoreRc(set: RcSet, ans: (number | null)[]) {
  let c = 0, w = 0;
  set.questions.forEach((q, i) => { if (ans[i] == null) return; if (ans[i] === q.answer) c++; else w++; });
  return { c, w, skipped: set.questions.length - c - w, marks: 3 * c - w };
}

/**
 * Saves an RC attempt and logs it as a practice set so Progress picks it up.
 * Wrong and skipped questions go into the redo queue.
 * The caller makes the id, because a state updater may run more than once.
 */
export function recordRc(st: AppState, id: string, set: RcSet, ans: (number | null)[], secs: number, first: number, mode: RcAttempt["mode"], d: string, unsure: number[] = []): void {
  const { c, w } = scoreRc(set, ans);
  const a: RcAttempt = { id, d, set: set.id, mode, ans, c, w, secs: Math.round(secs), first: Math.round(first), v: rcVersion(set) };
  if (unsure.length) {
    a.unsure = [...unsure].sort((x, y) => x - y);
    const lucky = a.unsure.filter((qi) => ans[qi] === set.questions[qi].answer);
    if (lucky.length) a.lucky = lucky;
  }
  st.rcAttempts.push(a);
  if (c + w > 0) st.practice.push({ id: id + "p", d, sec: "VARC", t: "RC", a: c + w, c, src: "Practice: " + set.title });
  // A right answer marked "Not sure" was a lucky guess: it comes back once, like a miss (docs/research/step-2g.md).
  set.questions.forEach((q, qi) => { if (ans[qi] !== q.answer || unsure.includes(qi)) queueMiss(st, rcRedoKey(set.id, qi), d); });
}

/** Saves a VA run and logs one practice set per question type. Wrong and blank items go into the redo queue. */
export function recordVa(st: AppState, id: string, items: VaItem[], answers: string[], secs: number, mode: VaAttempt["mode"], d: string, unsure: boolean[] = []): void {
  const rows = items.map((it, i) => { const s = scoreItem(it, answers[i] ?? ""); return { k: it.key, a: answers[i] ?? "", ok: s.ok, pts: s.pts, blank: s.blank, kind: it.kind, v: vaVersion(it.para), unsure: !!unsure[i] }; });
  st.vaAttempts.push({ id, d, mode, secs: Math.round(secs), items: rows.map(({ k, a, ok, pts, v, unsure: u }) => ({ k, a, ok, pts, v, ...(u ? { unsure: true as const } : {}) })) });
  rows.forEach((r) => { if (!r.ok || r.unsure) queueMiss(st, r.k, d); });
  VA_KINDS.forEach((kind) => {
    const done = rows.filter((r) => r.kind === kind && !r.blank);
    if (done.length) st.practice.push({ id: id + kind, d, sec: "VARC", t: VA_KIND[kind].practice, a: done.length, c: done.filter((r) => r.ok).length, src: mode === "daily" ? "Daily VA drill" : "Custom VA drill" });
  });
}

/** The marks a critical reasoning drill is worth, one right answer to one mark. Each is an MCQ with no negative marking here, because XAT's penalty is small. */
export const scoreCr = (item: CrItem, a: number | null) => ({ blank: a === null, ok: a === item.answer });

/** Saves a critical reasoning drill and logs it as one practice set. Wrong and blank questions go into the redo queue. */
export function recordCr(st: AppState, id: string, items: CrItem[], answers: (number | null)[], secs: number, d: string, unsure: boolean[] = []): void {
  const rows = items.map((it, i) => { const a = answers[i] ?? null; return { k: crRedoKey(it.id), a, ok: scoreCr(it, a).ok, v: contentHash(it), ...(unsure[i] ? { unsure: true as const } : {}) }; });
  st.crAttempts.push({ id, d, secs: Math.round(secs), items: rows });
  rows.forEach((r) => { if (!r.ok || r.unsure) queueMiss(st, r.k, d); });
  const done = rows.filter((r) => r.a !== null);
  if (done.length) st.practice.push({ id: id + "cr", d, sec: "VARC", t: "Critical reasoning", a: done.length, c: done.filter((r) => r.ok).length, src: "Critical reasoning drill" });
}

/** Logs one redo-queue answer, adding it to that day's redo row for the question type. */
export function recordRedoAnswer(st: AppState, t: string, ok: boolean, d: string): void {
  const row = st.practice.find((p) => p.d === d && p.t === t && p.src === REDO_SRC);
  if (row) { row.a++; if (ok) row.c++; return; }
  st.practice.push({ id: uid(), d, sec: "VARC", t, a: 1, c: ok ? 1 : 0, src: REDO_SRC });
}
export const REDO_SRC = "Redo queue";

export const rcErrorSrc = (set: RcSet, qi: number) => `${set.title}, Q${qi + 1} (Practice)`;

/** A pre-filled Error log entry for a wrong or skipped RC question. A question marked "Not sure" starts with the cause "guessed". */
export function rcError(set: RcSet, qi: number, chosen: number | null, d: string, unsure = false, att?: string): ErrorEntry {
  const q = set.questions[qi], right = q.options[q.answer];
  const picked = chosen == null ? null : q.options[chosen];
  return {
    id: uid(), d, sec: "VARC", t: RC_QTYPE[q.type].error, trap: picked?.trap ?? "", ...(unsure ? { cause: "guess" as const } : {}),
    src: rcErrorSrc(set, qi), q: rcRedoKey(set.id, qi), ...(att ? { att } : {}),
    why: picked ? `Chose ${LETTERS[chosen!]}: ${picked.t} ${picked.why}` : "Skipped this question.",
    fix: `Answer ${LETTERS[q.answer]}: ${right.t} ${right.why}`,
  };
}

export const vaErrorSrc = (item: VaItem) => `${VA_KIND[item.kind].label}: ${item.para.topic} (Practice)`;

export function vaError(item: VaItem, typed: string, d: string, att?: string): ErrorEntry {
  return { ...vaErrorBody(item, typed, d), q: item.key, ...(att ? { att } : {}) };
}

function vaErrorBody(item: VaItem, typed: string, d: string): ErrorEntry {
  const p = item.para;
  if (item.kind === "ps") {
    const picked = typed ? sumAt(item, +typed - 1) : undefined, right = sumAt(item, +item.answer - 1);
    return {
      id: uid(), d, sec: "VARC", t: VA_KIND.ps.label, trap: picked?.trap ?? "", src: vaErrorSrc(item),
      why: picked ? `Chose ${answerLabel(item, typed)}: ${picked.t} ${picked.why}` : "Left it blank.",
      fix: `Answer ${answerLabel(item, item.answer)}: ${right.t} ${right.why}`,
    };
  }
  const fix = item.kind === "pj" ? `Order ${item.answer}. ` + p.cues.join(" ") : item.kind === "oso" ? `Odd sentence: ${item.answer}. ${p.oddWhy}` : `Gap ${item.answer}. ${p.insWhy}`;
  return { id: uid(), d, sec: "VARC", t: VA_KIND[item.kind].label, trap: "", src: vaErrorSrc(item), why: typed ? `Typed ${typed}.` : "Left it blank.", fix };
}

export const crErrorSrc = (item: CrItem) => `Critical reasoning ${item.id}: ${item.topic}, ${CR_TYPE[item.type].label.toLowerCase()} (Practice)`;

/** A pre-filled Error log entry for a wrong or blank critical reasoning question. */
export function crError(item: CrItem, chosen: number | null, d: string, att?: string): ErrorEntry {
  const right = item.options[item.answer], picked = chosen == null ? null : item.options[chosen];
  return {
    id: uid(), d, sec: "VARC", t: "Critical reasoning", trap: picked?.trap ?? "", src: crErrorSrc(item), q: crRedoKey(item.id), ...(att ? { att } : {}),
    why: picked ? `Chose ${LETTERS[chosen!]}: ${picked.t} ${picked.why}` : "Left it blank.",
    fix: `Answer ${LETTERS[item.answer]}: ${right.t} ${right.why} ${item.takeaway}`,
  };
}

export function fmtSecs(s: number) {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m + ":" + (r < 10 ? "0" : "") + r;
}
