/**
 * A passage's lines, for "Prove it from the passage" (F103): what a student taps and what a question's `lines` quote.
 * A sentence ends at ".", "?" or "!" (with any closing quote or bracket) before a space and a capital letter, an
 * opening quote or a digit, unless the word before the stop is a known abbreviation. Content tests hold every `lines`
 * quote to exactly one sentence of its paragraph under this rule, so the tap targets and the answer key never drift.
 */

const ABBREV = /(?:\b(?:e\.g|i\.e|etc|vs|cf|al|Mr|Mrs|Ms|Dr|St|Prof|No|Fig|U\.S|U\.K)|\b[A-Z])$/;

/** The sentences of one paragraph, in order, each trimmed. */
export function sentences(paragraph: string): string[] {
  const out: string[] = [];
  const re = /[.?!]["”’)\]]*\s+(?=["“‘(]?[A-Z0-9])/g;
  let from = 0;
  for (let m = re.exec(paragraph); m; m = re.exec(paragraph)) {
    const end = m.index + m[0].trimEnd().length;
    const head = paragraph.slice(from, m.index);
    if (ABBREV.test(head)) continue;
    out.push(paragraph.slice(from, end).trim());
    from = m.index + m[0].length;
  }
  const rest = paragraph.slice(from).trim();
  if (rest) out.push(rest);
  return out;
}

/** A tapped line: its paragraph and its sentence, both 0-based. */
export type LineRef = [p: number, s: number];

/** Where an exact sentence sits in a passage, or null when it is not one whole sentence of it. */
export function findLine(paras: string[], quote: string): LineRef | null {
  for (let p = 0; p < paras.length; p++) {
    const s = sentences(paras[p]).indexOf(quote.trim());
    if (s >= 0) return [p, s];
  }
  return null;
}

/** What a student's tapped line shows, against the question's deciding lines and proof paragraphs. */
export type LineVerdict = "proves" | "near" | "off";

export function lineVerdict(paras: string[], deciding: string[], proof: number[], tapped: LineRef): LineVerdict {
  const refs = deciding.map((q) => findLine(paras, q)).filter((r): r is LineRef => r !== null);
  if (refs.some(([p, s]) => p === tapped[0] && s === tapped[1])) return "proves";
  return proof.includes(tapped[0]) || refs.some(([p]) => p === tapped[0]) ? "near" : "off";
}
