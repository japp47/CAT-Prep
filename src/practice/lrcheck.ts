import type { LrQuestion } from "./types";

/**
 * Whether a typed (TITA) answer matches. Case, spaces and commas between items do not matter ("B, D, A" is "BDA");
 * numbers compare by value, so "12.50" is "12.5" and "07" is "7".
 */
export function titaMatches(given: string, answer: string): boolean {
  const norm = (x: string) => x.trim().toUpperCase().replace(/[\s,]+/g, "");
  const a = norm(given), b = norm(answer);
  if (!a) return false;
  const num = /^-?\d+(\.\d+)?$/;
  if (num.test(a) && num.test(b)) return Math.abs(Number(a) - Number(b)) < 1e-9;
  return a === b;
}

/** Whether an answer to an LR question is right: an option index for MCQ, typed text for TITA; null is skipped. */
export function lrRight(q: LrQuestion, given: number | string | null): boolean {
  if (given === null || given === "") return false;
  return q.kind === "mcq" ? given === q.answer : titaMatches(String(given), String(q.answer));
}
