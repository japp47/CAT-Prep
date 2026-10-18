import { describe as suite, expect, it } from "vitest";
import { VARC_TABLES } from "../data/percentiles";
import { describe, estimate, grid, GRID_ACCURACY, GRID_ATTEMPTS, marks, marksAt, marksNeeded, needs, ordinal, pctText, percentileAt, rightNeeded, targetBand } from "./percentile";

const table = (year: string) => VARC_TABLES.find((t) => t.year === year)!;
const [t24, t25] = [table("2024"), table("2025")];

suite("percentile tables", () => {
  it("rise with the score, so a higher score never has a lower percentile", () => {
    for (const t of VARC_TABLES) {
      const p = [...t.points].sort((a, b) => a.score - b.score);
      p.slice(1).forEach((x, i) => { expect(x.pct, t.year).toBeGreaterThan(p[i].pct); });
    }
  });
});

suite("percentileAt and marksAt", () => {
  it("return the published percentile at a published score", () => {
    expect(percentileAt(t24, 30).pct).toBe(95);
    expect(percentileAt(t24, 24).pct).toBe(90);
  });
  it("read in a straight line between two points", () => {
    expect(percentileAt(t24, 27).pct).toBeCloseTo(92.5, 5);
  });
  it("say which end of the table a score is past", () => {
    expect(percentileAt(t24, 10)).toEqual({ pct: 75, edge: "below" });
    expect(percentileAt(t25, 5)).toEqual({ pct: 60, edge: "below" });
    expect(percentileAt(t24, 60)).toEqual({ pct: 99.9, edge: "above" });
  });
  it("marksAt is the inverse of percentileAt inside the table", () => {
    for (const score of [16, 20, 25, 31, 38, 42, 50]) expect(marksAt(t24, percentileAt(t24, score).pct)).toBeCloseTo(score, 5);
  });
});

suite("estimate", () => {
  it("gives a range over the three years", () => {
    const e = estimate(30);
    expect(e.high).toBeCloseTo(95.47, 1);
    expect(e.low).toBeCloseTo(93.08, 1);
    expect(e.each.map((x) => x.year)).toEqual(["2023", "2024", "2025"]);
  });
  it("leaves out a table that does not reach the score", () => {
    const e = estimate(13);
    expect(e.below).toBeUndefined();
    expect(e.each.find((x) => x.year === "2024")?.edge).toBe("below");
    expect(e.low).toBe(e.high);
  });
  it("says below or above when every table agrees", () => {
    expect(estimate(5).below).toBe(true);
    expect(describe(estimate(5))).toBe("below the 80th percentile");
    expect(estimate(70).above).toBe(true);
  });
  it("is written in words a student can read", () => {
    expect(describe(estimate(30))).toBe("about the 93rd to 95th percentile");
    expect(describe(estimate(24.0001 + 0))).toMatch(/^about the \d+(st|nd|rd|th)( to \d+(st|nd|rd|th))? percentile$/);
  });
});

suite("pctText", () => {
  it("writes whole percentiles plainly and keeps one decimal only above 99", () => {
    expect([84.4, 97.6, 99, 99.04, 99.46, 99.93].map(pctText)).toEqual(["84", "98", "99", "99", "99.5", "99.9"]);
  });
});

suite("ordinal", () => {
  it("handles 1st, 2nd, 3rd and the teens", () => {
    expect(["1", "2", "3", "4", "11", "12", "13", "21", "22", "93", "95", "99.4"].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "93rd", "95th", "99.4th"]);
  });
});

suite("target", () => {
  it("asks for more marks at a higher percentile", () => {
    const m = [90, 95, 97, 99].map((p) => marksNeeded(p).mid);
    expect(m).toEqual([...m].sort((a, b) => a - b));
    expect(new Set(m).size).toBe(4);
  });
  it("puts the 99th percentile at 41 marks and the band at 15 to 17 correct, as the chart always showed", () => {
    expect(marksNeeded(99).mid).toBe(41);
    expect(targetBand(99)).toEqual([15, 17]);
  });
  it("lowers the band for a lower target and keeps it inside the question count", () => {
    expect(targetBand(90)).toEqual([9, 11]);
    expect(targetBand(99.9, 24)[1]).toBeLessThanOrEqual(24);
  });
  it("counts the right answers needed, with each wrong answer costing a mark", () => {
    expect(rightNeeded(42, 20)).toBe(16);
    expect(marks(16, 4)).toBe(44);
    expect(rightNeeded(42, 10)).toBeNull();
    // Whatever the target, the count found really reaches it and one fewer does not.
    for (const a of GRID_ATTEMPTS) {
      const c = rightNeeded(30, a);
      if (c === null) continue;
      expect(marks(c, a - c)).toBeGreaterThanOrEqual(30);
      expect(marks(c - 1, a - c + 1)).toBeLessThan(30);
    }
  });
});

suite("needs", () => {
  it("gives the marks range, the middle figure and ways to reach it", () => {
    const n = needs(99);
    expect([n.low, n.high, n.mid]).toEqual([40, 44, 41]);
    expect(n.ways).toEqual([{ attempted: 16, right: 15 }, { attempted: 18, right: 15 }, { attempted: 20, right: 16 }]);
    n.ways.forEach((w) => expect(marks(w.right, w.attempted - w.right)).toBeGreaterThanOrEqual(n.mid));
  });
  it("leaves out an attempt count that cannot reach the marks", () => {
    expect(needs(99.9).ways.every((w) => w.right <= w.attempted)).toBe(true);
  });
});

suite("attempts and accuracy grid", () => {
  const g = grid();
  it("has a row per number attempted and a cell per accuracy", () => {
    expect(g).toHaveLength(GRID_ATTEMPTS.length);
    g.forEach((row) => expect(row.map((c) => c.accuracy)).toEqual([...GRID_ACCURACY]));
  });
  it("scores each cell as 3 per right answer and -1 per wrong one", () => {
    const cell = g[GRID_ATTEMPTS.indexOf(20)][GRID_ACCURACY.indexOf(80)];
    expect(cell).toMatchObject({ correct: 16, score: 44 });
    expect(cell.est.high).toBeGreaterThan(99);
  });
  it("never gives a lower percentile for more attempts at the same accuracy", () => {
    for (let c = 0; c < GRID_ACCURACY.length; c++) for (let r = 1; r < g.length; r++) expect(g[r][c].est.high).toBeGreaterThanOrEqual(g[r - 1][c].est.high);
  });
});
