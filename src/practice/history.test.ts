import { describe, expect, it } from "vitest";
import { addDays, dow } from "../lib/date";
import { blankState, type AppState } from "../lib/state";
import { CONTENT } from "./full";
import { daySummary, filterDays, historyDays, historyItems, level, stripWeeks } from "./history";
import { recordCr, recordRc, recordRedoAnswer, recordVa } from "./record";
import { parseKey } from "./va/build";

const set = CONTENT.rcSets[0], cr = CONTENT.crItems.slice(0, 2);
const va = [parseKey("pj:" + CONTENT.vaParas[0].id, CONTENT.vaParas)!];

function sample(): AppState {
  const st = blankState();
  recordRc(st, "r1", set, set.questions.map((q) => q.answer), 420, 60, "library", "2026-10-20");
  recordVa(st, "v1", va, [""], 90, "daily", "2026-10-20");
  recordCr(st, "c1", cr, [cr[0].answer, null], 200, "2026-10-21");
  recordRedoAnswer(st, "RC", true, "2026-10-21");
  recordRedoAnswer(st, "RC", false, "2026-10-21");
  st.practice.push({ id: "own", d: "2026-10-19", sec: "VARC", t: "RC", a: 8, c: 6, src: "Cracku RC bank" });
  st.sectionals.push({ id: "s1", d: "2026-10-22", qs: ["a", "b"], a: ["", ""], t: [0, 0], secs: 2400, c: 1, w: 1, updatedAt: 1 });
  st.errors.push({ id: "e1", d: "2026-10-21", sec: "VARC", t: "RC: inference", trap: "", src: "", why: "", fix: "" }, { id: "e2", d: "2026-10-21", sec: "VARC", t: "Para jumble", trap: "", src: "", why: "", fix: "" });
  st.days["2026-10-18"] = { done: { "varc:read": 30 } };
  return st;
}

describe("History", () => {
  it("shows each attempt once, with its title, result and review link", () => {
    const items = historyItems(sample());
    const rc = items.find((x) => x.icon === "rc")!;
    expect(rc).toMatchObject({ title: set.title, d: "2026-10-20", href: `/practice/rc/${set.id}?review=r1` });
    expect(rc.detail).toContain(`${set.questions.length} of ${set.questions.length} right`);
    expect(items.find((x) => x.icon === "va")!.href).toBe("/practice/va?review=v1");
    expect(items.find((x) => x.icon === "cr")!.detail).toMatch(/^1 of 2 right/);
    expect(items.find((x) => x.icon === "sectional")!.detail).toMatch(/^Score 2 of 6/);
    // The practice rows the attempts wrote are not shown again; the student's own set is.
    expect(items.filter((x) => x.icon === "own").map((x) => x.id)).toEqual(["own-own"]);
  });

  it("folds redo answers and mistakes into one row a day", () => {
    const items = historyItems(sample());
    expect(items.filter((x) => x.icon === "redo")).toEqual([expect.objectContaining({ d: "2026-10-21", detail: "2 questions, 1 right" })]);
    expect(items.filter((x) => x.icon === "mistake")).toEqual([expect.objectContaining({ title: "2 mistakes logged" })]);
  });

  it("groups by day, newest first, with ticked minutes or else measured time", () => {
    const days = historyDays(sample());
    expect(days.map((d) => d.d)).toEqual(["2026-10-22", "2026-10-21", "2026-10-20", "2026-10-19", "2026-10-18"]);
    expect(days.find((d) => d.d === "2026-10-18")).toMatchObject({ items: [], minutes: 30 });
    expect(days.find((d) => d.d === "2026-10-20")!.minutes).toBe(Math.round((420 + 90) / 60));
    expect(days[0].items[0].kind).toBe("tests");
  });

  it("filters by kind and by words in the title", () => {
    const days = historyDays(sample());
    expect(filterDays(days, { kind: "tests" }).map((d) => d.d)).toEqual(["2026-10-22"]);
    const found = filterDays(days, { q: set.title.split(" ").slice(0, 2).join(" ").toUpperCase() });
    expect(found.flatMap((d) => d.items.map((x) => x.icon))).toContain("rc");
    expect(filterDays(days, { q: "zzzz" })).toEqual([]);
  });

  it("sums a day up in one line for Today", () => {
    const days = historyDays(sample());
    expect(daySummary(days.find((d) => d.d === "2026-10-20"))).toBe("1 RC set, 1 VA drill, 9 min");
    expect(daySummary(days.find((d) => d.d === "2026-10-18"))).toBe("30 min");
    expect(daySummary(undefined)).toBe("");
  });

  it("shades days in four steps", () => {
    expect([level(0, 0), level(0, 1), level(19, 0), level(20, 0), level(45, 0), level(90, 0)]).toEqual([0, 1, 1, 2, 3, 4]);
  });

  it("lays the strip out in 12 Monday-first weeks ending today", () => {
    const today = "2026-10-24"; // a Saturday
    const weeks = stripWeeks(today);
    expect(weeks).toHaveLength(12);
    weeks.forEach((w) => { expect(w).toHaveLength(7); expect(dow(w[0]!)).toBe(1); });
    expect(weeks[11][5]).toBe(today);
    expect(weeks[11][6]).toBeNull();
    expect(weeks[0][0]).toBe(addDays(today, -5 - 77));
  });

  it("builds a heavy year quickly", () => {
    const st = blankState();
    for (let i = 0; i < 365; i++) {
      const d = addDays("2026-01-01", i);
      for (let j = 0; j < 4; j++) recordRc(st, `r${i}-${j}`, set, set.questions.map(() => 0), 400, 60, "library", d);
      recordVa(st, `v${i}`, va, ["1234"], 90, "daily", d);
      st.errors.push({ id: `e${i}`, d, sec: "VARC", t: "RC: inference", trap: "", src: "", why: "", fix: "" });
      st.days[d] = { done: { "varc:read": 45 } };
    }
    const t0 = performance.now();
    const days = historyDays(st);
    filterDays(days, { q: "the" });
    expect(days).toHaveLength(365);
    expect(performance.now() - t0).toBeLessThan(150);
  });
});
