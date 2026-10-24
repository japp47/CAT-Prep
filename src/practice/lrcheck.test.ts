import { describe, expect, it } from "vitest";
import { lrRight, titaMatches } from "./lrcheck";
import type { LrQuestion } from "./types";

describe("typed LR answers", () => {
  it("compares numbers by value and codes without case, spaces or commas", () => {
    expect(titaMatches("12.50", "12.5")).toBe(true);
    expect(titaMatches(" 07 ", "7")).toBe(true);
    expect(titaMatches("b, d, a", "BDA")).toBe(true);
    expect(titaMatches("13", "12")).toBe(false);
    expect(titaMatches("", "0")).toBe(false);
    expect(titaMatches("BAD", "BDA")).toBe(false);
  });
  it("marks MCQ by option and TITA by text; a skip is never right", () => {
    const mcq: LrQuestion = { stem: "?", kind: "mcq", options: ["a", "b", "c", "d"], answer: 2, uses: [], why: ["."] };
    const tita: LrQuestion = { stem: "?", kind: "tita", answer: "4", uses: [], why: ["."] };
    expect(lrRight(mcq, 2)).toBe(true);
    expect(lrRight(mcq, 1)).toBe(false);
    expect(lrRight(mcq, null)).toBe(false);
    expect(lrRight(tita, "4.0")).toBe(true);
    expect(lrRight(tita, "")).toBe(false);
  });
});
