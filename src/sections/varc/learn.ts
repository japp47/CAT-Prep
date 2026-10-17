export const FORMAT: [string, string][] = [
  ["Format", "24 questions in 40 minutes. 16 are RC (four passages of four questions) and 8 are VA. The VA mix changes from year to year: CAT 2023 and 2025 had 2 each of para summary, sentence insertion, odd sentence out and para jumbles, while CAT 2024 had no para jumbles at all. Prepare all four types."],
  ["Marking", "3 marks for a correct answer, minus 1 for a wrong MCQ. RC, para summary and sentence insertion are MCQs. Para jumbles and odd sentence out are TITA (you type the answer) with no negative marking, so always attempt them."],
  ["99 target", "15 to 17 correct, at most 3 wrong. In CAT 2025, 99 percentile was a scaled 42.77 on Cracku's table (MBAKaro says 43). Plan on 44 or more."],
  ["Time split", "About 28 minutes on RC and 10 to 12 on VA. Decide RC-first or VA-first in mocks, not on exam day."],
];

export interface Topic { h: string; p?: string[]; ul?: string[]; ol?: string[]; open?: boolean }

/** General advice. Each question type has its own guide in guides.ts. */
export const TOPICS: Topic[] = [
  { h: "Starting from zero", open: true,
    p: ["Reading comes first. For the first months, the goal is to read dense prose for 30 minutes without losing the thread."],
    ol: [
      "Weeks 1 to 4. Editorials and explainers (The Hindu, Indian Express Explained) and the easier genres in Bharath's Reading List.",
      "Weeks 5 to 10. Guardian Long Read, Smithsonian, Psyche, Knowable.",
      "Week 11 onwards. Aeon, The Economist, JSTOR Daily, Public Books, the Stanford Encyclopedia of Philosophy.",
    ] },
];

export const TAB_NOTES: Record<string, string[]> = {
  practice: ["Use the question banks by type in the Build phase. Keep CAT 2017 to 2022 for timed sectionals, and save 2023 to 2026 as real papers for the mock phase. Harder sources come in from June 2027."],
  read: ["CAT passages come from The Economist, The Guardian, Aeon, JSTOR, Public Books, Boston Review, Knowable, the Stanford Encyclopedia of Philosophy and academic books. An IMS India analysis traced only about 6 of roughly 102 RC passages to Aeon, so rotate your sources."],
  watch: ["Pick one main channel and keep video under a fifth of your VARC time. Watching is not practice."],
  vocab: ["CAT has no direct vocabulary questions, but unknown words slow your reading. Learn roots in the Foundation phase, then add words you meet in passages to your flashcards."],
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
