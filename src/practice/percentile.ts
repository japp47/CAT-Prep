import { VARC_TABLES, type PctTable } from "../data/percentiles";

/** CAT VARC has 24 questions: 8 VA and 16 RC. */
export const VARC_QS = 24;

/** The marks for `correct` right and `wrong` wrong answers, with -1 for every wrong one (as for an MCQ). */
export const marks = (correct: number, wrong: number) => 3 * correct - wrong;

const asc = (t: PctTable) => [...t.points].sort((a, b) => a.score - b.score);

/**
 * The percentile a score reaches in one table, read between the published points in a straight line.
 * Outside the table's range the nearest end is returned, with `edge` saying which end.
 */
export function percentileAt(t: PctTable, score: number): { pct: number; edge?: "below" | "above" } {
  const p = asc(t);
  if (score <= p[0].score) return { pct: p[0].pct, edge: "below" };
  const top = p[p.length - 1];
  if (score >= top.score) return { pct: top.pct, edge: "above" };
  const i = p.findIndex((x) => x.score > score);
  const lo = p[i - 1], hi = p[i];
  return { pct: lo.pct + ((score - lo.score) / (hi.score - lo.score)) * (hi.pct - lo.pct) };
}

/** The marks one table puts at a percentile. Outside the table's range the nearest end is returned. */
export function marksAt(t: PctTable, pct: number): number {
  const p = asc(t);
  if (pct <= p[0].pct) return p[0].score;
  const top = p[p.length - 1];
  if (pct >= top.pct) return top.score;
  const i = p.findIndex((x) => x.pct > pct);
  const lo = p[i - 1], hi = p[i];
  return lo.score + ((pct - lo.pct) / (hi.pct - lo.pct)) * (hi.score - lo.score);
}

export interface Estimate {
  /** Lowest and highest percentile across the tables that cover the score. */
  low: number;
  high: number;
  /** Set when the score is under every table; `high` is then the highest of the tables' lowest percentiles. */
  below?: boolean;
  /** Set when the score is over every table. */
  above?: boolean;
  /** The percentile in each table, for showing the sources side by side. */
  each: { year: string; pct: number; edge?: "below" | "above" }[];
}

/** A score's percentile as a range over the tables. Tables that do not reach the score are left out of the range. */
export function estimate(score: number, tables: PctTable[] = VARC_TABLES): Estimate {
  const each = tables.map((t) => ({ year: t.year, ...percentileAt(t, score) }));
  const real = each.filter((e) => !e.edge);
  if (real.length) return { low: Math.min(...real.map((e) => e.pct)), high: Math.max(...real.map((e) => e.pct)), each };
  if (each.every((e) => e.edge === "below")) return { low: 0, high: Math.max(...each.map((e) => e.pct)), below: true, each };
  if (each.every((e) => e.edge === "above")) return { low: 99.9, high: 99.9, above: true, each };
  return { low: Math.min(...each.map((e) => e.pct)), high: Math.max(...each.map((e) => e.pct)), each };
}

/** A percentile as written for students: 99.9, 99.4, 97, 85. */
export const pctText = (n: number) => (n >= 99.9 ? "99.9" : n >= 99 ? String(Math.round(n * 10) / 10) : String(Math.round(n)));

/** 1st, 2nd, 3rd, 4th, 11th, 93rd. Decimals such as 99.4 end in "th". */
export function ordinal(text: string): string {
  const n = Number(text);
  if (!Number.isInteger(n)) return text + "th";
  const last = n % 10, teen = n % 100 >= 11 && n % 100 <= 13;
  return text + (teen ? "th" : last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th");
}

/** "about the 93rd to 95th percentile", "about the 95th percentile" or "below the 60th percentile". */
export function describe(e: Estimate): string {
  if (e.below) return `below the ${ordinal(pctText(e.high))} percentile`;
  if (e.above) return "the 99.9th percentile or better";
  const a = pctText(e.low), b = pctText(e.high);
  return a === b ? `about the ${ordinal(a)} percentile` : `about the ${ordinal(a)} to ${ordinal(b)} percentile`;
}

/** The marks each table asks for at a percentile, and the middle of them. */
export function marksNeeded(pct: number, tables: PctTable[] = VARC_TABLES) {
  const each = tables.map((t) => marksAt(t, pct));
  return { low: Math.min(...each), high: Math.max(...each), mid: Math.round(each.reduce((s, x) => s + x, 0) / each.length) };
}

/**
 * The band of correct answers drawn on the mock chart for a target: the fewest right answers that reach the
 * target marks with 3 wrong, and 2 more. For the 99th percentile this is 15 to 17 of 24.
 */
export function targetBand(pct: number, maxQ = VARC_QS, tables: PctTable[] = VARC_TABLES): [number, number] {
  const from = Math.min(Math.ceil((marksNeeded(pct, tables).mid + 3) / 3), maxQ);
  return [from, Math.min(from + 2, maxQ)];
}

/** How many of `attempted` must be right to score `target` marks, counting each wrong answer as -1. Null when even all right is not enough. */
export function rightNeeded(target: number, attempted: number): number | null {
  const c = Math.max(0, Math.ceil((target + attempted) / 4));
  return c <= attempted ? c : null;
}

/** What a target means in practice: the marks it took in recent years, and a few ways to reach the middle figure. */
export function needs(pct: number, tables: PctTable[] = VARC_TABLES) {
  const m = marksNeeded(pct, tables);
  const ways = ([16, 18, 20] as const).flatMap((attempted) => { const right = rightNeeded(m.mid, attempted); return right === null ? [] : [{ attempted, right }]; });
  return { low: Math.round(m.low), high: Math.round(m.high), mid: m.mid, ways };
}

export const GRID_ATTEMPTS = [12, 14, 16, 18, 20, 22] as const;
export const GRID_ACCURACY = [70, 75, 80, 85, 90, 95] as const;

export interface GridCell { attempted: number; accuracy: number; correct: number; score: number; est: Estimate }

/** For each number attempted and accuracy, the marks and percentile it gives. A wrong answer costs 1 mark here, which is the worst case. */
export function grid(tables: PctTable[] = VARC_TABLES): GridCell[][] {
  return GRID_ATTEMPTS.map((attempted) => GRID_ACCURACY.map((accuracy) => {
    const correct = Math.round((attempted * accuracy) / 100);
    const score = marks(correct, attempted - correct);
    return { attempted, accuracy, correct, score, est: estimate(score, tables) };
  }));
}
