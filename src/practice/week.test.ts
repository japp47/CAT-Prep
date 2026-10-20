import { describe, expect, it } from "vitest";
import { blankState, normalize, type AppState } from "../lib/state";
import { accuracy } from "./report";
import { drillForType, focusOptions, focusToday, latestWeek, reviewWeek, weekFacts } from "./week";

const MON = "2026-10-19"; // a Monday
const row = (st: AppState, d: string, t: string, a: number, c: number) => st.practice.push({ id: d + t + a, d, sec: "VARC", t, a, c, src: "" });

describe("when the review is open", () => {
  it("opens Saturday evening for this week, stays Sunday, and on Monday covers the week that ended", () => {
    expect(reviewWeek("2026-10-24", 17)).toBeNull();
    expect(reviewWeek("2026-10-24", 18)).toBe(MON);
    expect(reviewWeek("2026-10-25", 9)).toBe(MON);
    expect(reviewWeek("2026-10-26", 23)).toBe(MON);
    expect(reviewWeek("2026-10-27", 12)).toBeNull();
    expect(latestWeek("2026-10-22", 12)).toBe(MON); // midweek: this week so far
    expect(latestWeek("2026-10-26", 9)).toBe(MON); // Monday: the week that just ended
  });
});

describe("week facts", () => {
  it("say so plainly when nothing was done", () => {
    const f = weekFacts(blankState(), MON, "2026-10-25");
    expect(f.studied).toBe(0);
    expect(f.questions).toMatchObject({ attempted: 0, acc: null, lastAcc: null });
    expect(f.improved).toEqual([]);
    expect(f.light).toBe(true);
  });
  it("count questions with the report card's accuracy, and compare weeks only with enough questions", () => {
    const st = blankState();
    row(st, "2026-10-13", "Para jumble", 10, 4);
    row(st, "2026-10-14", "RC", 20, 12);
    row(st, "2026-10-20", "Para jumble", 8, 7);
    row(st, "2026-10-21", "RC", 16, 8);
    row(st, "2026-10-22", "Para summary", 3, 0);
    const f = weekFacts(st, MON, "2026-10-25");
    expect(f.questions.attempted).toBe(27);
    expect(f.questions.acc).toBe(accuracy({ attempted: 27, correct: 15 }));
    expect(f.improved.map((m) => m.type)).toEqual(["Para jumble"]);
    expect(f.slipped.map((m) => m.type)).toEqual(["RC"]);
  });
  it("finds the trap that cost most, from two hits up", () => {
    const st = blankState();
    const e = (trap: string, d = "2026-10-20") => st.errors.push({ id: trap + Math.random(), d, sec: "VARC", t: "RC", trap, src: "", why: "", fix: "" });
    e("Extreme wording");
    expect(weekFacts(st, MON, "2026-10-25").trap).toBeNull();
    e("Extreme wording"); e("Out of scope"); e("Out of scope", "2026-10-12");
    expect(weekFacts(st, MON, "2026-10-25").trap).toEqual({ name: "Extreme wording", n: 2 });
  });
  it("calls for a lighter week after three missed days in a row", () => {
    const st = blankState();
    ["2026-10-19", "2026-10-20"].forEach((d) => row(st, d, "RC", 4, 3));
    expect(weekFacts(st, MON, "2026-10-21").light).toBe(false);
    expect(weekFacts(st, MON, "2026-10-24").light).toBe(true);
  });
});

describe("focus for next week", () => {
  it("puts the weakest type with enough questions first, with a drill and the accuracy before", () => {
    const st = blankState();
    row(st, "2026-10-20", "Para jumble", 8, 3);
    row(st, "2026-10-20", "RC", 16, 14);
    const o = focusOptions(st, MON, "2026-10-25");
    expect(o[0]).toMatchObject({ skill: { kind: "type", key: "Para jumble" }, to: "/practice/va?type=pj&n=6", before: { c: 3, n: 8 } });
    expect(o.length).toBeLessThanOrEqual(3);
  });
  it("offers nothing without evidence", () => {
    expect(focusOptions(blankState(), MON, "2026-10-25")).toEqual([]);
  });
  it("shows on Today in the next week until done three times", () => {
    const st = blankState();
    st.recs.push({ id: "r", d: "2026-10-25", updatedAt: 1, from: "week", sec: "VARC", skill: { kind: "type", key: "RC" }, text: "x", why: "y", status: "open" });
    st.weekReviews.push({ id: MON, d: "2026-10-25", updatedAt: 1, focus: "r", days: [], closed: true });
    expect(focusToday(st, "2026-10-25")).toBeNull(); // still the reviewed week
    expect(focusToday(st, "2026-10-27")).toMatchObject({ doneToday: false, left: 3 });
    st.weekReviews[0].days = ["2026-10-26", "2026-10-27", "2026-10-28"];
    expect(focusToday(st, "2026-10-28")).toMatchObject({ doneToday: true, left: 0 });
    expect(focusToday(st, "2026-10-29")).toBeNull();
  });
  it("links each type to its drill", () => {
    expect(drillForType("Odd sentence out")).toBe("/practice/va?type=oso&n=6");
    expect(drillForType("Critical reasoning")).toBe("/practice/cr?n=6");
    expect(drillForType("RC")).toBe("/practice/library");
  });
});

describe("state", () => {
  it("keeps a week review through a save, and old backups load with none", () => {
    expect(normalize({ settings: {} }).weekReviews).toEqual([]);
    const st = blankState();
    st.weekReviews.push({ id: MON, d: "2026-10-25", updatedAt: 1, focus: "r", light: true, note: "Read slower.", days: ["2026-10-27"], closed: true });
    expect(normalize(JSON.parse(JSON.stringify(st))).weekReviews).toEqual(st.weekReviews);
  });
});
