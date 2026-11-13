import { findLine, sentences } from "./sentences";
import { rcVersion, type RcSet } from "./types";

/**
 * What the AI service reads (F35, D100, docs/design/explain-mistake.md): the RC sets as the server needs them to
 * build a prompt from ids alone, so the browser never sends passage text and the endpoint cannot be used as an open
 * model. Sentences are cut here, by the same rule the passage taps use, and deciding lines become sentence references.
 * Written to dist/ai/rc.json at build (scripts/aipack.ts); the content is public in the site's own files already.
 */
export interface AiRcSet {
  id: string;
  v: string;
  title: string;
  /** Sentences per paragraph. */
  paras: string[][];
  /** The model summary, its tone, and the claim and qualifier phrases a good summary keeps (summary feedback, F36). */
  summary?: { model: string; tone: string; claim: string; qualifier: string };
  questions: {
    stem: string;
    answer: number;
    /** Paragraphs that settle it. */
    proof: number[];
    /** Deciding lines as [paragraph, sentence]. */
    lines: [number, number][];
    options: { t: string; why: string; trap?: string }[];
  }[];
}

export function aiPack(sets: RcSet[]): { v: 1; sets: AiRcSet[] } {
  return {
    v: 1,
    sets: sets.map((s) => ({
      id: s.id, v: rcVersion(s), title: s.title,
      paras: s.paras.map(sentences),
      ...(s.summary ? { summary: { model: s.summary.model, tone: s.summary.tone, claim: s.summary.claim, qualifier: s.summary.qualifier } } : {}),
      questions: s.questions.map((q) => ({
        stem: q.stem, answer: q.answer, proof: q.proof,
        lines: (q.lines ?? []).map((l) => findLine(s.paras, l)).filter((r): r is [number, number] => r !== null),
        options: q.options.map((o) => ({ t: o.t, why: o.why, ...(o.trap ? { trap: o.trap } : {}) })),
      })),
    })),
  };
}
