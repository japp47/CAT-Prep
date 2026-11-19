import { describe, expect, it } from "vitest";
import type { SectionId } from "../sections/types";
import { firstStep, fitPlan, FLOOR, split, TIME_BY_WORK, WD_CHOICES, WE_CHOICES, why } from "./fit";

const LIVE: SectionId[] = ["varc", "dilr"];
const sum = (r: Record<string, number>) => Object.values(r).reduce((s, n) => s + n, 0);

describe("a plan that fits you (F82, D116)", () => {
  it("starts each profile modestly, with the default among the choices offered", () => {
    expect(TIME_BY_WORK).toEqual({ studying: { wd: 60, we: 120 }, working: { wd: 45, we: 120 }, both: { wd: 30, we: 90 } });
    for (const t of Object.values(TIME_BY_WORK)) { expect(WD_CHOICES).toContain(t.wd); expect(WE_CHOICES).toContain(t.we); }
  });

  it("splits as today's plan does when no section is named: VARC two parts, DILR one", () => {
    expect(split(90, LIVE, null, false, FLOOR.wd)).toEqual({ varc: 60, dilr: 30 });
    expect(split(180, LIVE, null, false, FLOOR.we)).toEqual({ varc: 120, dilr: 60 });
  });

  it("moves 10 points of the day to the hardest section, 15 for a repeater", () => {
    expect(split(45, LIVE, "dilr", false, FLOOR.wd)).toEqual({ varc: 25, dilr: 20 }); // 33% + 10 = 43% of 45
    expect(split(120, LIVE, "dilr", false, FLOOR.we)).toEqual({ varc: 70, dilr: 50 });
    expect(split(120, LIVE, "dilr", true, FLOOR.we)).toEqual({ varc: 60, dilr: 60 }); // 33% + 15 = 48% of 120, rounded
    expect(split(60, LIVE, "varc", false, FLOOR.wd)).toEqual({ varc: 45, dilr: 15 });
  });

  it("always adds up to the time chosen and keeps every live section at its floor or more", () => {
    for (const total of [...WD_CHOICES, ...WE_CHOICES]) {
      const floor = total >= 60 && WE_CHOICES.includes(total) && !WD_CHOICES.includes(total) ? FLOOR.we : FLOOR.wd;
      for (const weak of [null, "varc", "dilr"] as (SectionId | null)[]) for (const repeat of [false, true]) {
        const r = split(total, LIVE, weak, repeat, floor);
        expect(sum(r), `${total} ${weak} ${repeat}`).toBe(total);
        for (const id of LIVE) { expect(r[id] % 5).toBe(0); expect(r[id]).toBeGreaterThanOrEqual(Math.min(floor, total / LIVE.length)); }
      }
    }
  });

  it("gives Quant its share once it is live, without starving the others", () => {
    const r = split(120, ["varc", "dilr", "quant"], "quant", false, FLOOR.wd);
    expect(sum(r)).toBe(120);
    expect(r.quant).toBeGreaterThan(r.varc);
    expect(r.dilr).toBeGreaterThanOrEqual(FLOOR.wd);
  });

  it("splits evenly when the time is less than every floor together, and gives one live section everything", () => {
    expect(split(20, LIVE, "dilr", false, FLOOR.wd)).toEqual({ varc: 10, dilr: 10 });
    expect(split(45, ["varc"], "dilr", false, FLOOR.wd)).toEqual({ varc: 45 });
  });

  it("picks the first step from where the student stands", () => {
    expect(firstStep("repeat").to).toBe("/practice/sectional");
    expect(firstStep("some").to).toBe("/today");
    expect(firstStep("new").to).toBe("/guides/start-here");
    expect(firstStep("unsure").to).toBe("/guides/start-here");
  });

  it("makes a whole plan, and two profiles get different ones", () => {
    const a = fitPlan({ work: "working", wd: 45, we: 120, stand: "some", weak: "dilr" }, LIVE);
    const b = fitPlan({ work: "studying", wd: 60, we: 120, stand: "new", weak: null }, LIVE);
    expect(a.minutes).toEqual({ varc: { wd: 25, we: 70 }, dilr: { wd: 20, we: 50 } });
    expect(b.minutes).toEqual({ varc: { wd: 40, we: 80 }, dilr: { wd: 20, we: 40 } });
    expect(a.first.kind).not.toBe(b.first.kind);
  });

  it("says why in one line", () => {
    expect(why("working", "DILR")).toBe("Working, DILR feels hardest");
    expect(why("both", null)).toBe("Studying and working");
    expect(why(undefined, undefined)).toBe("");
  });
});
