import { describe, expect, it } from "vitest";

/**
 * Readable pages (F102) shorten and restyle the section pages, so nothing a student needs may go missing in a rewrite.
 * Each fact below was on the VARC or DILR page before the 12 Nov 2026 redesign (docs/design/readable-pages.md,
 * "What a student must still find"); this fails if a later rewrite drops one. To retire a fact on purpose, delete it
 * here in the same change, so the loss is a decision and not an accident.
 */
// The source files as text, the way the catalog test reads them (no Node types in the app's TypeScript setup).
const SRC = import.meta.glob<string>(["/src/sections/*/learn.ts", "/src/sections/*/resources.ts", "/src/pages/Section.tsx", "/src/components/Explainer.tsx"], { query: "?raw", import: "default", eager: true });
const read = (...files: string[]) => files.map((f) => { const t = SRC["/" + f]; if (t === undefined) throw new Error("not read: " + f); return t; }).join("\n");
const PAGE = ["src/pages/Section.tsx", "src/components/Explainer.tsx"];

const FACTS: Record<string, { files: string[]; facts: [string, RegExp][] }> = {
  dilr: {
    files: ["src/sections/dilr/learn.ts", "src/sections/dilr/resources.ts", ...PAGE],
    facts: [
      ["22 questions in 40 minutes", /22 questions, 40 minutes/],
      ["three sets of 4 and two of 5", /three sets of 4 questions and two of 5/i],
      ["most sets are logic", /logic, or logic with numbers/],
      ["data sets per slot vary", /none to four/],
      ["+3 right, −1 wrong MCQ", /\+3 a right answer, −1 a wrong MCQ/],
      ["what TITA means", /TITA \(you type the answer\)/],
      ["TITA has no minus mark, answer every one", /no minus mark: answer every one/],
      ["read all five first, 3 to 5 minutes", /Read all five first, in 3 to 5 minutes/],
      ["attempt the 2 or 3 most direct", /2 or 3 most direct/],
      ["leave a set after 5 to 7 minutes", /5 to 7 minutes\? Leave it/],
      ["10 to 13 right is a 99", /10 to 13 right is about a 99/],
      ["CAT 2025: 30 to 38 marks", /30 to 38 marks/],
      ["one set alone is the 85th percentile", /85th percentile/],
      ["a set takes 30 to 45 minutes at first", /30 to 45 minutes at first/],
      ["15 to 20 after 100 sets solved and studied", /15 to 20 after about 100 sets solved and studied/],
      ["weeks 1 to 3: LR basics untimed", /Weeks 1 to 3[\s\S]{0,80}LR basics, untimed/],
      ["ten minutes a day of DI calculation", /ten minutes a day of DI calculation/],
      ["weeks 4 and 5: DI basics, keep one LR set a day", /Keep one LR set a day going/],
      ["weeks 6 to 12: one or two LR sets, LR 15 to 20, DI 12", /One or two LR sets a day in 15 to 20 minutes and a DI set in 12/],
      ["study each solution as long as the set took", /as long as the set took/],
      ["pick two sources and finish them", /Pick two sources and finish them/],
      ["timed section weekly from the Build phase", /timed section weekly/i],
      ["2017 to 2022 for timed sections", /\["2017 to 2022", "Timed sections/],
      ["2023 to 2026 saved for the mock phase", /\["2023 to 2026", "Real papers, saved for the mock phase/],
      ["why eight newer DI sets are used", /eight sets from 2023 to 2025/],
      ["past DI sets two a week", /Two a week from your fourth week of DI/],
      ["timed sections: read all five, then choose", /read all five sets first, then choose/],
      ["the course names", /Quantifiers[\s\S]*Rodha|Rodha[\s\S]*Quantifiers/],
      ["the sets cover logic and data", /logic and data sets written for this site/],
    ],
  },
  varc: {
    files: ["src/sections/varc/learn.ts", "src/sections/varc/resources.ts", ...PAGE],
    facts: [
      ["24 questions in 40 minutes", /24 questions, 40 minutes/],
      ["16 RC in four passages of four, 8 VA", /16 are RC: four passages of four questions\. 8 are VA/],
      ["the VA mix changes; prepare all four types", /prepare all four types/],
      ["CAT 2024 had no para jumbles", /CAT 2024 had no para jumbles/],
      ["RC, para summary, sentence insertion are MCQs", /RC, para summary and sentence insertion are MCQs/],
      ["+3 right, −1 wrong", /\+3 for a right answer, −1 for a wrong one/],
      ["para jumbles and odd sentence out are TITA, no minus", /Para jumbles and odd sentence out are TITA: no minus mark/],
      ["always attempt TITA", /always attempt them/],
      ["about 28 minutes on RC, 10 to 12 on VA", /About 28 minutes on RC, 10 to 12 on VA/],
      ["decide the order in mocks", /RC-first or VA-first in mocks/],
      ["15 to 17 right, at most 3 wrong", /15 to 17 right, at most 3 wrong/],
      ["the 99 benchmark and the safe score", /\$\{B99\.values\}[\s\S]*\$\{B99\.safe\}/],
      ["reading comes first, 30 minutes of dense prose", /30 minutes without losing the thread/],
      ["weeks 1 to 4 sources", /The Hindu, Indian Express Explained, and the easier genres in Bharath's Reading List/],
      ["weeks 5 to 10 sources", /Guardian Long Read, Smithsonian, Psyche, Knowable/],
      ["week 11 on sources", /Aeon, The Economist, JSTOR Daily, Public Books, the Stanford Encyclopedia of Philosophy/],
      ["2017 to 2022 for timed sectionals", /\["2017 to 2022", "Timed sectionals/],
      ["2023 to 2026 saved for the mock phase", /\["2023 to 2026", "Real papers, saved for the mock phase/],
      ["question banks by type in the Build phase", /question banks by type in the Build phase/],
      ["harder sources from June 2027", /Harder sources come in from June 2027/],
      ["rotate sources; Aeon is a small share", /6 of roughly 102 RC passages to Aeon/],
      ["video under a fifth of VARC time", /under a fifth of your VARC time/],
      ["no direct vocabulary questions; learn roots", /Learn roots[\s\S]{0,200}no direct vocabulary questions/],
      ["what the site's practice gives", /explanation for every option[\s\S]*daily VA drill[\s\S]*timed sectional[\s\S]*redo queue[\s\S]*reading speed test/],
    ],
  },
};

describe("readable pages keep every fact a student needs (F102)", () => {
  for (const [sec, { files, facts }] of Object.entries(FACTS)) {
    const text = read(...files);
    for (const [name, re] of facts) it(`${sec}: ${name}`, () => expect(text, name).toMatch(re));
  }
});
