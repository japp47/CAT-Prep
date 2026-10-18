import { shuffle } from "../random";
import type { VaPara } from "../types";

export type VaKind = "ps" | "pj" | "oso" | "si";
export const VA_KIND: Record<VaKind, { label: string; practice: string; tita: boolean; how: string }> = {
  ps: { label: "Para summary", practice: "Para summary", tita: false, how: "Read the paragraph, then choose the option that best captures its essence." },
  pj: { label: "Para jumble", practice: "Para jumble", tita: true, how: "The sentences below come from one paragraph, in a jumbled order. Type the right sequence of their numbers, for example 3142 for four sentences." },
  oso: { label: "Odd sentence out", practice: "Odd sentence out", tita: true, how: "Four of the five sentences below form a coherent paragraph. Type the number of the sentence that does not belong." },
  si: { label: "Sentence insertion", practice: "Sentence insertion", tita: false, how: "The sentence in the box is missing from the paragraph. Choose the gap where it fits best." },
};

export interface VaItem {
  key: string;
  kind: VaKind;
  para: VaPara;
  /** pj and oso: sentences in the order shown. Index into para.s, or -1 for the odd sentence. ps: options in the order shown, as indexes into para.sum. */
  order: number[];
  /** si: the four gap positions offered, in reading order (0 = before the first sentence) */
  gaps: number[];
  /** "3142" for pj, "4" for oso, "2" for si and ps (option B) */
  answer: string;
}

const isIdentity = (p: number[]) => p.every((v, i) => v === i);

export function buildItem(kind: VaKind, para: VaPara): VaItem {
  const key = kind + ":" + para.id;
  if (kind === "pj") {
    if (para.pj) return { key, kind, para, order: para.pj.show.map((n) => n - 1), gaps: [], answer: para.pj.answer };
    const idx = para.s.map((_, i) => i);
    let order = shuffle(idx, key);
    if (isIdentity(order)) order = [...order.slice(1), order[0]];
    const answer = idx.map((ci) => order.indexOf(ci) + 1).join("");
    return { key, kind, para, order, gaps: [], answer };
  }
  if (kind === "ps") {
    const order = shuffle([0, 1, 2, 3], key);
    return { key, kind, para, order, gaps: [], answer: String(order.indexOf(para.sum.findIndex((o) => !o.trap)) + 1) };
  }
  if (kind === "oso") {
    if (para.ooo) return { key, kind, para, order: para.ooo.show.map((n) => n - 1), gaps: [], answer: String(para.ooo.answer) };
    const order = shuffle([0, 1, 2, 3, -1], key);
    return { key, kind, para, order, gaps: [], answer: String(order.indexOf(-1) + 1) };
  }
  // Four gaps are offered: the right one and three others, out of the s.length + 1 places the sentence could go.
  const places = para.s.map((_, i) => i).concat(para.s.length);
  const wrong = shuffle(places.filter((g) => g !== para.insAt), key);
  const gaps = places.filter((g) => g === para.insAt || !wrong.slice(0, places.length - 4).includes(g));
  return { key, kind, para, order: para.s.map((_, i) => i), gaps, answer: String(gaps.indexOf(para.insAt) + 1) };
}

export const sentenceAt = (item: VaItem, i: number) => (item.order[i] < 0 ? item.para.odd : item.para.s[item.order[i]]);

/** Keeps only digits, as the CAT answer box does. */
export const cleanAnswer = (raw: string) => raw.replace(/\D/g, "");

export function scoreItem(item: VaItem, raw: string): { ok: boolean; pts: number; blank: boolean } {
  const a = cleanAnswer(raw);
  if (!a) return { ok: false, pts: 0, blank: true };
  const ok = a === item.answer;
  return { ok, pts: ok ? 3 : VA_KIND[item.kind].tita ? 0 : -1, blank: false };
}

export function parseKey(key: string, paras: VaPara[]): VaItem | null {
  const [kind, id] = key.split(":");
  const para = paras.find((p) => p.id === id);
  if (!para || !(kind in VA_KIND)) return null;
  return buildItem(kind as VaKind, para);
}

/** The option shown at position i (0-based) of a para summary item. */
export const sumAt = (item: VaItem, i: number) => item.para.sum[item.order[i]];

/** How a stored answer reads to the student: a letter for para summary, the number otherwise. */
export const answerLabel = (item: VaItem, a: string) => (item.kind === "ps" && a ? "ABCD"[+a - 1] ?? a : a);

/** Daily VA set: 2 of each type, the mix CAT used in 2023 and 2025. */
export const DAILY_MIX: VaKind[] = ["ps", "ps", "si", "si", "oso", "oso", "pj", "pj"];
export const VA_KINDS = Object.keys(VA_KIND) as VaKind[];

/** A custom drill. Items the student has not seen yet come first. */
export function customDrill(paras: VaPara[], kind: VaKind | "mix", n: number, seed: string, seen: Set<string>): VaItem[] {
  const order = shuffle(paras, seed);
  const out: VaItem[] = [];
  const pool = order.map((p, i) => buildItem(kind === "mix" ? VA_KINDS[i % VA_KINDS.length] : kind, p));
  pool.sort((a, b) => Number(seen.has(a.key)) - Number(seen.has(b.key)));
  for (const it of pool) { if (out.length >= n) break; out.push(it); }
  return out;
}
