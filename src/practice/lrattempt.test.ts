import { describe, expect, it } from "vitest";
import { blankState, normalize } from "../lib/state";
import { toRecords } from "../lib/sync/records";
import { historyItems } from "./history";
import { LR_SETS } from "./lr";
import { lrError, recordLr, saveLrPostMortem, scoreLr } from "./lrattempt";
import { lrVersion } from "./types";

const set = LR_SETS.find((s) => s.id === "arr-six-colleagues")!;
// Q1 to Q3 are MCQs (answers C, A, C), Q4 and Q5 are typed (13 and 3).
const ans = [2, 1, null, "13", "4"];

describe("LR attempts (F23, F86)", () => {
  it("scores as CAT does: +3 right, -1 for a wrong MCQ, nothing for a wrong typed answer or a blank", () => {
    expect(scoreLr(set, ans)).toEqual({ c: 2, w: 1, tw: 1, skipped: 1, marks: 5 });
  });

  it("saves the attempt with its version and logs one DILR practice set", () => {
    const st = blankState();
    recordLr(st, "a1", set, ans, 300.4, "2026-10-25", [1], 1000);
    expect(st.lrAttempts).toEqual([{ id: "a1", d: "2026-10-25", set: set.id, ans, c: 2, w: 1, secs: 300, updatedAt: 1000, v: lrVersion(set), unsure: [1] }]);
    expect(st.practice).toEqual([{ id: "a1p", d: "2026-10-25", sec: "DILR", t: "LR", a: 4, c: 2, src: "Practice: " + set.title }]);
  });

  it("saves the post-mortem later with a newer time, so sync carries it", () => {
    const st = blankState();
    recordLr(st, "a1", set, ans, 300, "2026-10-25", [], 1000);
    saveLrPostMortem(st, "a1", { key: 12, time: "cases", slip: "misread", slipClue: 9 }, 900);
    expect(st.lrAttempts[0].pm).toEqual({ key: 12, time: "cases", slip: "misread", slipClue: 9 });
    expect(st.lrAttempts[0].updatedAt).toBe(1001);
    expect(toRecords(st).some((r) => r.kind === "lr" && r.id === "a1")).toBe(true);
  });

  it("survives a reload and drops values it does not know", () => {
    const st = blankState();
    recordLr(st, "a1", set, ans, 300, "2026-10-25", [], 1000);
    const raw = JSON.parse(JSON.stringify(st));
    raw.lrAttempts[0].pm = { key: 3, time: "daydreaming", slip: "none", slipClue: -1 };
    raw.lrAttempts.push({ id: "", set: "x" });
    const back = normalize(raw);
    expect(back.lrAttempts).toHaveLength(1);
    expect(back.lrAttempts[0].ans).toEqual(ans);
    expect(back.lrAttempts[0].pm).toEqual({ key: 3, slip: "none" });
  });

  it("shows in History with the clue that opened the set", () => {
    const st = blankState();
    recordLr(st, "a1", set, ans, 300, "2026-10-25", [], 1000);
    saveLrPostMortem(st, "a1", { key: 12 }, 2000);
    const item = historyItems(st).find((x) => x.id === "lr-a1")!;
    expect(item.title).toBe(set.title);
    expect(item.detail).toBe("LR set, 2 of 5 right, 1 skipped, 5 min. Opened with clue 12");
    expect(item.href).toBe(`/practice/lr/${set.id}?review=a1`);
    // The practice row the attempt wrote is not listed twice.
    expect(historyItems(st).filter((x) => x.d === "2026-10-25")).toHaveLength(1);
  });

  it("writes an Error log row under DILR with the answer and its explanation", () => {
    const e = lrError(set, 4, "4", "2026-10-25", false, "a1");
    expect(e).toMatchObject({ sec: "DILR", t: "Arrangement", src: `LR: ${set.title}, Q5`, att: "a1" });
    expect(e.why).toContain("Answered 4.");
    expect(e.fix).toContain("Answer 3.");
  });
});
