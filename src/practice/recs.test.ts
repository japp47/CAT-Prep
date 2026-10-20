import { describe, expect, it } from "vitest";
import { blankState, type AppState, type Recommendation } from "../lib/state";
import { measure, readiness, tracked, trend } from "./recs";

const rec = (p: Partial<Recommendation> = {}): Recommendation => ({ id: "r", d: "2026-10-01", updatedAt: 1, from: "mock", sec: "VARC", skill: { kind: "type", key: "Para jumble" }, text: "Drill", why: "", status: "open", before: { c: 4, n: 10 }, ...p });
const row = (st: AppState, d: string, t: string, a: number, c: number) => st.practice.push({ id: d + t + a + c, d, sec: "VARC", t, a, c, src: "" });

describe("did the advice help", () => {
  it("is too early to tell under 12 questions since", () => {
    const st = blankState(); row(st, "2026-10-05", "Para jumble", 8, 8);
    expect(measure(st, rec())).toMatchObject({ state: "early", n: 8, before: 40 });
  });
  it("calls it fixed only with a rise of 15 points or more on 12 or more questions", () => {
    const st = blankState(); row(st, "2026-10-05", "Para jumble", 12, 7); // 58%, +18
    expect(measure(st, rec()).state).toBe("fixed");
    const st2 = blankState(); row(st2, "2026-10-05", "Para jumble", 12, 6); // 50%, +10
    expect(measure(st2, rec()).state).toBe("better");
    const st3 = blankState(); row(st3, "2026-10-05", "Para jumble", 12, 5); // 42%
    expect(measure(st3, rec()).state).toBe("notyet");
  });
  it("counts only practice after the day it was picked", () => {
    const st = blankState(); row(st, "2026-10-01", "Para jumble", 20, 20); row(st, "2026-09-20", "Para jumble", 20, 20);
    expect(measure(st, rec()).n).toBe(0);
  });
  it("does not measure advice that is not about a question type", () => {
    expect(measure(blankState(), rec({ skill: { kind: "cause", key: "trap" } })).state).toBe("unmeasured");
  });
  it("keeps one row per skill, newest first, and hides dismissed ones", () => {
    const st = blankState();
    st.recs.push(rec({ id: "a", d: "2026-10-01" }), rec({ id: "b", d: "2026-10-08" }), rec({ id: "c", skill: { kind: "type", key: "RC" }, status: "dismissed" }));
    expect(tracked(st).map((m) => m.rec.id)).toEqual(["b"]);
  });
});

describe("the three answers", () => {
  it("need 20 questions in each fortnight for a trend", () => {
    const st = blankState(); row(st, "2026-10-20", "RC", 20, 14); row(st, "2026-10-01", "RC", 10, 5);
    expect(trend(st, "2026-10-21")).toEqual({ now: 70, before: null, n: 20 });
    row(st, "2026-10-02", "RC", 10, 5);
    expect(trend(st, "2026-10-21").before).toBe(50);
  });
  it("compare the last three results with the target", () => {
    expect(readiness(blankState())).toBeNull();
    const st = blankState();
    st.mocks.push({ id: "1", d: "2026-10-01", sec: "VARC", n: "", k: "Full mock", c: 12, w: 2 }, { id: "2", d: "2026-10-08", sec: "VARC", n: "", k: "Full mock", c: 14, w: 2 });
    expect(readiness(st)).toMatchObject({ count: 2, avg: 13 });
  });
});
