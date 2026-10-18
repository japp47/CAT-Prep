import { describe, expect, it } from "vitest";
import { averageTable, benchmark, scoreAt, VARC_SOURCES, VARC_TABLES } from "./percentiles";
import { BENCHMARKS } from "./stories";

describe("published sources", () => {
  it("has at least two independent sources for every year", () => {
    VARC_SOURCES.forEach((y) => expect(new Set(y.sources.map((s) => s.name)).size, y.year).toBeGreaterThanOrEqual(2));
  });
  it("keeps every source rising: a higher percentile never needs fewer marks", () => {
    VARC_SOURCES.forEach((y) => y.sources.forEach((s) => {
      const p = [...s.points].sort((a, b) => a[0] - b[0]);
      p.slice(1).forEach((x, i) => expect(x[1], `${y.year} ${s.name} ${x[0]}`).toBeGreaterThan(p[i][1]));
    }));
  });
  it("agrees within 2.5 marks wherever two sources print the same percentile, which catches a mistyped figure", () => {
    VARC_SOURCES.forEach((y) => {
      const at = new Map<number, number[]>();
      y.sources.forEach((s) => s.points.forEach(([pct, score]) => at.set(pct, [...(at.get(pct) ?? []), score])));
      at.forEach((xs, pct) => expect(Math.max(...xs) - Math.min(...xs), `${y.year} at ${pct}`).toBeLessThanOrEqual(2.5));
    });
  });
  it("uses a different link for each source and ties each to https", () => {
    VARC_SOURCES.forEach((y) => {
      expect(new Set(y.sources.map((s) => s.url)).size).toBe(y.sources.length);
      y.sources.forEach((s) => expect(s.url).toMatch(/^https:\/\//));
    });
  });
});

describe("yearly tables", () => {
  it("average the sources that print each percentile", () => {
    const t25 = VARC_TABLES.find((t) => t.year === "2025")!;
    expect(scoreAt(t25, 99)).toBe(44);
    expect(scoreAt(t25, 95)).toBeCloseTo((32.5 + 32 + 33) / 3, 10);
    expect(scoreAt(t25, 60)).toBe(11);
    const t24 = VARC_TABLES.find((t) => t.year === "2024")!;
    expect(scoreAt(t24, 99)).toBeCloseTo((40.3 + 41 + 41) / 3, 10);
    expect(scoreAt(t24, 97)).toBe(33.54);
  });
  it("rise with the percentile and list the most selective first", () => {
    VARC_TABLES.forEach((t) => {
      expect(t.points.map((p) => p.pct)).toEqual([...t.points.map((p) => p.pct)].sort((a, b) => b - a));
      t.points.slice(1).forEach((p, i) => expect(p.score, t.year).toBeLessThan(t.points[i].score));
    });
  });
  it("can be built from any set of sources", () => {
    const t = averageTable({ year: "x", sources: [{ name: "A", url: "https://a", points: [[99, 40], [90, 20]] }, { name: "B", url: "https://b", points: [[99, 42]] }] });
    expect(t.points).toEqual([{ pct: 99, score: 41 }, { pct: 90, score: 20 }]);
  });
});

describe("text built from the tables", () => {
  it("writes out the 99 percentile for every year, with a safe aim", () => {
    expect(benchmark(99)).toEqual({ years: "2023, 2024 and 2025", values: "39.6, 40.8 and 44", safe: 44, sources: "Cracku, IMS and iQuanta" });
  });
  it("fills the benchmark table on the VARC page, newest year first", () => {
    expect(BENCHMARKS.map((b) => b.year)).toEqual(["2025", "2024", "2023"]);
    expect(BENCHMARKS[0]).toMatchObject({ p99: "44", p999: "53", src: "Average of Cracku, IMS and iQuanta" });
  });
});
