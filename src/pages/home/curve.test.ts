import { describe, expect, it } from "vitest";
import { curveColumns, ordinal, percentileAt, Z99 } from "./curve";

describe("the home page score curve", () => {
  it("reads percentiles off the curve", () => {
    expect(percentileAt(0)).toBe(50);
    expect(percentileAt(Z99)).toBe(99);
    expect(percentileAt(1)).toBe(84);
    expect(percentileAt(-9)).toBe(1);
  });

  it("is tallest in the middle and symmetric", () => {
    const c = curveColumns(41, 20);
    expect(c[20].n).toBe(20);
    expect(c[0].n).toBe(c[40].n);
    expect(c[30].n).toBeLessThan(c[25].n);
  });

  it("writes ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 50, 99].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "50th", "99th"]);
  });
});
