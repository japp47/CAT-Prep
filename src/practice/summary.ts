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

/** Each check's short name, where a verdict stands beside it ("Qualifier: not yet") rather than the student's "I kept…". */
export const SUMMARY_SHORT = ["Main claim", "Qualifier", "No examples", "Nothing added"] as const;

/** Saves a summary of an RC set. The caller makes the id, because a state updater may run more than once. */
export function recordRcSummary(st: AppState, id: string, set: RcSet, att: string, text: string, tone: string, checks: boolean[], d: string, now: number, ai?: boolean[], revised?: string): void {
  const t = text.trim();
  const e: SummaryEntry = { id, d, src: "rc", set: set.id, att, text: t, tone, checks: checks.slice(0, 4), words: words(t), updatedAt: now };
  // The first verdicts are kept for habits: they show what the student misses before any help.
  if (ai?.length === 4) e.ai = ai.slice();
  if (revised?.trim() && revised.trim() !== t) e.revised = revised.trim();
  st.summaries.push(e);
}

/** Saves a summary of an outside article, from the Today reading block or the journal. There is no model to compare with. */
export function recordArticleSummary(st: AppState, id: string, a: { text: string; tone: string; checks: boolean[]; from?: string; title?: string; url?: string }, d: string, now: number): void {
  const t = a.text.trim();
  const e: SummaryEntry = { id, d, src: "article", text: t, tone: a.tone, checks: a.checks.slice(0, 4), words: words(t), updatedAt: now };
  if (a.from) e.from = a.from;
  if (a.title?.trim()) e.title = a.title.trim();
  if (a.url?.trim()) e.url = a.url.trim();
  st.summaries.push(e);
}

/** "A title" or "https://…" from one optional field: a link goes to url, anything else to title. */
export function splitRef(s: string): { title?: string; url?: string } {
  const t = s.trim();
  if (!t) return {};
  return /^https?:\/\/\S+$/i.test(t) ? { url: t } : { title: t };
}

/** How each check is named in the report, and what to say when it is the one most often missed. */
const HABIT = [
  { label: "Main claim", miss: "You missed the main claim in", tip: "Ask what the author wants you to believe, not what the passage is about." },
  { label: "Qualifier", miss: "You dropped the qualifier in", tip: "Look for words like often, partly, mainly, some and may." },
  { label: "No examples", miss: "You kept examples or figures in", tip: "Cut names, numbers and cases unless the argument needs them." },
  { label: "Nothing added", miss: "You added something of your own in", tip: "Keep to what the passage says, without your own view." },
];
export const HABIT_WINDOW = 10;

/**
 * How often each check was met over the latest summaries, and one plain line about the weakest.
 * The line appears only when a check was missed at least twice, so one slip does not become a lesson.
 * Where AI gave a second opinion (F36), its verdicts count instead of the ticks: self-ticks run generous, and the
 * habit line is only useful if it is honest.
 */
export function summaryHabits(all: SummaryEntry[], n = HABIT_WINDOW) {
  const last = [...all].sort((a, b) => (a.d === b.d ? a.updatedAt - b.updatedAt : a.d < b.d ? -1 : 1)).slice(-n);
  const rows = HABIT.map((h, i) => ({ key: SUMMARY_CHECKS[i].id, label: h.label, attempted: last.length, correct: last.filter((s) => (s.ai ?? s.checks)[i]).length }));
  const worst = rows.reduce<number | null>((w, r, i) => (w === null || r.correct < rows[w].correct ? i : w), null);
  const missed = worst === null ? 0 : last.length - rows[worst].correct;
  const weakest = worst !== null && missed >= 2 ? `${HABIT[worst].miss} ${missed} of your last ${last.length}. ${HABIT[worst].tip}` : null;
  return { count: last.length, rows, weakest };
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
