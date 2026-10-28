import { describe, expect, it } from "vitest";
import { holds, markClue, misread, openCases, ruledOut, seatings, seatsFor, solve, type Board, type Expr, type LrModel, type RuleClue, type SeatClue } from "./lrlogic";

const row6: Board = { layout: "row", n: 6 };
const table6: Board = { layout: "circle", n: 6 };
const at = (m: Record<string, number>) => (r: string) => m[r] - 1;

describe("clues as code (D47)", () => {
  it("reads left and right in a row as the reader does, and the other way when they face the reader", () => {
    const e: Expr = { left: "A", of: "B", d: 1 };
    expect(holds(e, at({ A: 2, B: 3 }), row6)).toBe(true);
    expect(holds(e, at({ A: 4, B: 3 }), row6)).toBe(false);
    expect(holds(e, at({ A: 4, B: 3 }), { ...row6, facing: "toward" })).toBe(true);
    expect(holds({ left: "A", of: "B", d: "any" }, at({ A: 1, B: 5 }), row6)).toBe(true);
    expect(holds({ right: "A", of: "B", d: "any" }, at({ A: 1, B: 5 }), row6)).toBe(false);
  });

  it("goes round a table to the left with the seat numbers when facing the centre, and against them facing out", () => {
    expect(holds({ left: "A", of: "B", d: 1 }, at({ B: 6, A: 1 }), table6)).toBe(true);
    expect(holds({ right: "A", of: "B", d: 2 }, at({ B: 1, A: 5 }), table6)).toBe(true);
    expect(holds({ left: "A", of: "B", d: 1 }, at({ B: 1, A: 6 }), { ...table6, facing: "out" })).toBe(true);
    expect(holds({ opp: ["A", "B"] }, at({ A: 2, B: 5 }), table6)).toBe(true);
  });

  it("counts the people between the short way round, and never counts a seat twice", () => {
    expect(holds({ gap: ["A", "B"], n: 1 }, at({ A: 1, B: 5 }), table6)).toBe(true);
    expect(holds({ gap: ["A", "B"], n: 2, cmp: "ge" }, at({ A: 1, B: 6 }), row6)).toBe(true);
    expect(holds({ gap: ["A", "B"], n: 0 }, at({ A: 2, B: 2 }), row6)).toBe(false);
    expect(holds({ next: ["A", "B"] }, at({ A: 1, B: 6 }), table6)).toBe(true);
    expect(holds({ next: ["A", "B"] }, at({ A: 1, B: 6 }), row6)).toBe(false);
  });

  it("joins clues with not, and, or, either-or-not-both and if-then", () => {
    const pos = at({ A: 1, B: 2 });
    const yes: Expr = { next: ["A", "B"] }, no: Expr = { end: "B" };
    expect(holds({ xor: [yes, no] }, pos, row6)).toBe(true);
    expect(holds({ if: yes, then: no }, pos, row6)).toBe(false);
    expect(holds({ if: no, then: yes }, pos, row6)).toBe(true);
    expect(holds({ and: [yes, { not: no }] }, pos, row6)).toBe(true);
  });

  it("counts seatings of a round table once per turn, and a row's every way", () => {
    const g = new Map([["A", 0], ["B", 0], ["C", 0]]);
    expect(seatings({ layout: "circle", n: 3 }, g, ["A", "B", "C"], [])).toHaveLength(2);
    expect(seatings({ layout: "row", n: 3 }, g, ["A", "B", "C"], [])).toHaveLength(6);
  });

  it("finds how many ways the people a clue names can sit, given that clue alone", () => {
    const m: LrModel = { set: "x", board: table6, groups: [{ name: "P", values: ["A", "B", "C", "D", "E", "F"] }], clues: [{ right: "A", of: "B", d: 2 }, { not: { next: ["D", "B"] } }] };
    expect(openCases(m, [1])).toBe(1);
    expect(openCases(m, [2])).toBe(3);
    // Both clues: A and B fixed, D in one of two seats not beside B, the other three any way round.
    expect(solve(m)).toHaveLength(12);
  });
});

describe("the clue translator's marking (F83)", () => {
  const onlyIf: RuleClue = { id: "x", kind: "onlyif", text: "P only if Q.", p: "P", q: "Q", np: "not P", nq: "not Q", rule: "onlyif" };
  it("rules out exactly the cases a rule forbids", () => {
    expect(ruledOut("onlyif")).toEqual(["p"]);
    expect(ruledOut("if")).toEqual(["q"]);
    expect(ruledOut("unless")).toEqual(["neither"]);
    expect(ruledOut("iff")).toEqual(["p", "q"]);
    expect(ruledOut("xor")).toEqual(["both", "neither"]);
    expect(ruledOut("nand")).toEqual(["both"]);
    expect(ruledOut("nor")).toEqual(["both", "p", "q"]);
  });
  it("names a reversed reading, and leaves an answer that matches no misreading unnamed", () => {
    expect(markClue(onlyIf, ["p"])).toEqual({ ok: true });
    expect(markClue(onlyIf, ["q"])).toEqual({ ok: false, miss: "reversed" });
    expect(markClue(onlyIf, ["neither"])).toEqual({ ok: false, miss: undefined });
  });
  it("works out a seating clue's seats, and the seats each misreading would give", () => {
    const c: SeatClue = { id: "y", kind: "count", text: "", board: { layout: "row", n: 7 }, fixed: { Asha: 2 }, who: "Dev", expr: { gap: ["Dev", "Asha"], n: 2 }, traps: ["seats-for-people", "at-least"] };
    expect(seatsFor(c, c.expr)).toEqual([5]);
    expect(markClue(c, [4])).toEqual({ ok: false, miss: "seats-for-people" });
    expect(markClue(c, [7, 6, 5])).toEqual({ ok: false, miss: "at-least" });
    expect(markClue(c, [5])).toEqual({ ok: true });
  });
  it("changes only what a misreading touches, inside and/or/not too", () => {
    expect(misread({ left: "A", of: "B", d: 1 }, "swapped")).toEqual({ right: "A", of: "B", d: 1 });
    expect(misread({ left: "A", of: "B", d: 1 }, "somewhere")).toEqual({ left: "A", of: "B", d: "any" });
    expect(misread({ left: "A", of: "B", d: "any" }, "somewhere")).toBeNull();
    expect(misread({ and: [{ gap: ["A", "B"], n: 2 }, { end: "A" }] }, "at-least")).toEqual({ and: [{ gap: ["A", "B"], n: 2, cmp: "ge" }, { end: "A" }] });
    expect(misread({ within: "A", from: 2, to: 6 }, "inclusive-ends")).toEqual({ within: "A", from: 2, to: 6, incl: true });
  });
});
