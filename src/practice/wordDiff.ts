/**
 * Word by word, what changed between a student's summary and the smallest fix of it (F36b, D103), so the site can
 * strike out what went and mark what came in. Words are compared without case or punctuation, as the server counts
 * the edit; each part keeps its own spelling.
 */
export interface DiffPart { t: string; op: "same" | "add" | "del" }

const key = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

export function diffWords(before: string, after: string): DiffPart[] {
  const a = before.trim().split(/\s+/).filter(Boolean), b = after.trim().split(/\s+/).filter(Boolean);
  // Longest common subsequence over the words, then walked from the front.
  const L = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = key(a[i]) === key(b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (t: string, op: DiffPart["op"]) => { const last = out[out.length - 1]; if (last?.op === op) last.t += " " + t; else out.push({ t, op }); };
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (key(a[i]) === key(b[j])) { push(b[j], "same"); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) push(a[i++], "del");
    else push(b[j++], "add");
  }
  while (i < a.length) push(a[i++], "del");
  while (j < b.length) push(b[j++], "add");
  return out;
}
