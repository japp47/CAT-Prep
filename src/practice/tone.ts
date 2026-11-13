import type { Tone } from "./types";

/**
 * Why the author's tone is the key (F36b, D103, docs/design/explain-mistake.md): what each tone means, in the words a
 * CAT tone question turns on, and which wrong picks are close calls. Per set, the passage line that shows the tone is
 * content (`summary.toneCue`, `summary.toneWhy`). No AI: the answer depends only on the set and the pick.
 */
export const TONE_MEANS: Record<Tone, string> = {
  analytical: "weighs a claim: sets out views, tests them and reaches a measured judgement",
  critical: "finds fault with a claim, a practice or a view",
  sceptical: "doubts a claim because the evidence for it is weak",
  appreciative: "admires something and says why it deserves credit",
  cautionary: "warns of a danger and how to avoid it",
  persuasive: "argues for a course of action and wants the reader to accept it",
  ironic: "says one thing and means another, often to mock",
  optimistic: "expects things to turn out well",
  neutral: "reports without judging",
};

/** Pairs a careful reader can mix up: a pick in one of these is a close call, not a misreading. */
const CLOSE: [Tone, Tone][] = [
  ["analytical", "neutral"], ["analytical", "critical"], ["analytical", "sceptical"], ["analytical", "cautionary"],
  ["critical", "sceptical"], ["critical", "ironic"], ["critical", "cautionary"], ["sceptical", "cautionary"],
  ["appreciative", "optimistic"], ["appreciative", "persuasive"], ["persuasive", "cautionary"],
];

export const isClose = (a: Tone, b: Tone) => CLOSE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** How a pick compares with the key: the same, a close call, a different reading, or no pick. */
export function toneVerdict(chosen: string, key: Tone): "same" | "close" | "far" | "none" {
  if (!chosen) return "none";
  if (chosen === key) return "same";
  return chosen in TONE_MEANS && isClose(chosen as Tone, key) ? "close" : "far";
}
