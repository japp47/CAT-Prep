import { uid } from "../lib/date";
import type { AppState, ErrorEntry, RcAttempt, VaAttempt } from "../lib/state";
import { RC_QTYPE, type RcSet } from "./types";
import { scoreItem, VA_KIND, type VaItem } from "./va/build";

export const LETTERS = ["A", "B", "C", "D", "E"];

export function scoreRc(set: RcSet, ans: (number | null)[]) {
  let c = 0, w = 0;
  set.questions.forEach((q, i) => { if (ans[i] == null) return; if (ans[i] === q.answer) c++; else w++; });
  return { c, w, skipped: set.questions.length - c - w, marks: 3 * c - w };
}

/**
 * Saves an RC attempt and logs it as a practice set so Progress picks it up.
 * The caller makes the id, because a state updater may run more than once.
 */
export function recordRc(st: AppState, id: string, set: RcSet, ans: (number | null)[], secs: number, first: number, mode: RcAttempt["mode"], d: string): void {
  const { c, w } = scoreRc(set, ans);
  st.rcAttempts.push({ id, d, set: set.id, mode, ans, c, w, secs: Math.round(secs), first: Math.round(first) });
  if (c + w > 0) st.practice.push({ id: id + "p", d, sec: "VARC", t: "RC", a: c + w, c, src: "Practice: " + set.title });
}

/** Saves a VA run and logs one practice set per question type. */
export function recordVa(st: AppState, id: string, items: VaItem[], answers: string[], secs: number, mode: VaAttempt["mode"], d: string): void {
  const rows = items.map((it, i) => { const s = scoreItem(it, answers[i] ?? ""); return { k: it.key, a: answers[i] ?? "", ok: s.ok, pts: s.pts, blank: s.blank, kind: it.kind }; });
  st.vaAttempts.push({ id, d, mode, secs: Math.round(secs), items: rows.map(({ k, a, ok, pts }) => ({ k, a, ok, pts })) });
  (["pj", "oso", "si"] as const).forEach((kind) => {
    const done = rows.filter((r) => r.kind === kind && !r.blank);
    if (done.length) st.practice.push({ id: id + kind, d, sec: "VARC", t: VA_KIND[kind].practice, a: done.length, c: done.filter((r) => r.ok).length, src: mode === "daily" ? "Daily VA drill" : "Custom VA drill" });
  });
}

export const rcErrorSrc = (set: RcSet, qi: number) => `${set.title}, Q${qi + 1} (Practice)`;

/** A pre-filled Error log entry for a wrong or skipped RC question. */
export function rcError(set: RcSet, qi: number, chosen: number | null, d: string): ErrorEntry {
  const q = set.questions[qi], right = q.options[q.answer];
  const picked = chosen == null ? null : q.options[chosen];
  return {
    id: uid(), d, sec: "VARC", t: RC_QTYPE[q.type].error, trap: picked?.trap ?? "",
    src: rcErrorSrc(set, qi),
    why: picked ? `Chose ${LETTERS[chosen!]}: ${picked.t} ${picked.why}` : "Skipped this question.",
    fix: `Answer ${LETTERS[q.answer]}: ${right.t} ${right.why}`,
  };
}

export const vaErrorSrc = (item: VaItem) => `${VA_KIND[item.kind].label}: ${item.para.topic} (Practice)`;

export function vaError(item: VaItem, typed: string, d: string): ErrorEntry {
  const p = item.para;
  const fix = item.kind === "pj" ? `Order ${item.answer}. ` + p.cues.join(" ") : item.kind === "oso" ? `Odd sentence: ${item.answer}. ${p.oddWhy}` : `Gap ${item.answer}. ${p.insWhy}`;
  return { id: uid(), d, sec: "VARC", t: VA_KIND[item.kind].label, trap: "", src: vaErrorSrc(item), why: typed ? `Typed ${typed}.` : "Left it blank.", fix };
}

export function fmtSecs(s: number) {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m + ":" + (r < 10 ? "0" : "") + r;
}
