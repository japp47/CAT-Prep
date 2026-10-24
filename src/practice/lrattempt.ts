import { uid } from "../lib/date";
import type { AppState, ErrorEntry, LrAttempt, LrPostMortem, LrSlip, LrTimeSink } from "../lib/state";
import { lrRight } from "./lrcheck";
import { LETTERS } from "./record";
import { LR_TYPE, lrVersion, type LrSet } from "./types";

/** Labels for the post-mortem (F86), worded as the student would say them. */
export const LR_TIME_LABEL: Record<LrTimeSink, string> = {
  reading: "Reading the set",
  drawing: "Drawing the table",
  cases: "A case I did not need",
  calculation: "Calculation",
  stuck: "Stuck with no way in",
};
export const LR_SLIP_LABEL: Record<LrSlip, string> = {
  misread: "Misread a clue",
  "missed-case": "Missed a case",
  assumption: "Assumed something not given",
  calculation: "Calculation slip",
  none: "No slip",
};

/** CAT marking: +3 right, −1 for a wrong MCQ, nothing lost on a wrong TITA or a blank. */
export function scoreLr(set: LrSet, ans: (number | string | null)[]) {
  let c = 0, w = 0, tw = 0, skipped = 0;
  set.questions.forEach((q, i) => {
    const a = ans[i];
    if (a === null || a === undefined || a === "") skipped++;
    else if (lrRight(q, a)) c++;
    else if (q.kind === "mcq") w++;
    else tw++;
  });
  return { c, w, tw, skipped, marks: 3 * c - w };
}

/** Saves an LR attempt and logs it as one DILR practice set, so Progress and History count it. */
export function recordLr(st: AppState, id: string, set: LrSet, ans: (number | string | null)[], secs: number, d: string, unsure: number[], now: number): void {
  const { c, w, tw } = scoreLr(set, ans);
  const a: LrAttempt = { id, d, set: set.id, ans, c, w, secs: Math.round(secs), updatedAt: now, v: lrVersion(set) };
  if (unsure.length) a.unsure = [...unsure].sort((x, y) => x - y);
  st.lrAttempts.push(a);
  if (c + w + tw > 0) st.practice.push({ id: id + "p", d, sec: "DILR", t: "LR", a: c + w + tw, c, src: "Practice: " + set.title });
}

/** Saves the post-mortem onto its attempt. The newer copy wins in sync, so the change reaches other devices. */
export function saveLrPostMortem(st: AppState, id: string, pm: LrPostMortem, now: number): void {
  const a = st.lrAttempts.find((x) => x.id === id);
  if (!a) return;
  a.pm = pm;
  a.updatedAt = Math.max(now, a.updatedAt + 1);
}

/** The answer as shown: the option letter and text for an MCQ, the typed text for a TITA. */
export function lrAnswerText(set: LrSet, qi: number, a: number | string | null): string {
  const q = set.questions[qi];
  if (a === null || a === "") return "Skipped";
  return q.kind === "mcq" && typeof a === "number" ? `${LETTERS[a]}: ${q.options![a]}` : String(a);
}

export const lrErrorSrc = (set: LrSet, qi: number) => `LR: ${set.title}, Q${qi + 1}`;

/** An Error log row for a missed LR question. It carries no redo key: LR questions are not in the redo queue yet. */
export function lrError(set: LrSet, qi: number, given: number | string | null, d: string, unsure: boolean, att: string): ErrorEntry {
  const q = set.questions[qi];
  return {
    id: uid(), d, sec: "DILR", t: LR_TYPE[set.type].label, trap: "", ...(unsure ? { cause: "guess" as const } : {}), att,
    src: lrErrorSrc(set, qi),
    why: given === null || given === "" ? "Skipped this question." : `Answered ${lrAnswerText(set, qi, given)}. ${q.stem}`,
    fix: `Answer ${lrAnswerText(set, qi, q.answer)}. ${q.why.join(" ")}`,
  };
}
