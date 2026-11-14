import { mediumDate } from "../lib/date";
import type { ArticleEntry } from "../lib/state";
import { ORIGIN_LABEL } from "./articleText";
import type { OptionTrap } from "../data/traps";
import { sentences } from "./sentences";
import { TONES, words, type RcQType, type RcSet, type Tone } from "./types";

/**
 * A student's article set (F34, D104) as the RC player knows a set. The entry (synced, no article text) holds the
 * questions with their deciding lines as [paragraph, sentence] references; the text comes from the article store.
 * Ids start with "art-" so every page can tell an article set from a library set.
 */
export const ARTICLE_PREFIX = "art-";
export const isArticleSet = (id: string) => id.startsWith(ARTICLE_PREFIX);

export function articleRcSet(e: ArticleEntry, paras: string[]): RcSet {
  const cut = paras.map(sentences);
  const n = paras.reduce((t, p) => t + words(p), 0);
  return {
    id: e.id, title: e.title, genre: "society", difficulty: n > 800 ? "hard" : "medium", paras, recall: [],
    questions: e.questions.map((q) => ({
      type: q.type as RcQType, stem: q.stem, answer: q.answer,
      proof: q.proof?.length ? q.proof : [...new Set(q.lines.map(([p]) => p))],
      lines: q.lines.map(([p, s]) => cut[p]?.[s]).filter((l): l is string => !!l),
      options: q.options.map((t, i) => ({ t, why: q.notes[i] ?? "", ...(q.traps[i] ? { trap: q.traps[i] as OptionTrap } : {}) })),
    })),
    summary: {
      model: e.summary.model, claim: e.summary.claim, qualifier: e.summary.qualifier,
      tone: (TONES as readonly string[]).includes(e.summary.tone) ? (e.summary.tone as Tone) : "analytical",
      toneCue: e.summary.toneCue, toneWhy: e.summary.toneWhy,
    },
  };
}

/** The article's text on this device, while object storage (D107) is not set up or the student is offline. */
const TEXT_KEY = "cat-prep-article-text";
const KEEP = 30;

type TextStore = Record<string, { paras: string[]; at: number }>;
const readStore = (): TextStore => {
  try { return JSON.parse(localStorage.getItem(TEXT_KEY) ?? "{}") as TextStore; } catch { return {}; }
};

export function saveArticleText(id: string, paras: string[]): void {
  try {
    const s = readStore();
    s[id] = { paras, at: Date.now() };
    // The newest 30 only: the questions, score and mistakes stay in the student's history either way.
    const keep = Object.entries(s).sort((a, b) => b[1].at - a[1].at).slice(0, KEEP);
    localStorage.setItem(TEXT_KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch { /* storage full or blocked: the set still works on this visit */ }
}

export function articleText(id: string): string[] | null {
  return readStore()[id]?.paras ?? null;
}

export function dropArticleText(id: string): void {
  try { const s = readStore(); delete s[id]; localStorage.setItem(TEXT_KEY, JSON.stringify(s)); } catch { /* nothing to do */ }
}

/**
 * A set lookup that also knows the student's article sets, for pages that read attempts by question kind (the skill
 * map, the report). An article set comes back without its text: those pages need only the questions.
 */
export function withArticles(rcById: (id: string) => RcSet | undefined, articles: ArticleEntry[]): (id: string) => RcSet | undefined {
  const byId = new Map(articles.map((a) => [a.id, a]));
  return (id) => {
    if (!isArticleSet(id)) return rcById(id);
    const a = byId.get(id);
    return a ? articleRcSet(a, []) : undefined;
  };
}

/** One line about an article set for the student's lists: where it came from, the source, the date, the last score. */
export function articleLine(a: ArticleEntry, right: number | undefined): string {
  const from = a.origin ? ORIGIN_LABEL[a.origin] + (a.file ? ` (${a.file})` : "") : "";
  return [from, a.site, mediumDate(a.d), `${a.questions.length} questions`, right !== undefined ? `${right} of ${a.questions.length} right` : "not tried yet"].filter(Boolean).join(", ");
}
