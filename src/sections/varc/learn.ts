export const FORMAT: [string, string][] = [
  ["Format", "24 questions in 40 minutes. 16 are RC (four passages of four questions) and 8 are VA. The VA mix changes from year to year: CAT 2023 and 2025 had 2 each of para summary, sentence insertion, odd sentence out and para jumbles, while CAT 2024 had no para jumbles at all. Prepare all four types."],
  ["Marking", "3 marks for a correct answer, minus 1 for a wrong MCQ. RC, para summary and sentence insertion are MCQs. Para jumbles and odd sentence out are TITA (you type the answer) with no negative marking, so always attempt them."],
  ["99 target", "15 to 17 correct, at most 3 wrong. In CAT 2025, 99 percentile was a scaled 42.77 on Cracku's table (MBAKaro says 43). Plan on 44 or more."],
  ["Time split", "About 28 minutes on RC and 10 to 12 on VA. Decide RC-first or VA-first in mocks, not on exam day."],
];

export interface Topic { h: string; p?: string[]; ul?: string[]; ol?: string[]; open?: boolean }

export const TOPICS: Topic[] = [
  { h: "Starting from zero", open: true,
    p: ["Reading comes first. For the first months, the goal is to read dense prose for 30 minutes without losing the thread."],
    ol: [
      "Weeks 1 to 4. Editorials and explainers (The Hindu, Indian Express Explained) and the easier genres in Bharath's Reading List.",
      "Weeks 5 to 10. Guardian Long Read, Smithsonian, Psyche, Knowable.",
      "Week 11 onwards. Aeon, The Economist, JSTOR Daily, Public Books, the Stanford Encyclopedia of Philosophy.",
    ] },
  { h: "After every article",
    p: ["Write a two-line summary, one word for the author's tone, and one question an examiner could ask. Cracku's beginner path follows the same order: daily reading, summaries, easy RCs, CAT-level RCs, then timed sets."] },
  { h: "Reading comprehension",
    ul: [
      "Question types: main idea, author's purpose and tone, inference (\"can be inferred\", \"the author would agree\"), specific detail, \"all EXCEPT\", strengthen and weaken, assumption, application and analogy, meaning in context.",
      "Read once, actively. Take the thesis from the first paragraph and mark what each paragraph does: claim, example, counterpoint or conclusion. Notice stance words such as however, ostensibly, merely and compelling.",
      "Go back to the specific paragraph while answering. Never re-read the whole passage.",
      "Four passages of 450 to 500 words come to about 2,000 words. At 200 words a minute that is 10 to 11 minutes of reading, so all RC work should fit in 25 to 28 minutes.",
      "Elimination is the skill CAT tests. Remove three options before you mark. Red flags are extreme words, claims outside the passage, options that are half right, and options that are true but do not answer the question.",
      "Do all four RCs if your accuracy is above 80%. Otherwise do three fully and the easiest questions of the fourth. Never start a new RC in the last few minutes.",
    ] },
  { h: "Para jumbles (TITA)",
    p: ["Find the opening sentence first. It stands alone, introduces the subject and has no pronoun or connector pointing back. Then lock the mandatory pairs: a pronoun with its antecedent, \"however\" or \"thus\" with the idea before it, an acronym with its expansion, a general statement with its example, anything chronological. Build the chain from the pairs, not from the start. Read the final order as one paragraph to check it."] },
  { h: "Para summary",
    p: ["The right summary keeps the main argument and its key qualifier, adds nothing new and does not shift the emphasis. Remove options that are too narrow (one example), too broad, or that make extreme or causal claims the passage never makes. Put the passage in one line of your own before reading the options."] },
  { h: "Odd sentence out (TITA)",
    p: ["Find the coherent four-sentence paragraph first. The odd sentence is often on the topic but off the focus: the same keywords with a different scope or time frame. Do not pick a sentence only because its tone differs."] },
  { h: "Sentence insertion (para completion)",
    p: ["CAT gives you one sentence and a paragraph with four numbered gaps, and asks which gap the sentence came from. It is an MCQ, so a wrong answer costs a mark.",
      "Read the sentences on both sides of each gap. The right gap links to both: the sentence picks up the idea before it and sets up the pronoun, example or contrast after it. Rule out a gap when the sentence after it already follows on from the sentence before it."] },
  { h: "Critical reasoning",
    p: ["CAT does not ask it as a separate type, but XAT does, and it trains the same judgement RC options need. Practise assumption, strengthen, weaken and inference questions. Cracku's critical reasoning set and the GMAT verbal questions cover it."] },
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
