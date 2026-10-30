import { describe, expect, it } from "vitest";
import { blankState, normalize } from "../../lib/state";
import { buildDay, budgetFor } from "../../planner/engine";
import { SECTION_BY_ID } from "..";
import { DILR_PHASE_TEXT, dilrTemplate } from "./plan";

const ctx = { ticks: {}, mocks: [] };
const DILR = SECTION_BY_ID.dilr;

describe("DILR in the timetable (F22, D56)", () => {
  it("is live, with a template and a phase text for every phase", () => {
    expect(DILR.status).toBe("live");
    [1, 2, 3, 4, 5].forEach((p) => expect(DILR_PHASE_TEXT[p].goal.length).toBeGreaterThan(0));
  });
  it("gives a Foundation weekday one set of the day and one drill, the set as the core block", () => {
    const t = dilrTemplate("2026-11-04", ctx);
    expect(t.base.map((b) => b.id)).toEqual(["lrset", "drill"]);
    expect(t.base[0].pri).toBe(1);
    expect(t.base[0].go).toBe("lr-next");
  });
  it("gives a Foundation weekend two sets, a drill and a retake", () => {
    const t = dilrTemplate("2026-11-07", ctx);
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
    const done = dilrTemplate("2027-02-13", { ticks: {}, mocks: [{ id: "m", d: "2027-02-01", sec: "DILR", n: paper.paper!, k: "Past paper", c: 10, w: 2 }] });
    expect(done.base[0].paper ?? "").not.toBe(paper.paper);
  });
  it("fits a 30-minute weekday: the set and the drill, nothing lost", () => {
    const st = blankState();
    const blocks = buildDay(DILR, st, "2026-11-04", budgetFor(DILR, st, "2026-11-04"), { today: "2026-11-04", noCarry: true });
    expect(blocks.map((b) => b.id)).toEqual(["lrset", "drill"]);
    expect(blocks.reduce((s, b) => s + b.mins, 0)).toBe(30);
  });
});

describe("DILR's first day in the timetable (D56)", () => {
  it("plans no DILR time before it went live, so the first day owes no catch-up", () => {
    const st = blankState();
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
    expect(blankState().settings.dilr).toMatchObject({ wd: 30, we: 60 });
  });
  it("moves the old untouched 45 and 90 to the new time, and keeps a time the student chose", () => {
    const old = blankState();
    const raw = JSON.parse(JSON.stringify(old));
    raw.settings.dilr = { wd: 45, we: 90, dow: [null, null, null, null, null, null, null] };
    expect(normalize(raw).settings.dilr).toMatchObject({ wd: 30, we: 60 });
    raw.settings.dilr = { wd: 45, we: 90, dow: [null, 60, null, null, null, null, null] };
    expect(normalize(raw).settings.dilr).toMatchObject({ wd: 45, we: 90 });
    raw.settings.dilr = { wd: 50, we: 90, dow: [null, null, null, null, null, null, null] };
    expect(normalize(raw).settings.dilr.wd).toBe(50);
  });
});
