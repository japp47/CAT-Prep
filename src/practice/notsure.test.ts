import { describe, expect, it } from "vitest";
import { blankState, normalize } from "../lib/state";
import { CONTENT } from "./full";
import { rcError, recordRc } from "./record";
import { rcRedoKey } from "./redo";
import { luckyGuesses } from "./report";
import { rcVersion } from "./types";

describe("not sure", () => {
  const set = CONTENT.rcSets[0];
  const right = set.questions.map((q) => q.answer);

  it("sends a right answer marked not sure to the redo queue once, and counts it as a lucky guess", () => {
    const st = blankState();
    recordRc(st, "a", set, right, 400, 90, "library", "2026-10-21", [0]);
    expect(st.redo.map((r) => r.k)).toEqual([rcRedoKey(set.id, 0)]);
    expect(st.rcAttempts[0]).toMatchObject({ c: set.questions.length, w: 0, unsure: [0], lucky: [0], v: rcVersion(set) });
    expect(luckyGuesses(st)).toEqual([["RC", 1]]);
  });
  it("does not change the score", () => {
    const a = blankState(), b = blankState();
    recordRc(a, "a", set, right, 400, 90, "library", "2026-10-21");
    recordRc(b, "b", set, right, 400, 90, "library", "2026-10-21", [0, 1]);
    expect([b.rcAttempts[0].c, b.rcAttempts[0].w]).toEqual([a.rcAttempts[0].c, a.rcAttempts[0].w]);
  });
  it("pre-fills the cause of a logged miss as a guess", () => {
    expect(rcError(set, 0, (right[0] + 1) % 4, "2026-10-21", true).cause).toBe("guess");
    expect(rcError(set, 0, (right[0] + 1) % 4, "2026-10-21").cause).toBeUndefined();
  });
  it("survives a save and load", () => {
    const st = blankState();
    recordRc(st, "a", set, right, 400, 90, "library", "2026-10-21", [1]);
    st.errors.push({ ...rcError(set, 0, null, "2026-10-21"), cause: "trap", causeWas: "slip", trapWas: "" });
    const back = normalize(JSON.parse(JSON.stringify(st)));
    expect(back.rcAttempts).toEqual(st.rcAttempts);
    expect(back.errors).toEqual(st.errors);
  });
});
