import type { OptionTrap } from "../data/traps";

export type Genre = "economics" | "philosophy" | "psychology" | "science" | "society" | "literature" | "history";
export const GENRES: Record<Genre, string> = {
  economics: "Economics and business",
  philosophy: "Philosophy",
  psychology: "Psychology",
  science: "Science and ecology",
  society: "Society and technology",
  literature: "Literature and art",
  history: "History",
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
}

/**
 * One authored paragraph. Each one yields three VA items:
 * a para jumble (the four core sentences), an odd sentence out (core plus odd),
 * and a sentence insertion (core with ins taken out at insAt).
 */
export interface VaPara {
  id: string;
  topic: string;
  difficulty: Difficulty;
  /** Core sentences in the right order */
  s: [string, string, string, string];
  /** Why each core sentence sits where it does: s[0] is the opener, s[i] follows s[i-1] */
  cues: [string, string, string, string];
  /** Word or phrase in each core sentence that gives its position away, highlighted in review */
  marks: [string, string, string, string];
  odd: string;
  oddWhy: string;
  /** A fifth sentence that belongs in the paragraph at gap insAt (0 = before s[0], 4 = after s[3]) */
  ins: string;
  insAt: 0 | 1 | 2 | 3 | 4;
  insWhy: string;
}

export const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
export const setWords = (s: RcSet) => s.paras.reduce((n, p) => n + words(p), 0);
