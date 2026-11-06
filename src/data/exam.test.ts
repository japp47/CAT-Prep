import { describe, expect, it } from "vitest";
import { addDays, diffDays } from "../lib/date";
import { catByYear, catChoices, CATS, defaultCat, phaseCount, phaseIn, PLAN_START, roadFor, roadOf } from "./exam";

const cat = (y: number) => catByYear(y)!;
const shape = (since: string, y: number) => roadFor(cat(y), since).phases.map((p) => `${p.name} ${p.start}..${p.end}`);

describe("the road to a CAT (D87)", () => {
  it("keeps the CAT 2027 road every student has today, to the day", () => {
    expect(shape(PLAN_START, 2027)).toEqual([
      "Foundation 2026-10-17..2027-01-31",
      "Build 2027-02-01..2027-05-31",
      "Apply 2027-06-01..2027-08-31",
      "Mock phase 2027-09-01..2027-11-17",
      "Taper 2027-11-18..2027-11-27",
    ]);
    // A student who joined later in October only starts Foundation later.
    expect(shape("2026-11-06", 2027)[0]).toBe("Foundation 2026-11-06..2027-01-31");
  });

  it("opens a long road with a head start, then the same five phases a year on", () => {
    expect(shape("2026-11-06", 2028)).toEqual([
      "Head start 2026-11-06..2027-09-30",
      "Foundation 2027-10-01..2028-01-31",
      "Build 2028-02-01..2028-05-31",
      "Apply 2028-06-01..2028-08-31",
      "Mock phase 2028-09-01..2028-11-15",
      "Taper 2028-11-16..2028-11-25",
    ]);
  });

  it("shares a late start's days among Foundation, Build and Apply, and keeps every phase", () => {
    const r = roadFor(cat(2027), "2027-04-10");
    expect(r.short).toBe(true);
    expect(r.phases.map((p) => p.name)).toEqual(["Foundation", "Build", "Apply", "Mock phase", "Taper"]);
    const len = (i: number) => diffDays(r.phases[i].start, r.phases[i].end) + 1;
    expect(len(1)).toBeGreaterThan(len(0)); // Build gets the most
    expect(r.phases[2].end).toBe("2027-08-31");
    expect(r.phases[3].start).toBe("2027-09-01");
  });

  it("starts straight in the mock phase when there is no time before it", () => {
    expect(shape("2027-10-01", 2027)).toEqual(["Mock phase 2027-10-01..2027-11-17", "Taper 2027-11-18..2027-11-27"]);
  });

  it("leaves no gaps and no overlaps, for any start", () => {
    for (const since of ["2026-10-17", "2026-12-20", "2027-01-25", "2027-03-01", "2027-07-20", "2027-08-25"]) {
      const r = roadFor(cat(2027), since);
      expect(r.phases[0].start).toBe(since);
      r.phases.forEach((p, i) => {
        expect(p.start <= p.end).toBe(true);
        if (i) expect(p.start).toBe(addDays(r.phases[i - 1].end, 1));
      });
      expect(r.phases[r.phases.length - 1].end).toBe("2027-11-27");
    }
  });

  it("places a day on the road", () => {
    const r = roadFor(cat(2027), PLAN_START);
    expect(phaseIn(r, "2026-10-01")).toEqual({ kind: "pre" });
    expect(phaseIn(r, "2027-03-10")).toMatchObject({ kind: "phase", phase: { name: "Build" } });
    expect(phaseIn(r, "2027-11-28")).toEqual({ kind: "exam" });
    expect(phaseIn(r, "2027-11-29")).toEqual({ kind: "after" });
    expect(phaseCount(roadFor(cat(2028), PLAN_START))).toBe(5); // the head start is not a numbered phase
  });

  it("defaults to the first CAT far enough from the day the student started, and never moves it", () => {
    expect(defaultCat("2026-10-20").year).toBe(2027); // CAT 2026 was only weeks away
    expect(defaultCat("2027-03-01").year).toBe(2027);
    expect(defaultCat("2027-09-15").year).toBe(2028);
    expect(roadOf({ since: "2026-10-20", about: {} }).name).toBe("CAT 2027");
    expect(roadOf({ since: "2026-10-20", about: { exam: 2028 } }).name).toBe("CAT 2028");
    expect(roadOf({ since: "2026-10-20", about: { exam: 1999 } }).name).toBe("CAT 2027"); // an unknown year falls back
  });

  it("offers the next three CATs far enough away, and keeps the student's own", () => {
    expect(catChoices("2026-11-06").map((e) => e.year)).toEqual([2027, 2028, 2029]);
    expect(catChoices("2027-10-01").map((e) => e.year)).toEqual([2028, 2029, 2030]);
    expect(catChoices("2027-10-01", cat(2027)).map((e) => e.year)).toEqual([2027, 2028, 2029, 2030]);
    expect(catChoices("2027-12-01", cat(2027)).map((e) => e.year)).toEqual([2028, 2029, 2030]); // after the exam
  });

  it("has a date on the last Sunday of November for every expected CAT", () => {
    for (const e of CATS.filter((x) => !x.confirmed)) {
      const d = new Date(e.date + "T00:00:00");
      expect(d.getDay()).toBe(0);
      expect(d.getMonth()).toBe(10);
      expect(d.getDate()).toBeGreaterThan(23);
    }
  });
});
