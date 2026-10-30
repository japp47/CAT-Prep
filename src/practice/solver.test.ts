import { describe, expect, it } from "vitest";
import { allCases, evalCond, evalTerm, gridCsp, labelOf, matches, namesOf, orderVars, search, type Csp, type GridModel } from "./solver";

const three: Csp["vars"] = ["x", "y", "z"].map((name) => ({ name, domain: [1, 2, 3] }));

describe("the general solver (D51)", () => {
  it("counts every filling when nothing rules any out, and keeps distinct values apart", () => {
    expect(search({ vars: three, distinct: [], rules: [] })).toBe(27);
    expect(search({ vars: three, distinct: [["x", "y", "z"]], rules: [] })).toBe(6);
  });
  it("tests each rule once everything it reads is filled, and stops at the cap", () => {
    const csp: Csp = { vars: three, distinct: [["x", "y", "z"]], rules: [{ deps: ["x", "z"], test: (g) => (g("x") as number) < (g("z") as number) }] };
    expect(allCases(csp).map((c) => [c.get("x"), c.get("y"), c.get("z")])).toEqual([[1, 2, 3], [1, 3, 2], [2, 1, 3]]);
    expect(search(csp, 2)).toBe(2);
  });
  it("finds nothing when a rule that reads nothing fails, and refuses a rule over an unknown name", () => {
    expect(search({ vars: three, distinct: [], rules: [{ deps: [], test: () => false }] })).toBe(0);
    expect(() => search({ vars: three, distinct: [], rules: [{ deps: ["w"], test: () => true }] })).toThrow(/"w"/);
  });
  it("orders the names the rules read first", () => {
    expect(orderVars(three, ["z", "x"]).map((v) => v.name)).toEqual(["z", "x", "y"]);
  });
});

describe("grid conditions", () => {
  const vals: Record<string, string | number> = { A: "T", B: "L", p: 1, q: 0, r: 1 };
  const get = (n: string) => vals[n];
  it("reads values, sums, counts and comparisons", () => {
    expect(evalCond({ is: ["A", "T"] }, get)).toBe(true);
    expect(evalCond({ isnt: ["B", "L"] }, get)).toBe(false);
    expect(evalTerm({ sum: [{ v: "p" }, { v: "q" }, { v: "r" }, 4] }, get)).toBe(6);
    expect(evalTerm({ count: [{ is: ["A", "T"] }, { is: ["B", "T"] }] }, get)).toBe(1);
    expect(evalCond({ ge: [{ sum: [{ v: "p" }, { v: "r" }] }, 2] }, get)).toBe(true);
    // A value that is not a number adds nothing to a sum.
    expect(evalTerm({ sum: [{ v: "A" }] }, get)).toBe(0);
  });
  it("joins with not, and, or, xor, iff and if", () => {
    const t = { is: ["A", "T"] as [string, string] }, f = { is: ["B", "T"] as [string, string] };
    expect(evalCond({ xor: [t, f] }, get)).toBe(true);
    expect(evalCond({ iff: [t, f] }, get)).toBe(false);
    expect(evalCond({ if: f, then: t }, get)).toBe(true);
    expect(evalCond({ if: t, then: f }, get)).toBe(false);
    expect(evalCond({ not: { and: [t, f] } }, get)).toBe(true);
    expect(evalCond({ or: [f, { not: t }] }, get)).toBe(false);
    expect(namesOf({ iff: [t, { ge: [{ v: "p" }, 1] }] })).toEqual(["A", "p"]);
  });
});

describe("a league", () => {
  const league = { teams: ["X", "Y", "Z"], win: 3, draw: 1 };
  const m: GridModel = { set: "t", kind: "grid", vars: [], league, clues: [{ beat: ["Z", "X"] }, { drew: ["Y", "Z"] }], facts: [{ eq: [{ points: "X" }, 3] }] };
  it("has one match per pair, named in team order", () => {
    expect(matches(league).map(([n]) => n)).toEqual(["X v Y", "X v Z", "Y v Z"]);
  });
  it("reads wins, draws, losses and points from each team's side", () => {
    const res: Record<string, string> = { "X v Y": "W", "X v Z": "L", "Y v Z": "D" };
    const get = (n: string) => res[n];
    expect([evalTerm({ wins: "X" }, get, league), evalTerm({ losses: "X" }, get, league), evalTerm({ points: "Z" }, get, league), evalTerm({ draws: "Y" }, get, league)]).toEqual([1, 1, 4, 1]);
    expect(evalCond({ beat: ["Z", "X"] }, get, league)).toBe(true);
    expect(evalCond({ beat: ["X", "Z"] }, get, league)).toBe(false);
    expect(evalCond({ drew: ["Z", "Y"] }, get, league)).toBe(true);
    expect(labelOf(m, "X v Z", "L")).toBe("Z won");
    expect(labelOf(m, "Y v Z", "D")).toBe("Draw");
  });
  it("solves a small league, and counts only what picked clues name for first move", () => {
    // Z beat X and Y drew Z; X has 3 points, so X beat Y.
    const cases = allCases(gridCsp(m, [1, 2]));
    expect(cases.map((c) => c.get("X v Y"))).toEqual(["W"]);
    const only = gridCsp(m, [1], true);
    expect(only.vars.map((v) => v.name)).toEqual(["X v Z"]);
    expect(search(only)).toBe(1);
  });
});
