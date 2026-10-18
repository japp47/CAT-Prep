import { describe, expect, it } from "vitest";
import { DEFAULT_TARGET } from "../data/percentiles";
import { blankState, normalize } from "./state";

describe("target percentile", () => {
  it("starts at the default and old saves without one get it too", () => {
    expect(blankState().targets.varc).toBe(DEFAULT_TARGET);
    expect(normalize({ settings: {}, days: {}, mocks: [] }).targets.varc).toBe(DEFAULT_TARGET);
  });
  it("keeps a valid target through a save and a restore", () => {
    const s = blankState();
    s.targets.varc = 95;
    expect(normalize(JSON.parse(JSON.stringify(s))).targets.varc).toBe(95);
  });
  it("drops a target that is not one of the choices", () => {
    for (const bad of [42, 99.9, "high", null, -1]) expect(normalize({ targets: { varc: bad } }).targets.varc).toBe(DEFAULT_TARGET);
    expect(normalize({ targets: "99" }).targets.varc).toBe(DEFAULT_TARGET);
  });
});
