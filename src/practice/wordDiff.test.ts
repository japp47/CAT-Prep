import { describe, expect, it } from "vitest";
import { diffWords } from "./wordDiff";

describe("word diff for the smallest fix", () => {
  it("marks the words added and struck, keeping the rest", () => {
    expect(diffWords("Opaque algorithms are acceptable if tested.", "Opaque algorithms may be acceptable if tested.")).toEqual([
      { t: "Opaque algorithms", op: "same" }, { t: "are", op: "del" }, { t: "may be", op: "add" }, { t: "acceptable if tested.", op: "same" },
    ]);
  });
  it("ignores case and punctuation when matching, and handles an empty side", () => {
    expect(diffWords("Cities grow", "cities grow.")).toEqual([{ t: "cities grow.", op: "same" }]);
    expect(diffWords("", "New words")).toEqual([{ t: "New words", op: "add" }]);
  });
  it("loses no word of either text", () => {
    const a = "the cat sat on the mat today", b = "a cat sat quietly on a mat";
    const d = diffWords(a, b);
    expect(d.filter((p) => p.op !== "add").map((p) => p.t).join(" ")).toBe(a);
    expect(d.filter((p) => p.op !== "del").map((p) => p.t).join(" ")).toBe(b);
  });
});
