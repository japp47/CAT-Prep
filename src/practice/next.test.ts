import { describe, expect, it } from "vitest";
import { blankState } from "../lib/state";
import { RC_CATALOG } from "./catalog.gen";
import { rcOfDay } from "./daily";
import { nextSteps } from "./next";

const T = "2026-10-21";

describe("next step", () => {
  it("puts a sectional in progress first", () => {
    expect(nextSteps(blankState(), T, { sectionalMinsLeft: 23 })[0]).toMatchObject({ key: "sectional", mins: 23 });
  });
  it("puts this week's focus before the daily sets, until it is done today", () => {
    const st = blankState();
    st.recs.push({ id: "r", d: "2026-10-18", updatedAt: 1, from: "week", sec: "VARC", skill: { kind: "type", key: "RC" }, text: "Two RC sets untimed", why: "", status: "open", to: "/practice/library" });
    st.weekReviews.push({ id: "2026-10-12", d: "2026-10-18", updatedAt: 1, focus: "r", days: [], closed: true });
    expect(nextSteps(st, T)[0]).toMatchObject({ key: "focus", to: "/practice/library" });
    st.weekReviews[0].days = [T];
    expect(nextSteps(st, T)[0].key).not.toBe("focus");
  });
  it("needs five redo questions due before the queue comes first", () => {
    const st = blankState();
    for (let i = 0; i < 4; i++) st.redo.push({ k: `rc:${RC_CATALOG[i].id}:0`, added: T, due: T, box: 0, tries: 0 });
    expect(nextSteps(st, T)[0].key).toBe("rc");
    st.redo.push({ k: `rc:${RC_CATALOG[5].id}:0`, added: T, due: T, box: 0, tries: 0 });
    expect(nextSteps(st, T)[0]).toMatchObject({ key: "redo", title: "Redo 5 questions you missed" });
  });
  it("never suggests a daily set already done today", () => {
    const st = blankState();
    st.rcAttempts.push({ id: "a", d: T, set: rcOfDay(T).id, mode: "daily", ans: [], c: 0, w: 0, secs: 0, first: 0 });
    st.vaAttempts.push({ id: "b", d: T, mode: "daily", items: [], secs: 0 });
    const keys = nextSteps(st, T).map((s) => s.key);
    expect(keys).not.toContain("rc");
    expect(keys).not.toContain("va");
  });
  it("always has one step, every step has a time and a reason", () => {
    const steps = nextSteps(blankState(), T);
    expect(steps.length).toBeGreaterThan(0);
    steps.forEach((s) => { expect(s.mins).toBeGreaterThan(0); expect(s.why.length).toBeGreaterThan(5); });
  });
});
