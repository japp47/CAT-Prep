import { benchmark } from "../../data/percentiles";
const B99 = benchmark(99);
/**
 * The section as the captions of a stepped picture, "How the 40 minutes go" (F102, components/Explainer.tsx): each
 * step in ink, its detail muted. Holds every fact of the old format table: 16 RC and 8 VA, the VA mix by year, which
 * types are MCQ and which TITA, the time split, and the 99 target with its benchmark.
 */
export const FORMAT: [string, string][] = [
  ["24 questions, 40 minutes.", "16 are RC: four passages of four questions. 8 are VA."],
  ["The VA mix changes every year: prepare all four types.", "CAT 2023 and 2025 had 2 each of para summary, sentence insertion, odd sentence out and para jumbles; CAT 2024 had no para jumbles at all."],
  ["RC, para summary and sentence insertion are MCQs.", "+3 for a right answer, −1 for a wrong one."],
  ["Para jumbles and odd sentence out are TITA: no minus mark.", "You type the answer, so always attempt them."],
  ["About 28 minutes on RC, 10 to 12 on VA.", "Decide RC-first or VA-first in mocks, not on exam day."],
  ["15 to 17 right, at most 3 wrong, is a 99.", `The 99th percentile was a scaled ${B99.values} in CAT ${B99.years} (averages of ${B99.sources}). Plan on ${B99.safe} or more.`],
];

/** Starting from zero, as stages: reading comes first, sources get harder (F102). */
export const START: { intro: string; introMore: string; rows: { when: string; what: string; more: string }[] } = {
  intro: "Reading comes first.",
  introMore: "For the first months, the goal is to read dense prose for 30 minutes without losing the thread.",
  rows: [
    { when: "Weeks 1 to 4", what: "Editorials and explainers.", more: "The Hindu, Indian Express Explained, and the easier genres in Bharath's Reading List." },
    { when: "Weeks 5 to 10", what: "Long reads.", more: "Guardian Long Read, Smithsonian, Psyche, Knowable." },
    { when: "Week 11 on", what: "CAT-level sources.", more: "Aeon, The Economist, JSTOR Daily, Public Books, the Stanford Encyclopedia of Philosophy." },
  ],
};

/** The VA mix table's conclusion, shown above the folded table. */
export const MIX_LINE = "Each year drops or shrinks a type: no para jumbles in 2024, no odd sentence out in 2022, no sentence insertion in 2021.";

/** The Practice tab's margin: which past papers to use when, and when the banks and harder sources come in. */
export const PRACTICE: { papers: [string, string][]; more: string } = {
  papers: [
    ["2017 to 2022", "Timed sectionals."],
    ["2023 to 2026", "Real papers, saved for the mock phase."],
  ],
  more: "Use the question banks by type in the Build phase. Harder sources come in from June 2027.",
};

export interface Topic { h: string; p?: string[]; ul?: string[]; ol?: string[]; open?: boolean; /** DILR: the half of the Learn tab it belongs to; none shows always. */ part?: "lr" | "di" }

/** General advice. Each question type has its own guide in guides.ts. */
export const TOPICS: Topic[] = [
];

/** Notes under a tab, as two-tone pairs: what to do in ink, the reason muted (F102). */
export const TAB_NOTES: Record<string, [string, string][]> = {
  read: [["Rotate your sources.", "CAT passages come from The Economist, The Guardian, Aeon, JSTOR, Public Books, Boston Review, Knowable, the Stanford Encyclopedia of Philosophy and academic books. An IMS India analysis traced only about 6 of roughly 102 RC passages to Aeon."]],
  watch: [["Pick one main channel and keep video under a fifth of your VARC time.", "Watching is not practice."]],
  vocab: [["Learn roots in the Foundation phase, then add words you meet in passages to your flashcards.", "CAT has no direct vocabulary questions, but unknown words slow your reading."]],
};

export const VTABS = [
  { id: "learn", label: "Learn" },
  { id: "practice", label: "Practice" },
  { id: "read", label: "Read" },
  { id: "watch", label: "Watch" },
  { id: "vocab", label: "Vocabulary" },
  { id: "toppers", label: "Toppers" },
];

/** VA questions per slot. Counts from IMS, Cracku and Careers360 slot analyses; a few slot reports differ by one question. */
export const VA_MIX: { year: string; ps: number; si: number; oso: number; pj: number; note?: string }[] = [
  { year: "2025", ps: 2, si: 2, oso: 2, pj: 2, note: "Para jumbles returned" },
  { year: "2024", ps: 3, si: 3, oso: 2, pj: 0, note: "No para jumbles" },
  { year: "2023", ps: 2, si: 2, oso: 2, pj: 2 },
  { year: "2022", ps: 3, si: 2, oso: 0, pj: 3, note: "No odd sentence out" },
  { year: "2021", ps: 3, si: 0, oso: 2, pj: 3, note: "No sentence insertion" },
];
