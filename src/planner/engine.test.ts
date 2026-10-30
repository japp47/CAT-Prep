import { describe, expect, it } from "vitest";
import { blankState, normalize } from "../lib/state";
import { VARC } from "../sections/varc";
import { buildDay, carryId, carryInfo, defaultMin, doneKey, markBlockDone, missedDays, skipCarry } from "./engine";

const WEEKDAY = "2026-10-19"; // Monday, Foundation phase
const SATURDAY = "2026-10-24";
const sum = (bl: { mins: number }[]) => bl.reduce((s, b) => s + b.mins, 0);

describe("defaults", () => {
  it("uses 1 hour on weekdays and 2 hours at the weekend", () => {
    const st = blankState();
    expect(defaultMin(VARC, st, WEEKDAY)).toBe(60);
    expect(defaultMin(VARC, st, SATURDAY)).toBe(120);
  });
  it("lets a day-of-week override win over the weekday default", () => {
    const st = blankState();
    st.settings.varc.dow[1] = 25;
    expect(defaultMin(VARC, st, WEEKDAY)).toBe(25);
  });
});

describe("buildDay", () => {
  const opts = { today: "2026-10-17", noCarry: true };
  it("fills the budget exactly", () => {
    const st = blankState();
    for (const m of [20, 30, 45, 60, 90, 120, 180]) {
      expect(sum(buildDay(VARC, st, WEEKDAY, m, opts))).toBe(m);
      expect(sum(buildDay(VARC, st, SATURDAY, m, opts))).toBe(m);
    }
  });
  it("keeps the core task when time is short", () => {
    const bl = buildDay(VARC, blankState(), WEEKDAY, 15, opts);
    expect(bl).toHaveLength(1);
    expect(bl[0].pri).toBe(1);
  });
  it("adds extra blocks when there is more time", () => {
    const bl = buildDay(VARC, blankState(), WEEKDAY, 150, opts);
    expect(bl.some((b) => b.pri === 9)).toBe(true);
  });
  it("plans nothing on a rest day", () => {
    expect(buildDay(VARC, blankState(), WEEKDAY, 0, opts)).toEqual([]);
  });
  it("switches the weekend core from the course to the book once the course is ticked", () => {
    const st = blankState();
    expect(buildDay(VARC, st, SATURDAY, 120, opts)[0].id).toBe("course");
    st.ticks.gejo = 1;
    expect(buildDay(VARC, st, SATURDAY, 120, opts)[0].id).toBe("book1");
  });
  it("serves the next unlogged past paper on a Build phase paper Saturday", () => {
    const st = blankState();
    const sat = "2027-02-06";
    const first = buildDay(VARC, st, sat, 120, opts).find((b) => b.id === "paper");
    expect(first?.paper).toBe("CAT 2017 Slot 1");
    st.mocks.push({ id: "m1", d: sat, sec: "VARC", n: "CAT 2017 Slot 1", k: "Past paper", c: 12, w: 3 });
    expect(buildDay(VARC, st, sat, 120, opts).find((b) => b.id === "paper")?.paper).toBe("CAT 2017 Slot 2");
  });
});

describe("carry over", () => {
  it("brings back yesterday's missed core task, and stops once it is done", () => {
    const st = blankState();
    st.since = "2026-10-17";
    const today = "2026-10-20";
    const carry = carryInfo(VARC, st, today);
    expect(carry?.date).toBe("2026-10-19");
    const bl = buildDay(VARC, st, today, 60, { today });
    expect(bl.some((b) => b.id === carryId("2026-10-19"))).toBe(true);
    st.days["2026-10-19"] = { done: { [doneKey(VARC, carry!.block.id)]: 30 } };
    expect(carryInfo(VARC, st, today)?.date).not.toBe("2026-10-19");
  });
  // The bug of 30 Oct 2026: finishing one catch-up brought in the next older missed day under the same key, already
  // ticked; skipping that one brought in the next, also ticked.
  it("gives one catch-up a day: once done it stays done, and no older missed day takes its place", () => {
    const st = blankState();
    st.since = "2026-10-17";
    const today = "2026-10-21";
    expect(missedDays(VARC, st, today).map((x) => x.date)).toEqual(["2026-10-20", "2026-10-19", "2026-10-18", "2026-10-17"]);
    const carry = buildDay(VARC, st, today, 60, { today }).find((b) => b.carryFrom)!;
    expect(carry.carryFrom).toBe("2026-10-20");
    markBlockDone(st, today, VARC.id, carry.key, carry.mins, carry.carryFrom);
    expect(carryInfo(VARC, st, today)).toMatchObject({ date: "2026-10-20", done: true });
    const again = buildDay(VARC, st, today, 60, { today }).filter((b) => b.carryFrom);
    expect(again.map((b) => [b.carryFrom, !!st.days[today].done![b.key]])).toEqual([["2026-10-20", true]]);
    // Tomorrow the next older day comes, not ticked.
    const next = buildDay(VARC, st, "2026-10-22", 60, { today: "2026-10-22" }).find((b) => b.carryFrom)!;
    expect(next.carryFrom).toBe("2026-10-21");
    expect(st.days["2026-10-22"]?.done?.[next.key]).toBeUndefined();
  });
  it("counts a catch-up ticked before ids carried a date as today's, and shows no other", () => {
    const st = blankState();
    st.since = "2026-10-17";
    st.days["2026-10-21"] = { done: { "varc:carry": 15 } };
    expect(carryInfo(VARC, st, "2026-10-21")).toBeNull();
  });
  it("lets every missed day go when a catch-up is skipped", () => {
    const st = blankState();
    st.since = "2026-10-17";
    skipCarry(st, VARC, "2026-10-21");
    expect(carryInfo(VARC, st, "2026-10-21")).toBeNull();
    expect(missedDays(VARC, st, "2026-10-21")).toEqual([]);
  });
  it("does not carry from a rest day", () => {
    const st = blankState();
    st.since = "2026-10-19";
    st.days["2026-10-19"] = { min: { varc: 0 } };
    expect(carryInfo(VARC, st, "2026-10-20")).toBeNull();
  });
});

describe("normalize", () => {
  it("survives junk and keeps valid fields", () => {
    expect(normalize("nope").settings.varc.wd).toBe(60);
    const st = normalize({ settings: { varc: { wd: 9999, we: 30, dow: [null, 40] } }, days: { bad: {}, "2026-10-19": { min: { varc: 20 } } }, mocks: [null, { c: "5" }] });
    expect(st.settings.varc.wd).toBe(600);
    expect(st.settings.varc.we).toBe(30);
    expect(st.settings.varc.dow[1]).toBe(40);
    expect(Object.keys(st.days)).toEqual(["2026-10-19"]);
    expect(st.mocks).toHaveLength(1);
    expect(st.mocks[0].c).toBe(5);
  });
});
