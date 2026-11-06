import { describe, expect, it } from "vitest";
import { blankState, normalize } from "../../lib/state";
import { buildDay, budgetFor } from "../../planner/engine";
import { SECTION_BY_ID } from "..";
import { catByYear, PLAN_START, roadFor } from "../../data/exam";
import { DILR_PHASE_TEXT, dilrTemplate } from "./plan";

/** A student who started with the plan, on 17 October 2026: these days fall on their road. */
const fromStart = () => { const s = blankState(); s.since = PLAN_START; return s; };
const road = roadFor(catByYear(2027)!, PLAN_START);
const ctx = { ticks: {}, mocks: [], road };
const DILR = SECTION_BY_ID.dilr;

describe("DILR in the timetable (F22, D56)", () => {
  it("is live, with a template and a phase text for every phase", () => {
    expect(DILR.status).toBe("live");
    [0, 1, 2, 3, 4, 5].forEach((p) => expect(DILR_PHASE_TEXT[p].goal.length).toBeGreaterThan(0));
  });
  it("gives a Foundation weekday one set of the day and one drill, the set as the core block", () => {
    const t = dilrTemplate("2026-11-04", ctx);
    expect(t.base.map((b) => b.id)).toEqual(["lrset", "drill"]);
    expect(t.base[0].pri).toBe(1);
    expect(t.base[0].go).toBe("lr-next");
  });
  it("gives a Foundation weekend two sets, a drill and a retake", () => {
    const t = dilrTemplate("2026-10-31", ctx);
    expect(t.base.map((b) => b.id)).toEqual(["lrset", "drill", "retake"]);
    expect(t.base[0].name).toBe("Two LR sets");
  });
  it("rotates the drill through the three kinds across the week", () => {
    const names = ["2026-11-02", "2026-11-03", "2026-11-04"].map((d) => dilrTemplate(d, ctx).base[1].name);
    expect(new Set(names).size).toBe(3);
  });
  it("brings in a timed past-paper section every other Saturday in Build, and logs it as a DILR mock", () => {
    const sats = ["2027-02-06", "2027-02-13", "2027-02-20", "2027-02-27"].map((d) => dilrTemplate(d, ctx).base[0]);
    expect(sats.filter((b) => b.kind === "paper")).toHaveLength(2);
    const paper = sats.find((b) => b.kind === "paper")!;
    const done = dilrTemplate("2027-02-13", { ticks: {}, road, mocks: [{ id: "m", d: "2027-02-01", sec: "DILR", n: paper.paper!, k: "Past paper", c: 10, w: 2 }] });
    expect(done.base[0].paper ?? "").not.toBe(paper.paper);
  });
  it("fits a 30-minute weekday: the set and the drill, nothing lost", () => {
    const st = fromStart();
    const blocks = buildDay(DILR, st, "2026-11-04", budgetFor(DILR, st, "2026-11-04"), { today: "2026-11-04", noCarry: true });
    expect(blocks.map((b) => b.id)).toEqual(["lrset", "drill"]);
    expect(blocks.reduce((s, b) => s + b.mins, 0)).toBe(30);
  });
});

describe("DI in the day plan (D82)", () => {
  const ids = (d: string) => dilrTemplate(d, ctx).base.map((b) => b.id);
  it("keeps Foundation weeks 1 to 3 logical reasoning only", () => {
    ["2026-10-19", "2026-10-28", "2026-11-06"].forEach((d) => expect(ids(d)).not.toContain("diset"));
  });
  it("puts a DI set first, beside the LR set, every day of Foundation weeks 4 and 5 (from 7 Nov 2026)", () => {
    ["2026-11-07", "2026-11-09", "2026-11-12", "2026-11-15", "2026-11-20"].forEach((d) => expect(ids(d).slice(0, 2), d).toEqual(["diset", "lrset"]));
    const b = dilrTemplate("2026-11-09", ctx).base[0];
    expect(b.go).toBe("di-next");
    expect(b.pri).toBe(1);
  });
  it("from week 6 to the end of Apply, gives a DI set on Monday, Wednesday and Friday only", () => {
    // Foundation week 6 starts 21 Nov 2026; Build in Feb 2027; Apply in Jun 2027.
    for (const [mon, tue] of [["2026-11-23", "2026-11-24"], ["2027-02-08", "2027-02-09"], ["2027-06-07", "2027-06-08"]]) {
      expect(ids(mon), mon).toEqual(expect.arrayContaining(["lrset", "diset"]));
      expect(ids(tue), tue).not.toContain("diset");
    }
    const week = ["2027-02-08", "2027-02-09", "2027-02-10", "2027-02-11", "2027-02-12", "2027-02-13", "2027-02-14"];
    expect(week.filter((d) => ids(d).includes("diset"))).toHaveLength(3);
  });
  it("gives one LR and one DI set on Mock phase weekdays, and alternates them in the Taper", () => {
    expect(ids("2027-09-07")).toEqual(["lrset", "diset", "drill"]);
    const taper = ["2027-11-18", "2027-11-19"].map((d) => ids(d)[0]);
    expect(new Set(taper)).toEqual(new Set(["lrset", "diset"]));
  });
  it("fits a 30-minute DI weekday with nothing lost: the DI set, the LR set and the drill", () => {
    const st = fromStart();
    const blocks = buildDay(DILR, st, "2026-11-09", budgetFor(DILR, st, "2026-11-09"), { today: "2026-11-09", noCarry: true });
    expect(blocks.map((b) => b.id)).toEqual(["diset", "lrset", "drill"]);
    expect(blocks.reduce((s, b) => s + b.mins, 0)).toBe(30);
  });
});

describe("DILR's first day in the timetable (D56)", () => {
  it("plans no DILR time before it went live, so the first day owes no catch-up", () => {
    const st = fromStart();
    st.since = "2026-10-20";
    expect(budgetFor(DILR, st, DILR.liveSince!) > 0).toBe(true);
    expect(budgetFor(DILR, st, "2026-10-29")).toBe(0);
    const first = buildDay(DILR, st, "2026-11-02", budgetFor(DILR, st, "2026-11-02"), { today: "2026-11-02" });
    // Days from liveSince had DILR blocks; missing them may carry, but nothing from before can.
    first.filter((b) => b.carryFrom).forEach((b) => expect(b.carryFrom! >= DILR.liveSince!).toBe(true));
  });
});

describe("DILR's usual time (D56)", () => {
  it("starts at 30 minutes on weekdays and 60 at weekends", () => {
    expect(fromStart().settings.dilr).toMatchObject({ wd: 30, we: 60 });
  });
  it("moves the old untouched 45 and 90 to the new time, and keeps a time the student chose", () => {
    const old = fromStart();
    const raw = JSON.parse(JSON.stringify(old));
    raw.settings.dilr = { wd: 45, we: 90, dow: [null, null, null, null, null, null, null] };
    expect(normalize(raw).settings.dilr).toMatchObject({ wd: 30, we: 60 });
    raw.settings.dilr = { wd: 45, we: 90, dow: [null, 60, null, null, null, null, null] };
    expect(normalize(raw).settings.dilr).toMatchObject({ wd: 45, we: 90 });
    raw.settings.dilr = { wd: 50, we: 90, dow: [null, null, null, null, null, null, null] };
    expect(normalize(raw).settings.dilr.wd).toBe(50);
  });
});
