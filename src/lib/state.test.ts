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

describe("critical reasoning attempts", () => {
  it("old saves have none", () => {
    expect(blankState().crAttempts).toEqual([]);
    expect(normalize({ settings: {}, days: {} }).crAttempts).toEqual([]);
  });
  it("keep their answers through a save and a restore, with blanks as null", () => {
    const s = blankState();
    s.crAttempts.push({ id: "a", d: "2026-10-17", secs: 90, items: [{ k: "cr:CR-01", a: 2, ok: true }, { k: "cr:CR-02", a: null, ok: false }] });
    expect(normalize(JSON.parse(JSON.stringify(s))).crAttempts).toEqual(s.crAttempts);
  });
  it("turn bad values into safe ones", () => {
    const s = normalize({ crAttempts: [{ id: "a", d: "2026-10-17", secs: "x", items: [{ k: "cr:CR-01", a: "2", ok: 1 }, "junk"] }, "junk"] });
    expect(s.crAttempts).toEqual([{ id: "a", d: "2026-10-17", secs: 0, items: [{ k: "cr:CR-01", a: null, ok: true }] }]);
  });
});
