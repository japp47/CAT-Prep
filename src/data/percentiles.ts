/**
 * VARC score against percentile, for the estimator in Progress, the target in Plan and the benchmark text on the VARC page.
 *
 * The IIMs publish no table that turns a score into a percentile. Coaching institutes publish estimates built from
 * the scorecards students share after the results. For each of CAT 2023, 2024 and 2025 we keep the tables of
 * three of them (two for 2023 where a third is missing), and every figure below is copied as printed.
 * A year's table is the average, percentile by percentile, of the sources that print that percentile.
 *
 * Rules for adding a source:
 * - It must be built from the results. Pre-exam "expected" tables are left out: for 2025 they put the 99th percentile
 *   at 40 to 42 marks, against 44 in every table built from results.
 * - A site that only repeats another site's numbers (InsideIIM and LPT repeat IMS and Cracku for 2024) counts once.
 * - Only exams with the current paper (24 questions, 40 minutes) are used, which is 2022 onwards.
 * Checked 18 Oct 2026. Add CAT 2026 as a new year when its results are out.
 */
export interface PctPoint { pct: number; score: number }
export interface PctSource { name: string; url: string; /** [percentile, scaled VARC marks] */ points: [number, number][] }
export interface PctYear { year: string; sources: PctSource[] }
export interface PctTable { year: string; sources: { name: string; url: string }[]; points: PctPoint[] }

const CRACKU = "https://cracku.in/cat-score-vs-percentile-";
const IMS = { name: "IMS", url: "https://www.imsindia.com/blog/cat/cat-score-vs-percentile/" };
const IQUANTA = { name: "iQuanta", url: "https://www.iquanta.in/blog/cat-score-vs-percentile-trend/" };

export const VARC_SOURCES: PctYear[] = [
  {
    year: "2023",
    sources: [
      { name: "Cracku", url: CRACKU + "2023/", points: [[99.9, 51.14], [99.5, 44], [99, 39.83], [95, 28.78], [90, 23.37], [80, 17.58]] },
      { ...IMS, points: [[99, 39], [98, 33], [95, 30], [90, 23], [85, 20], [80, 17]] },
      { ...IQUANTA, points: [[99.9, 51], [99.5, 44], [99, 40], [98, 35], [95, 29], [90, 23]] },
    ],
  },
  {
    year: "2024",
    sources: [
      { name: "Cracku", url: CRACKU + "2024/", points: [[99.9, 55], [99.5, 44], [99, 40.3], [97, 33.54], [95, 30], [90, 24], [85, 20.42], [80, 18.2], [75, 15.6]] },
      { ...IMS, points: [[99, 41], [98, 36], [95, 30], [90, 24], [85, 20], [80, 18]] },
      { ...IQUANTA, points: [[99.9, 55], [99.5, 44], [99, 41], [98, 36], [95, 30], [90, 24]] },
    ],
  },
  {
    year: "2025",
    sources: [
      { name: "Cracku", url: CRACKU + "2026/", points: [[99.9, 53], [99.5, 48], [99, 44], [95, 32.5], [90, 26], [85, 22], [80, 19], [60, 11]] },
      { ...IMS, points: [[99, 44], [98, 39], [95, 32], [90, 26], [85, 23], [80, 19]] },
      { ...IQUANTA, points: [[99.9, 53], [99.5, 48], [99, 44], [98, 39], [95, 33], [90, 26]] },
    ],
  },
];

/** One table per year: at each percentile, the average of the marks the sources print for it. */
export function averageTable(y: PctYear): PctTable {
  const byPct = new Map<number, number[]>();
  y.sources.forEach((s) => s.points.forEach(([pct, score]) => byPct.set(pct, [...(byPct.get(pct) ?? []), score])));
  const points = [...byPct].map(([pct, xs]) => ({ pct, score: xs.reduce((a, b) => a + b, 0) / xs.length })).sort((a, b) => b.pct - a.pct);
  return { year: y.year, sources: y.sources.map(({ name, url }) => ({ name, url })), points };
}

export const VARC_TABLES: PctTable[] = VARC_SOURCES.map(averageTable);

/** A table's marks at a percentile it prints exactly, such as 99 or 99.9. */
export const scoreAt = (t: PctTable, pct: number): number | undefined => t.points.find((p) => p.pct === pct)?.score;

/** Marks to one decimal place, without a trailing ".0": 44, 40.8. */
export const marksText = (n: number) => String(Math.round(n * 10) / 10);

/** "2023, 2024 and 2025". */
export const joinAnd = (xs: string[]) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);

/** The marks a percentile took in each year, written out for the VARC page, the updates and the sectional rules. */
export function benchmark(pct: number) {
  const scores = VARC_TABLES.map((t) => scoreAt(t, pct) ?? NaN);
  return {
    years: joinAnd(VARC_TABLES.map((t) => t.year)),
    values: joinAnd(scores.map(marksText)),
    /** A safe aim: the highest of the years, rounded up. */
    safe: Math.ceil(Math.max(...scores)),
    sources: joinAnd([...new Set(VARC_TABLES.flatMap((t) => t.sources.map((s) => s.name)))]),
  };
}

export { DEFAULT_TARGET, TARGET_CHOICES } from "./targets";
