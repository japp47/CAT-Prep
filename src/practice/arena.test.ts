import { describe, expect, it } from "vitest";
import { blankState, normalize, type ArenaRound, type LrAttempt } from "../lib/state";
import { toRecords } from "../lib/sync/records";
import { ARENA_POOL, ARENA_SETS, arenaTrend, costliest, debrief, freshLeft, pickRound, resultOf, roundScore, selectionAccuracy, visitLanes } from "./arena";
import { LR_CATALOG } from "./catalog.gen";
import type { LrMeta } from "./types";

const att = (id: string, set: string, c: number, w: number, secs: number, d = "2026-11-01"): LrAttempt => ({ id, d, set, ans: [], c, w, secs, updatedAt: 1 });
const round = (over: Partial<ArenaRound> = {}): ArenaRound => ({
  id: "r1", d: "2026-11-01", updatedAt: 1, sets: ["a", "b", "c", "d", "e"], order: ["a", "b", "c"], left: ["d", "e"],
  guess: {}, look: 180, visits: [], attempts: {}, secs: 2400, ...over,
});
const meta = (id: string, type = "arrangement", difficulty: LrMeta["difficulty"] = "medium", minutes = 10): LrMeta =>
  ({ id, title: id, type: type as LrMeta["type"], difficulty, minutes, questions: 5, since: "2026-10-01", v: "x" });
const metaOf = (ms: LrMeta[]) => (id: string) => ms.find((m) => m.id === id);

describe("Arena deal (F56, D61)", () => {
  it("leaves out sets of separate short puzzles", () => {
    expect(ARENA_POOL.length).toBeGreaterThanOrEqual(30);
    expect(ARENA_POOL.some((m) => m.id === "venn-syllogisms" || m.id === "clk-station-clock")).toBe(false);
    expect(LR_CATALOG.filter((m) => m.apart).every((m) => !ARENA_POOL.includes(m))).toBe(true);
  });

  it("deals five distinct sets, never tried or dealt, at least three types, at most one easy, same seed same round", () => {
    const lr = [att("x", ARENA_POOL[0].id, 3, 0, 600)];
    const before = round({ sets: ARENA_POOL.slice(1, 6).map((m) => m.id) });
    const r = pickRound(lr, [before], "seed-1", "2026-11-02")!;
    expect(r.replay).toBe(false);
    expect(new Set(r.sets).size).toBe(ARENA_SETS);
    r.sets.forEach((id) => { expect(id).not.toBe(ARENA_POOL[0].id); expect(before.sets).not.toContain(id); });
    const ms = r.sets.map((id) => ARENA_POOL.find((m) => m.id === id)!);
    expect(new Set(ms.map((m) => m.type)).size).toBeGreaterThanOrEqual(3);
    expect(ms.filter((m) => m.difficulty === "easy").length).toBeLessThanOrEqual(1);
    expect(pickRound(lr, [before], "seed-1", "2026-11-02")).toEqual(r);
    expect(pickRound(lr, [before], "seed-2", "2026-11-02")!.sets).not.toEqual(r.sets);
  });

  it("offers a replay round of sets touched 30 or more days ago when fewer than five are fresh, else nothing", () => {
    const pool = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"].map((id, i) => meta(id, ["arrangement", "venn", "routes"][i % 3]));
    const old = [att("o1", "p1", 1, 0, 60, "2026-10-10"), att("o2", "p2", 1, 0, 60, "2026-10-10")];
    expect(pickRound(old, [], "s", "2026-11-02", pool)).toMatchObject({ replay: false });
    const recent = [...old, att("n1", "p3", 1, 0, 60, "2026-10-30"), att("n2", "p4", 1, 0, 60, "2026-10-30")];
    expect(freshLeft(recent, [], pool)).toBe(3);
    expect(pickRound(recent, [], "s", "2026-11-02", pool)).toBeUndefined();
    const r = pickRound(recent, [], "s", "2026-11-30", pool)!;
    expect(r.replay).toBe(true);
    expect(new Set(r.sets).size).toBe(5);
  });

  it("keeps to the rules when it can, and fills from the rest when it cannot", () => {
    const pool = ["e1", "e2", "e3", "e4", "e5"].map((id) => meta(id, "arrangement", "easy"));
    expect(pickRound([], [], "s", "2026-11-02", pool)!.sets).toHaveLength(5);
  });
});

describe("Arena results and selection accuracy (D60)", () => {
  // a: picked first, 4 right in 10 min (12 marks, 1.2/min); b: second, 1 right 1 wrong in 15 min (2 marks); c: third, 6 minutes, nothing answered.
  const lr = [att("ta", "a", 4, 0, 600), att("tb", "b", 1, 1, 900)];
  const r = round({ visits: [["a", 180, 780], ["b", 780, 1680], ["c", 1680, 2040]], attempts: { a: "ta", b: "tb" }, guess: { a: { min: 10, right: 4 }, b: { min: 10 } } });

  it("reads each set's result from the round, a spent-but-blank set as 0, an untouched set as nothing", () => {
    expect(resultOf(r, "a", lr)).toEqual({ right: 4, marks: 12, mins: 10 });
    expect(resultOf(r, "b", lr)).toEqual({ right: 1, marks: 2, mins: 15 });
    expect(resultOf(r, "c", lr)).toEqual({ right: 0, marks: 0, mins: 6 });
    expect(resultOf(r, "d", lr)).toBeUndefined();
  });

  it("counts a pair right when the earlier pick earned at least as much a minute", () => {
    expect(selectionAccuracy(r, lr)).toEqual({ right: 3, pairs: 3 });
    const flipped = { ...r, order: ["c", "b", "a"] };
    expect(selectionAccuracy(flipped, lr)).toEqual({ right: 0, pairs: 3 });
  });

  it("lets a left set join when it is solved later in practice, and never pairs two left sets", () => {
    const later = [...lr, att("pd", "d", 5, 0, 480, "2026-11-03")];
    expect(resultOf(r, "d", later)).toEqual({ right: 5, marks: 15, mins: 8, later: true });
    // d (left, 1.9/min) beats a, b and c, so each of those three pairs is wrong.
    expect(selectionAccuracy(r, later)).toEqual({ right: 3, pairs: 6 });
    const both = [...later, att("pe", "e", 5, 0, 480, "2026-11-03")];
    expect(selectionAccuracy(r, both)!.pairs).toBe(9);
  });

  it("shows nothing under three pairs", () => {
    expect(selectionAccuracy(round({ visits: [["a", 0, 600]], attempts: { a: "ta" } }), lr)).toBeUndefined();
  });

  it("gives a trend only from three counted rounds, leaving replays out", () => {
    const rs = [1, 2, 3].map((i) => ({ ...r, id: "r" + i, updatedAt: i }));
    expect(arenaTrend(rs.slice(0, 2), lr)).toBeUndefined();
    expect(arenaTrend(rs, lr)).toEqual({ pct: 100, rounds: 3, byRound: [100, 100, 100] });
    expect(arenaTrend([...rs.slice(0, 2), { ...rs[2], replay: true }], lr)).toBeUndefined();
  });

  it("scores the round against the most it could score", () => {
    expect(roundScore(r, lr, metaOf(["a", "b", "c", "d", "e"].map((id) => meta(id))))).toEqual({ marks: 14, max: 75 });
  });

  it("names the set that cost most from recorded time only", () => {
    expect(costliest(r, lr)).toEqual({ set: "c", mins: 6, right: 0, marks: 0 });
    expect(costliest({ ...r, visits: r.visits.slice(0, 2) }, lr)).toEqual({ set: "b", mins: 15, right: 1, marks: 2 });
  });

  it("writes one sentence per set from numbers, with our estimate for a left set", () => {
    const ms = metaOf([meta("a"), meta("b"), meta("c"), meta("d", "venn", "hard", 9), meta("e")]);
    expect(debrief(r, lr, ms).map((x) => x.text)).toEqual([
      "A looked like 10 minutes and 4 right; it took 10 minutes for 4 right.",
      "B looked like 10 minutes; it took 15 minutes for 1 right.",
      "You spent 6 minutes on C and answered nothing.",
      "You left D. Our estimate: 9 minutes for 5 questions.",
      "You left E. Our estimate: 10 minutes for 5 questions.",
    ]);
    const unreached = { ...r, visits: r.visits.slice(0, 2) };
    expect(debrief(unreached, lr, ms)[2].text).toBe("You picked C third but did not reach it. Our estimate: 10 minutes for 5 questions.");
  });

  it("draws the 40 minutes as lanes: the look, then each set's visits and result", () => {
    const { g, lit } = visitLanes(r, lr, metaOf(["a", "b", "c", "d", "e"].map((id) => meta(id))));
    expect(g.rows).toEqual(["Look", "A", "B", "C", "D", "E"]);
    expect(g.bars).toEqual([[0, 0, 3, ""], [1, 3, 13, ""], [2, 13, 28, ""], [3, 28, 34, ""]]);
    expect(g.frames[0].map((row) => row[0]![0])).toEqual(["", "4 of 5", "1 of 5", "0 of 5", "left", "left"]);
    expect(lit).toEqual([0, 1, 2, 3]);
  });
});

describe("Arena rounds in state and sync", () => {
  it("keeps a good round, drops a broken one, and syncs as kind arena", () => {
    const good = round({ visits: [["a", 0, 60]], attempts: { a: "ta" }, guess: { a: { min: 10, right: 3 } }, replay: true });
    const st = normalize({ ...blankState(), arenaRounds: [good, { id: "", d: "x", sets: [] }, { ...good, id: "r2", visits: [["a", 9, 1], ["b", "x", 2]], guess: { a: { min: -1, right: 1.5 } } }] });
    expect(st.arenaRounds[0]).toEqual(good);
    expect(st.arenaRounds).toHaveLength(2);
    expect(st.arenaRounds[1].visits).toEqual([]);
    expect(st.arenaRounds[1].guess).toEqual({ a: {} });
    expect(toRecords(st).filter((x) => x.kind === "arena").map((x) => x.id)).toEqual(["r1", "r2"]);
  });
});
