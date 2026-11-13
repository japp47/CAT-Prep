import { sentences } from "./sentences";
import { rcVersion, type RcSet } from "./types";

/**
 * What the AI service reads (F36, D101, D105; docs/design/explain-mistake.md): each RC set's passage, cut into
 * sentences by the rule the passage taps use, and its model summary, so the server builds the summary prompts from
 * published content. No questions and no answer keys: "Explain my mistake", the only feature that read them, was
 * removed (D105), and a public file should not carry every key. Written to dist/ai/rc.json at build
 * (scripts/aipack.ts).
 */
export interface AiRcSet {
  id: string;
  v: string;
  title: string;
  /** Sentences per paragraph. */
  paras: string[][];
  /** The model summary, its tone, and the claim and qualifier phrases a good summary keeps. */
  summary: { model: string; tone: string; claim: string; qualifier: string };
}

/** Only sets with a model summary: the service has nothing to do with the rest. */
export function aiPack(sets: RcSet[]): { v: 1; sets: AiRcSet[] } {
  return {
    v: 1,
    sets: sets.filter((s) => s.summary).map((s) => ({
      id: s.id, v: rcVersion(s), title: s.title,
      paras: s.paras.map(sentences),
      summary: { model: s.summary!.model, tone: s.summary!.tone, claim: s.summary!.claim, qualifier: s.summary!.qualifier },
    })),
  };
}
