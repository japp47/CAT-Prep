import { describe, expect, it } from "vitest";
import { blankState, normalize } from "../lib/state";
import { mergeRecord } from "../lib/sync/records";
import { SECTION_BY_ID, SECTIONS } from "../sections";
import { applyAutoTicks, autoTicks, siteWork, wanted } from "./auto";
import { buildDay, budgetFor } from "./engine";

const d = "2026-11-04"; // a Foundation Wednesday
const fresh = () => { const st = blankState(); st.since = d; return st; };
const blocks = (st: ReturnType<typeof blankState>, sec: "varc" | "dilr") => buildDay(SECTION_BY_ID[sec], st, d, budgetFor(SECTION_BY_ID[sec], st, d), { today: d });

describe("blocks that tick themselves from work on the site (D57)", () => {
  it("reads how many a block asks for from its name", () => {
    expect(wanted("One RC, untimed")).toBe(1);
    expect(wanted("Two LR sets")).toBe(2);
    expect(wanted("Timed RC pair")).toBe(2);
    expect(wanted("Three RCs, untimed")).toBe(3);
  });
  it("covers an RC block with an RC set taken that day, and the LR block with an LR set", () => {
    const st = fresh();
    expect(autoTicks(st, d)).toHaveLength(0);
    st.rcAttempts.push({ id: "r", d, set: "x", mode: "daily", ans: [0, 1, 2, 3], c: 3, w: 1, secs: 400, first: 0 });
    st.lrAttempts.push({ id: "l", d, set: "arr-round-table", ans: [0, 1, 2, 3], c: 4, w: 0, secs: 400, updatedAt: 1 });
    const ticked = autoTicks(st, d).map((x) => x.b.id);
    expect(ticked).toContain("rc1");
    expect(ticked).toContain("lrset");
    expect(siteWork(blocks(st, "varc").find((b) => b.id === "rc1")!, st, d)).toBe("RC set, 3 of 4 right");
  });
  it("never ticks a catch-up: one RC set covers today's RC block, not the missed day's too", () => {
    const st = fresh();
    st.since = "2026-11-03";
    expect(blocks(st, "varc").some((b) => b.carryFrom)).toBe(true);
    st.rcAttempts.push({ id: "r", d, set: "x", mode: "daily", ans: [0, 1, 2, 3], c: 3, w: 1, secs: 400, first: 0 });
    const ticked = autoTicks(st, d).map((x) => x.b);
    expect(ticked.some((b) => b.id === "rc1")).toBe(true);
    expect(ticked.some((b) => b.carryFrom)).toBe(false);
  });
  it("needs two LR sets for a two-set block, and the right drill for a drill block", () => {
    const st = fresh();
    const two = { id: "lrset", name: "Two LR sets", go: "lr-next" };
    st.lrAttempts.push({ id: "l", d, set: "a", ans: [], c: 0, w: 0, secs: 1, updatedAt: 1 });
    expect(siteWork(two, st, d)).toBeNull();
    st.lrAttempts.push({ id: "m", d, set: "b", ans: [], c: 0, w: 0, secs: 1, updatedAt: 1 });
    expect(siteWork(two, st, d)).toBe("2 LR sets");
    const drill = { id: "drill", name: "Clue translator", go: "/practice/clues" };
    st.lrDrills.push({ id: "x", d, kind: "mcc", items: [{ k: "a", ok: true }], secs: 60 });
    expect(siteWork(drill, st, d)).toBeNull();
    st.lrDrills.push({ id: "y", d, kind: "clue", items: [{ k: "a", ok: true }, { k: "b", ok: false }], secs: 60 });
    expect(siteWork(drill, st, d)).toBe("1 of 2 right");
  });
  it("ticks once, and never ticks again a block the student unticked", () => {
    const st = fresh();
    st.rcAttempts.push({ id: "r", d, set: "x", mode: "daily", ans: [0], c: 1, w: 0, secs: 100, first: 0 });
    applyAutoTicks(st, d);
    const key = blocks(st, "varc").find((b) => b.id === "rc1")!.key;
    expect(st.days[d].done?.[key]).toBeGreaterThan(0);
    expect(st.days[d].auto?.[key]).toBe(1);
    delete st.days[d].done![key];
    applyAutoTicks(st, d);
    expect(st.days[d].done?.[key]).toBeUndefined();
  });
  it("keeps the auto marks through a save and a sync merge", () => {
    const st = fresh();
    st.days[d] = { done: { "varc:rc1": 20 }, auto: { "varc:rc1": 1 } };
    expect(normalize(JSON.parse(JSON.stringify(st))).days[d].auto).toEqual({ "varc:rc1": 1 });
    const a = { kind: "day" as const, id: d, data: { auto: { "varc:rc1": 1 } }, updatedAt: 1, deleted: false };
    const b = { kind: "day" as const, id: d, data: { auto: { "dilr:lrset": 1 } }, updatedAt: 2, deleted: false };
    expect((mergeRecord(a, b).data as { auto: Record<string, 1> }).auto).toEqual({ "varc:rc1": 1, "dilr:lrset": 1 });
  });
});

describe("one-time setup per phase (D57)", () => {
  it("names only resources that exist in the section's list", async () => {
    for (const sec of SECTIONS) {
      if (!sec.setup) continue;
      const { resources } = await sec.resources!();
      Object.values(sec.setup).flat().forEach((id) => expect(resources.some((r) => r.id === id), `${sec.id} ${id}`).toBe(true));
    }
  });
});
