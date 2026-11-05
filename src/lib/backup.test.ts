import { describe, expect, it } from "vitest";
import { blankState } from "./state";
import { daysAgo, holds } from "./backup";

describe("what a backup holds (Settings)", () => {
  it("names only what there is, joined in plain words", () => {
    const st = blankState();
    expect(holds(st)).toBe("");
    st.days["2026-11-01"] = { done: {} };
    expect(holds(st)).toBe("1 day of study");
    st.days["2026-11-02"] = { done: {} };
    st.vocab.push({ id: "w", w: "laconic", m: "", s: "", b: 0, due: "2026-11-05" });
    st.errors.push({ id: "e", d: "2026-11-02", sec: "VARC", t: "RC", trap: "", src: "", why: "", fix: "" });
    expect(holds(st)).toBe("2 days of study, 1 mistake logged and 1 word");
  });

  it("says when the last backup was made", () => {
    expect([0, 1, 12].map(daysAgo)).toEqual(["today", "yesterday", "12 days ago"]);
  });
});
