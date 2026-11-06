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

describe("interrupted attempts (D83)", () => {
  it("keeps a break's seconds on each kind of attempt through a round trip, and drops a bad one", () => {
    const raw = {
      rcAttempts: [{ id: "r", d: "2026-11-05", set: "s", mode: "library", ans: [0], c: 1, w: 0, secs: 900, first: 60, away: 7200.4 }],
      vaAttempts: [{ id: "v", d: "2026-11-05", mode: "custom", secs: 90, items: [], away: 3600 }],
      crAttempts: [{ id: "c", d: "2026-11-05", secs: 90, items: [], away: -5 }],
      lrAttempts: [{ id: "l", d: "2026-11-05", set: "s", ans: [], c: 0, w: 0, secs: 900, updatedAt: 1, away: "long" }],
    };
    const st = normalize(JSON.parse(JSON.stringify(raw)));
    expect(st.rcAttempts[0].away).toBe(7200);
    expect(st.vaAttempts[0].away).toBe(3600);
    expect(st.crAttempts[0]).not.toHaveProperty("away");
    expect(st.lrAttempts[0]).not.toHaveProperty("away");
  });
});

describe("the CAT year in about (D87)", () => {
  it("keeps a year and drops anything else", () => {
    expect(normalize({ about: { exam: 2028 } }).about.exam).toBe(2028);
    expect(normalize({ about: { exam: "2028" } }).about.exam).toBeUndefined();
    expect(normalize({ about: { exam: 1999 } }).about.exam).toBeUndefined();
    expect(normalize({ about: { exam: 2027.5 } }).about.exam).toBeUndefined();
  });
});
