import type { OptionTrap } from "../data/traps";

export type Genre = "economics" | "philosophy" | "psychology" | "science" | "society" | "literature" | "history" | "arts";
export const GENRES: Record<Genre, string> = {
  economics: "Economics and business",
  philosophy: "Philosophy",
  psychology: "Psychology",
  science: "Science and ecology",
  society: "Society and technology",
  literature: "Literature",
  history: "History",
  arts: "Arts",
};
export type Difficulty = "easy" | "medium" | "hard";

export type RcQType = "main" | "tone" | "inference" | "detail" | "except" | "strengthen" | "application" | "structure";
export const RC_QTYPE: Record<RcQType, { label: string; error: string }> = {
  main: { label: "Main idea", error: "RC: main idea" },
  tone: { label: "Tone or purpose", error: "RC: tone or purpose" },
  inference: { label: "Inference", error: "RC: inference" },
  detail: { label: "Specific detail", error: "RC: specific detail" },
  except: { label: "EXCEPT", error: "RC: EXCEPT" },
  strengthen: { label: "Strengthen or weaken", error: "RC: strengthen or weaken" },
  application: { label: "Application", error: "RC: application" },
  structure: { label: "Paragraph function", error: "RC: paragraph function" },
};

export interface RcOption {
  t: string;
  /** Why this option is right or wrong */
  why: string;
  /** Set on every wrong option. The one option without a trap is the answer. */
  trap?: OptionTrap;
}
export interface RcQuestion {
  type: RcQType;
  stem: string;
  /** Paragraphs (0-based) that settle the answer, highlighted in review */
  proof: number[];
  options: RcOption[];
  answer: number;
}
export interface RecallQ { q: string; options: string[]; answer: number }

export interface RcSet {
  id: string;
  title: string;
  genre: Genre;
  difficulty: Difficulty;
  paras: string[];
  questions: RcQuestion[];
  /** Two plain recall questions for the reading speed test */
  recall: RecallQ[];
  /** The day this set may join the RC of the day rotation. See dailyPick in daily.ts. */
  since?: string;
  /** The model summary shown after the set, before the answers. claim and qualifier are exact phrases from model. */
  summary?: RcSummary;
}

export interface RcSummary { model: string; tone: Tone; claim: string; qualifier: string }

/** Tones a student can pick for a passage, in the words CAT tone questions use. */
export const TONES = ["analytical", "critical", "sceptical", "appreciative", "cautionary", "persuasive", "ironic", "optimistic", "neutral"] as const;
export type Tone = (typeof TONES)[number];
export const SUMMARY_MAX_WORDS = 25;

export type CrType = "assumption" | "strengthen" | "weaken" | "inference" | "flaw" | "paradox";
/** The six kinds of critical reasoning question, in the order a mixed drill takes them. */
export const CR_TYPE: Record<CrType, { label: string }> = {
  assumption: { label: "Assumption" },
  strengthen: { label: "Strengthen" },
  weaken: { label: "Weaken" },
  inference: { label: "Inference" },
  flaw: { label: "Flaw" },
  paradox: { label: "Paradox" },
};
export const CR_TYPES = Object.keys(CR_TYPE) as CrType[];

/** One critical reasoning question: a short argument or set of statements, one question, four options. */
export interface CrItem {
  id: string;
  type: CrType;
  difficulty: Difficulty;
  topic: string;
  /** The argument, or for inference and paradox questions the statements, as one paragraph */
  stimulus: string;
  /** The conclusion, quoted exactly from the stimulus and highlighted in review. Null for inference and paradox questions, which have none. */
  conclusion: string | null;
  question: string;
  /** Four options. As in RC, the one option without a trap is the answer. */
  options: RcOption[];
  answer: number;
  /** The one rule to take from this question */
  takeaway: string;
  /** Words in the stimulus */
  wordCount: number;
}

/**
 * One authored paragraph. Each one yields four VA items:
 * a para jumble (all the core sentences), an odd sentence out (four of them plus the odd one),
 * a sentence insertion (the core sentences, with ins as the missing one that goes at insAt),
 * and a para summary (the full paragraph, core with ins put back).
 * Older paragraphs have four core sentences and no pj or ooo, so their order is shuffled when an item is built.
 * Newer ones have five, with the order shown fixed by hand in pj and ooo.
 */
export interface VaPara {
  id: string;
  topic: string;
  difficulty: Difficulty;
  /** Core sentences in the right order: four, or five in the newer paragraphs */
  s: string[];
  /** Why each core sentence sits where it does: s[0] is the opener, s[i] follows s[i-1] */
  cues: string[];
  /** Word or phrase in each core sentence that gives its position away, highlighted in review */
  marks: string[];
  /** Words in the core sentences. Newer paragraphs only. */
  wordCount?: number;
  /** Para jumble as shown. show[i] is the number (1-based) of the core sentence at position i + 1; answer is the key, such as "24153". */
  pj?: { show: number[]; answer: string };
  /** Odd sentence out as shown. show[i] is a core sentence number, or 0 for the odd one; answer is the position (1-based) of the odd one; drop is the core sentence left out. */
  ooo?: { show: number[]; answer: number; drop: number };
  odd: string;
  oddWhy: string;
  /** A sentence that belongs in the paragraph at gap insAt (0 = before s[0], s.length = after the last core sentence) */
  ins: string;
  insAt: number;
  insWhy: string;
  /** Four para summary options for the full paragraph. As in RC, the one option without a trap is the answer. */
  sum: [RcOption, RcOption, RcOption, RcOption];
  /** The day this paragraph may join the daily VA rotation. See dailyPick in daily.ts. */
  since?: string;
}

/**
 * What lists, the daily rotation and the redo queue need to know about an RC set, without its text.
 * catalog.gen.ts holds one of these per set, so the full passages can load only when a practice page opens.
 */
/** lead is the opening paragraph's length in characters: the home page reserves that much room while the text loads. */
export interface RcMeta { id: string; title: string; genre: Genre; difficulty: Difficulty; words: number; questions: number; lead: number; since?: string }
export interface VaMeta { id: string; topic: string; difficulty: Difficulty; since?: string }
export interface CrMeta { id: string; type: CrType; difficulty: Difficulty; topic: string }

export function rcMeta(s: RcSet): RcMeta {
  const m: RcMeta = { id: s.id, title: s.title, genre: s.genre, difficulty: s.difficulty, words: setWords(s), questions: s.questions.length, lead: s.paras[0].length };
  if (s.since) m.since = s.since;
  return m;
}
/**
 * A passage's opening paragraph, split before its last sentence. That sentence is usually where
 * the passage turns ("This defence contains a truth and hides a confusion."), so Home highlights it.
 */
export function rcLead(s: RcSet): [string, string] {
  const p = s.paras[0];
  const sents = p.match(/[^.!?]+[.!?]+["”’)]*\s*/g);
  if (!sents || sents.length < 2) return [p, ""];
  const at = p.lastIndexOf(sents[sents.length - 1].trim());
  return [p.slice(0, at).trimEnd(), p.slice(at).trim()];
}
export const crMeta = (c: CrItem): CrMeta => ({ id: c.id, type: c.type, difficulty: c.difficulty, topic: c.topic });
export function vaMeta(p: VaPara): VaMeta {
  const m: VaMeta = { id: p.id, topic: p.topic, difficulty: p.difficulty };
  if (p.since) m.since = p.since;
  return m;
}

/** The whole paragraph as a para summary question shows it: the core sentences with ins in its gap. */
export function paraText(p: VaPara): string {
  const s: string[] = [...p.s];
  s.splice(p.insAt, 0, p.ins);
  return s.join(" ");
}

export const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
export const setWords = (s: RcSet) => s.paras.reduce((n, p) => n + words(p), 0);
