import { EXAM_ISO, PHASES, phaseOf } from "../../data/exam";
import { diffDays, dow, parseIso } from "../../lib/date";
import type { Block, DayTemplate, Link, PlanCtx } from "../types";
import { paperPdf } from "../../data/papers";
import { EARLY_SRC, L, ROTATION } from "./resources";

export const PRACTICE_PAPERS = ["CAT 2017 Slot 1", "CAT 2017 Slot 2", "CAT 2018 Slot 1", "CAT 2018 Slot 2", "CAT 2019 Slot 1", "CAT 2019 Slot 2",
  "CAT 2020 Slot 1", "CAT 2020 Slot 2", "CAT 2020 Slot 3", "CAT 2021 Slot 1", "CAT 2021 Slot 2", "CAT 2021 Slot 3",
  "CAT 2022 Slot 1", "CAT 2022 Slot 2", "CAT 2022 Slot 3"];
export const REAL_PAPERS = ["CAT 2023 Slot 1", "CAT 2023 Slot 2", "CAT 2023 Slot 3", "CAT 2024 Slot 1", "CAT 2024 Slot 2", "CAT 2024 Slot 3",
  "CAT 2025 Slot 1", "CAT 2025 Slot 2", "CAT 2025 Slot 3", "CAT 2026 Slot 1", "CAT 2026 Slot 2", "CAT 2026 Slot 3"];

const LSAT_SAMPLES = "https://www.lawhub.org/prepare-for-the-lsat/whats-in-the-lsat/reading-comprehension-sample-questions";
const IMS = "https://www.imsindia.com";
const ALDAILY = "https://www.aldaily.com";

function nextPaper(list: string[], ctx: PlanCtx): string | null {
  const done = new Set(ctx.mocks.filter((m) => m.sec === "VARC").map((m) => m.n.trim().toLowerCase()));
  return list.find((p) => !done.has(p.toLowerCase())) ?? null;
}
function weekIndex(d: string) {
  return Math.floor(diffDays("2026-10-12", d) / 7);
}

type Opt = Partial<Block>;
const B = (id: string, name: string, m: number, mm: number, pri: number, ord: number, desc: string, links: Link[], x?: Opt): Block =>
  ({ id, name, m, mm, pri, ord, desc, links, ...x });

function readBlock(d: string, m: number, mm: number, pri: number, ord: number, long?: boolean): Block {
  const g = dow(d), ro = ROTATION[g], ph = phaseOf(d);
  const early = ph.kind === "phase" && ph.phase.id === 1 && diffDays(PHASES[0].start, d) < 28;
  const src: Link[] = early ? [...EARLY_SRC, ["Bharath's Reading List", L.bharath]] : [...ro.src, ...(g === 0 ? [] : [["Bharath's Reading List", L.bharath] as Link])];
  return B("read", long ? "Long read" : "Read one article", m, mm, pri, ord,
    (early ? "Start with editorials and explainers this month." : ro.genre + ".") + " Afterwards write down: " + ro.out.charAt(0).toLowerCase() + ro.out.slice(1) + ".",
    src);
}
function vocabBlock(m: number, mm: number, pri: number, ord: number, ph: number): Block {
  return B("vocab", "Vocabulary", m, mm, pri, ord,
    ph === 1 ? "Review due flashcards, then one Word Power Made Easy session. Add new words from today's reading." : "Review due flashcards and add words from today's passages.",
    [["Your flashcards", "/words"], ["Etymonline", L.etym], ...(ph === 1 ? [["Word Power Made Easy", L.wpme] as Link] : [])]);
}
function errBlock(m: number, mm: number, pri: number, ord: number): Block {
  return B("errrev", "Error log review", m, mm, pri, ord, "Re-read your last 10 entries. For each, say the right reasoning before you read it.", [["Error log", "/errors"]]);
}
function paperBlock(list: string[], label: string, m: number, pri: number, ord: number, ctx: PlanCtx): Block {
  const p = nextPaper(list, ctx);
  if (!p) return B("paper", "Mock VARC section, timed", m, m, pri, ord, "You have done every paper in this set. Take a VARC sectional from your mock series instead.",
    [["Cracku mocks", L.crMock], ["CL mocks", L.clMock]], { kind: "paper", paper: "", pkind: "Sectional" });
  const pdf = paperPdf(p);
  return B("paper", label + ": " + p, m, m, pri, ord, (pdf ? "Do only the VARC section of the PDF: 40 minutes" : "40 minutes") + ", timed, in one sitting. Log your score when you finish.",
    [...(pdf ? [["Download the paper", pdf] as Link] : []), ["Cracku papers", L.crPYQ], ["CL papers", L.clPYQ]], { kind: "paper", paper: p, pkind: "Past paper" });
}
function analysisBlock(m: number, mm: number, pri: number, ord: number): Block {
  return B("analysis", "Analyse that paper", m, mm, pri, ord, "Go through every question, including the ones you got right. Add an error log entry for each wrong or skipped one.", [["Error log", "/errors"]]);
}
/** Blocks that drill from the Cracku banks also link to the same kind of practice on this site. */
function practice(id: string, name: string, m: number, mm: number, pri: number, ord: number, ptype: string, desc: string, links: Link[]): Block {
  const here: Link[] = [];
  if (links.some(([, u]) => u === L.crRC)) here.push(["Practice RC here", "/practice"]);
  if (links.some(([, u]) => u === L.crVA)) here.push(["VA drill here", "/practice/va"]);
  return B(id, name, m, mm, pri, ord, desc, [...here, ...links], { kind: "practice", ptype });
}
const book = (ord: number): Block => B("x-book", "Book from the reading list", 30, 20, 0, ord, "Read for the habit. No notes needed.", [["Reading list", L.readList]]);

export function varcTemplate(d: string, ctx: PlanCtx): DayTemplate {
  const info = phaseOf(d);
  if (info.kind !== "phase" || d === EXAM_ISO) return { base: [], extra: [] };
  const ph = info.phase.id, g = dow(d), we = g === 0 || g === 6;
  const nov = parseIso(d).getMonth() === 10;
  let base: Block[] = [], extra: Block[] = [];

  if (ph === 1) {
    if (!we) {
      base = [readBlock(d, 30, 15, 1, 1),
        practice("rc1", "One RC, untimed", 20, 10, 2, 2, "RC", "Take your time. After answering, write why each wrong option is wrong.", [["Cracku RC bank", L.crRC]]),
        vocabBlock(10, 5, 3, 3, 1)];
    } else {
      const core = ctx.ticks.gejo
        ? B("book1", "Arun Sharma VARC book, next chapter", 45, 25, 1, 1, "Level 1 exercises first, then Level 2. Check every answer and note why the wrong options fail.", [["Find the book", L.arun]])
        : B("course", "Gejo's VARC course, next module", 45, 25, 1, 1, "One module with notes. When all 17 are done, tick the course in VARC, Learn, and this block switches to the prep book.", [["Open the course", L.gejo]]);
      base = [core, readBlock(d, 40, 20, 2, 2, true),
        practice("rc3", "Three RCs, untimed", 40, 15, 3, 3, "RC", "Untimed. Before reading the options, say the main idea in one line.", [["Cracku RC bank", L.crRC]]),
        vocabBlock(25, 10, 4, 4, 1)];
    }
    extra = [B("x-read", "Second article, different genre", 20, 15, 0, 5, "Pick a genre you find hard.", [["Bharath's Reading List", L.bharath], ["Arts & Letters Daily", ALDAILY]]),
      practice("x-rc", "One more untimed RC", 20, 15, 0, 6, "RC", "Same method as above.", [["Cracku RC bank", L.crRC]]),
      book(7), errBlock(15, 10, 0, 8)];
  } else if (ph === 2) {
    if (!we) {
      const drills: Record<number, Block> = {
        1: practice("drill", "RC drill: main idea and tone", 30, 20, 1, 1, "RC", "Two RCs, about 8 minutes each. Before the options, write the main idea in one line.", [["Cracku RC bank", L.crRC]]),
        2: practice("drill", "Para jumble drill", 30, 20, 1, 1, "Para jumble", "8 questions. Find the opener, lock the mandatory pairs, then build the chain.", [["Cracku VA bank", L.crVA], ["Cracku PJ bank", L.crPJ]]),
        3: practice("drill", "RC drill: inference", 30, 20, 1, 1, "RC", "Two RCs. For each correct inference, point to the line that supports it.", [["Cracku RC bank", L.crRC]]),
        4: practice("drill", "Para summary and odd sentence out", 30, 20, 1, 1, "Para summary", "5 summaries and 5 odd-sentence questions. Paraphrase first, then read the options.", [["Cracku VA bank", L.crVA]]),
        5: practice("drill", "Sentence insertion and one RC", 30, 20, 1, 1, "Sentence insertion", "5 sentence insertion questions, then one RC.", [["Cracku VA bank", L.crVA], ["Cracku RC bank", L.crRC]]),
      };
      base = [drills[g], readBlock(d, 20, 10, 2, 2), vocabBlock(10, 5, 3, 3, 2)];
    } else if (g === 6 && weekIndex(d) % 2 === 0) {
      base = [paperBlock(PRACTICE_PAPERS, "Timed paper", 40, 1, 1, ctx), analysisBlock(50, 25, 2, 2), readBlock(d, 40, 20, 3, 3, true), vocabBlock(20, 10, 4, 4, 2)];
    } else if (g === 6) {
      base = [B("book2", "Arun Sharma VARC book, Level 2 or 3 chapter", 45, 25, 1, 1, "Work the exercises timed. Review every wrong option.", [["Find the book", L.arun]]),
        practice("rcset", "Three RCs, 8 minutes each", 40, 25, 2, 2, "RC", "Timed. Review each wrong option afterwards.", [["Cracku RC bank", L.crRC]]),
        readBlock(d, 40, 20, 3, 3, true), errBlock(25, 10, 4, 4)];
    } else {
      base = [practice("rcset", "Three RCs, 8 minutes each", 40, 25, 1, 1, "RC", "Timed. Review each wrong option afterwards.", [["Cracku RC bank", L.crRC]]),
        practice("vaset", "VA set, 10 questions", 30, 15, 2, 2, "Para jumble", "Mix all four VA types. Log the type that cost you most.", [["Cracku VA bank", L.crVA]]),
        readBlock(d, 50, 20, 3, 3, true), errBlock(30, 10, 4, 4)];
    }
    extra = [practice("x-rc", "Extra RC set", 25, 15, 0, 5, "RC", "Two RCs, timed.", [["Cracku RC bank", L.crRC]]),
      practice("x-pj", "Para jumble drill, 5 questions", 15, 10, 0, 6, "Para jumble", "TITA, so Practice until it is automatic.", [["Cracku VA bank", L.crVA]]),
      errBlock(15, 10, 0, 7), book(8)];
  } else if (ph === 3) {
    const aug = parseIso(d).getMonth() === 7;
    if (!we) {
      const hard: Record<number, Block> = {
        1: practice("hard", "Hard RC: XAT passage", 30, 20, 1, 1, "RC", "One XAT verbal RC, timed. XAT prose is denser than CAT.", [["XAT papers", L.xat]]),
        2: practice("hard", "VA set, timed", 30, 20, 1, 1, "Para jumble", "8 VA questions in 12 minutes, then review.", [["Cracku VA bank", L.crVA]]),
        3: practice("hard", "Hard RC: LSAT passage", 30, 20, 1, 1, "RC", "One LSAT RC passage. Compare your reasoning with the explanations.", [["LawHub", L.lawhub], ["LSAT samples", LSAT_SAMPLES]]),
        4: practice("hard", "VA set, timed", 30, 20, 1, 1, "Odd sentence out", "8 VA questions in 12 minutes, then review.", [["Cracku VA bank", L.crVA]]),
        5: practice("hard", "Critical reasoning and GMAT verbal", 30, 20, 1, 1, "Critical reasoning", "10 critical reasoning questions or one GMAT RC.", [["Drill on this site", "/practice/cr?type=mix&n=10"], ["Cracku CR", L.crCR], ["GMAT starter kit", L.gmat]]),
      };
      base = [hard[g], readBlock(d, 20, 10, 2, 2), errBlock(10, 5, 3, 3)];
    } else if (g === 6) {
      base = [paperBlock(PRACTICE_PAPERS, "Timed paper", 40, 1, 1, ctx), analysisBlock(50, 25, 2, 2), readBlock(d, 40, 20, 3, 3, true), errBlock(20, 10, 4, 4)];
    } else if (aug) {
      base = [B("paper", "Mock VARC section, timed", 40, 40, 1, 1, "Take the VARC section of a mock from your series, timed.", [["Cracku mocks", L.crMock], ["CL mocks", L.clMock], ["IMS", IMS]], { kind: "paper", paper: "", pkind: "Full mock" }),
        analysisBlock(50, 25, 2, 2), readBlock(d, 40, 20, 3, 3, true), errBlock(20, 10, 4, 4)];
    } else {
      base = [practice("hardset", "Hard RC set: three passages", 45, 25, 1, 1, "RC", "Three LSAT or XAT passages, timed.", [["LawHub", L.lawhub], ["XAT papers", L.xat]]),
        practice("vaset", "VA set, 10 questions", 30, 15, 2, 2, "Para jumble", "All four VA types.", [["Cracku VA bank", L.crVA]]),
        readBlock(d, 45, 20, 3, 3, true), vocabBlock(30, 10, 4, 4, 3)];
    }
    extra = [practice("x-hard", "Extra hard RC", 25, 15, 0, 5, "RC", "One LSAT or XAT passage.", [["LawHub", L.lawhub], ["XAT papers", L.xat]]),
      errBlock(20, 10, 0, 6), book(7)];
  } else if (ph === 4) {
    if (!we) {
      const odd = g === 1 || g === 3 || g === 5;
      base = [odd
        ? practice("pair", "Timed RC pair", 30, 20, 1, 1, "RC", "Two RCs in 16 minutes, then review every option.", [["Cracku RC bank", L.crRC]])
        : B("mockfix", "Finish the weekend analysis", 30, 15, 1, 1, "Complete error log entries for the last mock or paper. If it is done, re-solve one wrong RC from it.", [["Error log", "/errors"]]),
        practice("tita", "TITA drill: para jumbles and odd sentence out", 15, 10, 2, 2, "Para jumble", "6 questions. These are free marks on the day.", [["Cracku VA bank", L.crVA]]),
        readBlock(d, 15, 10, 3, 3)];
    } else if (g === 6) {
      base = [B("paper", nov ? "Official IIM mock, or a mock VARC section" : "Mock VARC section, at your slot time", 40, 40, 1, 1,
        (nov ? "If the official mock is out, take it on the real interface first. " : "") + "Sit at the time of day your slot will be.",
        [["Cracku mocks", L.crMock], ["CL mocks", L.clMock], ["iimcat.ac.in", L.iim]], { kind: "paper", paper: "", pkind: nov ? "Official IIM mock" : "Full mock" }),
        analysisBlock(60, 30, 2, 2), errBlock(20, 10, 3, 3), readBlock(d, 30, 10, 4, 4)];
    } else {
      base = [paperBlock(REAL_PAPERS, "Real paper", 40, 1, 1, ctx), analysisBlock(60, 30, 2, 2), readBlock(d, 30, 10, 3, 3), errBlock(20, 10, 4, 4)];
    }
    extra = [practice("x-resolve", "Re-solve a wrong past paper RC", 20, 15, 0, 5, "RC", "Pick one from your error log.", [["Error log", "/errors"]]),
      practice("x-tita", "Extra TITA drill", 15, 10, 0, 6, "Odd sentence out", "6 questions.", [["Cracku VA bank", L.crVA]]),
      errBlock(20, 10, 0, 7)];
  } else {
    base = [practice("light", "Two light RCs", 25, 15, 1, 1, "RC", "Easy to medium passages. Keep confidence up.", [["Cracku RC bank", L.crRC]]),
      practice("lightva", "One VA set", 15, 10, 2, 2, "Para summary", "8 questions, relaxed pace.", [["Cracku VA bank", L.crVA]]),
      errBlock(20, 10, 3, 3)];
    extra = [B("x-light", "Light reading", 20, 10, 0, 4, "Something you enjoy. Nothing new to learn now.", [["Arts & Letters Daily", ALDAILY]])];
  }
  return { base, extra };
}
