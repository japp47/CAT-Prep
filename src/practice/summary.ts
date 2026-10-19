import type { AppState, SummaryEntry } from "../lib/state";
import { words, type RcSet } from "./types";

/**
 * The four things a summary is checked for. They are the mistakes that cost marks in para summary and RC
 * main-idea questions (docs/plan.md, step 2e). The score is how many the student ticks.
 */
export const SUMMARY_CHECKS = [
  { id: "claim", label: "I kept the main claim", hint: "The author's point, not the topic." },
  { id: "qualifier", label: "I kept the qualifier", hint: "Words like often, partly, mainly, may." },
  { id: "examples", label: "I left out examples and figures", hint: "No names, numbers or cases unless the argument needs them." },
  { id: "added", label: "I added nothing of my own", hint: "No outside facts and no opinion of yours." },
] as const;

export const summaryScore = (checks: boolean[]) => checks.filter(Boolean).length;

/** Saves a summary of an RC set. The caller makes the id, because a state updater may run more than once. */
export function recordRcSummary(st: AppState, id: string, set: RcSet, att: string, text: string, tone: string, checks: boolean[], d: string, now: number): void {
  const t = text.trim();
  st.summaries.push({ id, d, src: "rc", set: set.id, att, text: t, tone, checks: checks.slice(0, 4), words: words(t), updatedAt: now });
}

/** The summary written right after an attempt, if any. */
export const summaryFor = (st: AppState, att: string): SummaryEntry | undefined => st.summaries.find((s) => s.att === att);

/** Splits text so the given phrases can be highlighted. Matching ignores case; phrases that overlap an earlier one are skipped. */
export function markPhrases(text: string, phrases: string[]): { t: string; hl: boolean }[] {
  const lower = text.toLowerCase();
  const spans = phrases
    .map((p) => ({ at: p ? lower.indexOf(p.toLowerCase()) : -1, len: p.length }))
    .filter((s) => s.at >= 0)
    .sort((a, b) => a.at - b.at)
    .filter((s, i, all) => i === 0 || s.at >= all[i - 1].at + all[i - 1].len);
  const out: { t: string; hl: boolean }[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.at > pos) out.push({ t: text.slice(pos, s.at), hl: false });
    out.push({ t: text.slice(s.at, s.at + s.len), hl: true });
    pos = s.at + s.len;
  }
  if (pos < text.length) out.push({ t: text.slice(pos), hl: false });
  return out;
}
