import { describe, expect, it } from "vitest";
import cluesJson from "../../content/lrdrill/clues.json";
import mccJson from "../../content/lrdrill/mcc.json";
import modelsJson from "../../content/lrdrill/models.json";
import type { LrDrillRun } from "../lib/state";
import { LR_SETS } from "./lr";
import { backTo, binWhy, clueReport, nextDrill, firstMoveStep, fixedBy, keptBy, mccSolved, movers, moveReason, nextOf, pickClues, type MccDrill } from "./lrdrill";
import { answerOf, CLUE_KIND, groupMap, isRuleClue, kindOfClue, kindOfExpr, misread, refsOf, seatRows, settle, solve, trapsOf, type ClueItem, type ClueKind, type Expr, type LrModel } from "./lrlogic";

const CLUES = cluesJson as ClueItem[];
const MODELS = modelsJson as unknown as LrModel[];
const MCC = mccJson as unknown as MccDrill[];
const setOf = (id: string) => LR_SETS.find((s) => s.id === id);

/** Every "d": "any" sits in a row, and every "opp" at a table with an even number of seats. */
function wellFormed(e: Expr, layout: "row" | "circle"): boolean {
  let ok = true;
  JSON.stringify(e, (k, v) => { if (k === "d" && v === "any" && layout !== "row") ok = false; if (k === "opp" && layout !== "circle") ok = false; return v; });
  return ok;
}

describe("set models (D47): the solver agrees with every modelled set", () => {
  for (const m of MODELS) {
    const set = setOf(m.set);
    it(`${m.set}: one expression per clue, naming only the set's people and things`, () => {
      expect(set, m.set).toBeDefined();
      expect(m.clues).toHaveLength(set!.clues.length);
      // Every seat is taken, so seats between are people between.
      expect(m.groups[0].values).toHaveLength(m.board.n);
      m.groups.forEach((g) => expect(g.values).toHaveLength(m.board.n));
      const known = groupMap(m);
      expect(known.size).toBe(m.groups.length * m.board.n);
      m.clues.forEach((c, i) => {
        refsOf(c).forEach((r) => expect(known.has(r), `clue ${i + 1}: ${r}`).toBe(true));
        expect(wellFormed(c, m.board.layout), `clue ${i + 1}`).toBe(true);
      });
    });
    it(`${m.set}: as many seatings as the set says, each matching its final table`, () => {
      const cases = solve(m);
      expect(cases).toHaveLength(set!.solution.cases!);
      const grid = set!.solution.grid!;
      cases.forEach((c) => {
        const rows = seatRows(m, settle(m, c));
        if (grid.rows.length === 1) {
          // One row of people round the table: seat k holds the k-th name.
          expect(rows.map((r) => r[0])).toEqual(grid.rows[0].slice(1));
          return;
        }
        // One row per seat: seat label, then one column per group, "x or y" where the set leaves it open.
        grid.rows.forEach((g, k) => g.slice(1).forEach((cell, gi) => expect(cell.split(" or "), `${m.set} seat ${k + 1}`).toContain(rows[k][gi])));
      });
    });
  }
});

describe("the clue translator's content (F83)", () => {
  it("has ids that are unique, start with their kind's prefix, and at least ten clues of every kind the research note names", () => {
    expect(new Set(CLUES.map((c) => c.id)).size).toBe(CLUES.length);
    CLUES.forEach((c) => expect(kindOfClue(c.id), c.id).toBe(c.kind));
    (Object.keys(CLUE_KIND) as ClueKind[]).forEach((k) => expect(CLUES.filter((c) => c.kind === k).length, k).toBeGreaterThanOrEqual(10));
  });
  for (const c of CLUES) {
    it(`${c.id}: a right answer, and misreadings that each give a different one`, () => {
      expect(c.text.trim()).toMatch(/[.?]$/);
      if (c.from) expect(setOf(c.from), c.from).toBeDefined();
      const right = answerOf(c);
      expect(right.length).toBeGreaterThan(0);
      const traps = trapsOf(c);
      expect(traps.length).toBeGreaterThan(0);
      traps.forEach((t) => {
        expect(t.answer.length, t.how).toBeGreaterThan(0);
        expect([...t.answer].sort(), t.how).not.toEqual([...right].sort());
      });
      if (isRuleClue(c)) {
        [c.p, c.q, c.np, c.nq].forEach((x) => expect(x.trim()).not.toBe(""));
        return;
      }
      // Every misreading listed changes the clue; the people seated are on the board, apart and not the one to place.
      c.traps.forEach((how) => expect(misread(c.expr, how), how).not.toBeNull());
      const seats = Object.values(c.fixed);
      expect(new Set(seats).size).toBe(seats.length);
      seats.forEach((s) => expect(s >= 1 && s <= c.board.n).toBe(true));
      expect(c.who in c.fixed).toBe(false);
      refsOf(c.expr).forEach((r) => expect(r === c.who || r in c.fixed, r).toBe(true));
      expect(wellFormed(c.expr, c.board.layout)).toBe(true);
    });
  }
});

describe("must, could, cannot (F84)", () => {
  it("has drills with unique ids, each on a modelled set", () => {
    expect(new Set(MCC.map((d) => d.id)).size).toBe(MCC.length);
    MCC.forEach((d) => expect(MODELS.some((m) => m.set === d.set), d.id).toBe(true));
  });
  for (const d of MCC) {
    it(`${d.id}: two or three cases, and six statements that fill all three bins`, () => {
      const m = MODELS.find((x) => x.set === d.set)!;
      const { cases, bins } = mccSolved(d, m);
      expect(cases.length).toBeGreaterThanOrEqual(2);
      expect(cases.length).toBeLessThanOrEqual(3);
      expect(d.statements).toHaveLength(6);
      (["must", "could", "cannot"] as const).forEach((b) => expect(bins.filter((x) => x === b).length, b).toBeGreaterThanOrEqual(1));
      const known = groupMap(m);
      d.statements.forEach((s) => refsOf(s.expr).forEach((r) => expect(known.has(r), r).toBe(true)));
      d.drop.forEach((k) => expect(k >= 1 && k <= m.clues.length).toBe(true));
    });
  }
});

describe("first move (F85)", () => {
  const table = MODELS.find((m) => m.set === "arr-round-table")!;
  it("shows how many ways each clue leaves open, and the fewest", () => {
    const s = firstMoveStep(table, []);
    expect(s.counts.map((c) => c.n)).toEqual([1, 1, 3, 1]);
    expect(s.best).toBe(1);
  });
  it("prefers a next clue that names someone already seated", () => {
    const s = firstMoveStep(table, [1]);
    const n = Object.fromEntries(s.counts.map((c) => [c.clue, c.n]));
    // Chitra opposite Asha links to the pair already placed; Esha beside Chitra does not.
    expect(n[2]).toBe(1);
    expect(n[4]).toBeGreaterThan(1);
  });
  it("draws the seating once the clues picked fix it", () => {
    const s = fixedBy(table, [1, 2]);
    expect(s).not.toBeNull();
    expect(s!.get("Asha")).toBe(0);
    expect(fixedBy(table, [3])).toBeNull();
  });
  it("finishes a step on every modelled set quickly enough for a phone", () => {
    for (const m of MODELS) {
      const t = performance.now();
      expect(firstMoveStep(m, []).counts).toHaveLength(m.clues.length);
      expect(performance.now() - t, m.set).toBeLessThan(500);
    }
  });
});

describe("drill runs", () => {
  const run = (items: { k: string; ok: boolean; miss?: string }[], kind: LrDrillRun["kind"] = "clue", ref?: string): LrDrillRun => ({ id: Math.random().toString(36), d: "2026-10-29", kind, items, secs: 60, ...(ref ? { ref } : {}) });
  it("picks eight clues, unseen first, with no more than two of one kind", () => {
    const pick = pickClues(CLUES, [], 8, () => 0.5);
    expect(pick).toHaveLength(8);
    const per = new Map<string, number>();
    pick.forEach((c) => per.set(c.kind, (per.get(c.kind) ?? 0) + 1));
    [...per.values()].forEach((n) => expect(n).toBeLessThanOrEqual(2));
  });
  it("brings back a clue read wrong before clues already read right", () => {
    const seen = CLUES.map((c) => ({ k: c.id, ok: c.id !== "oi-toss" }));
    expect(pickClues(CLUES, [run(seen)], 8, () => 0.5)[0].id).toBe("oi-toss");
  });
  it("adds up right answers per kind and names the commonest misreading", () => {
    const r = clueReport([run([{ k: "oi-toss", ok: false, miss: "reversed" }, { k: "oi-fair", ok: false, miss: "reversed" }, { k: "ei-or", ok: true }])]);
    expect(r.answered).toBe(3);
    expect(r.slips[0]).toEqual({ how: "reversed", n: 2 });
    expect(r.kinds[0]).toMatchObject({ kind: "onlyif", c: 0, a: 2 });
  });
  it("opens a drill on a set already solved before one it would give away (D49)", () => {
    const solved = new Set(["arr-friends-drinks"]);
    expect(nextDrill(MCC, (d) => d.id, (d) => d.set, [], "mcc", solved)?.set).toBe("arr-friends-drinks");
    expect(nextDrill(MCC, (d) => d.id, (d) => d.set, [], "mcc", new Set())?.id).toBe(MCC[0].id);
    expect(nextDrill(MODELS, (m) => m.set, (m) => m.set, [], "first", new Set(["arr-six-colleagues"]))?.set).toBe("arr-six-colleagues");
  });
  it("offers the drill never done first, then the one done longest ago", () => {
    const ids = MCC.map((d) => d.id);
    expect(nextOf(MCC, (d) => d.id, [], "mcc")?.id).toBe(ids[0]);
    const runs = ids.map((id) => run([{ k: id + ":0", ok: true }], "mcc", id));
    expect(nextOf(MCC, (d) => d.id, runs, "mcc")?.id).toBe(ids[0]);
    expect(nextOf(MCC, (d) => d.id, runs.slice(1), "mcc")?.id).toBe(ids[0]);
  });
});

describe("explaining and linking the drills (D48)", () => {
  const table = MODELS.find((m) => m.set === "arr-round-table")!;
  const six = MODELS.find((m) => m.set === "arr-six-colleagues")!;
  it("names the seating the left-out clue keeps, which is the set's own answer", () => {
    const d = MCC.find((x) => x.id === "mcc-round-table")!;
    const { cases } = mccSolved(d, table);
    const k = keptBy(d, table, cases);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(cases[k].get("Farhan")).toBe(1);
    expect(keptBy(MCC.find((x) => x.drop.length === 0)!, MODELS.find((m) => m.set === "arr-friends-drinks")!, [])).toBe(-1);
  });
  it("marks only who moves between seatings", () => {
    const { cases } = mccSolved(MCC.find((x) => x.id === "mcc-round-table")!, table);
    expect([...movers(cases)].sort()).toEqual(["Dev", "Farhan"]);
  });
  it("explains a bin in a sentence", () => {
    expect(binWhy([true, true])).toMatch(/must be true/);
    expect(binWhy([false, false])).toMatch(/cannot be true/);
    expect(binWhy([true, false, true])).toBe("True in seatings 1 and 3 but false in seating 2: true in some, so it could be true, but not must.");
  });
  it("says why a move is good or not", () => {
    expect(moveReason(six, [], 12, 1)).toBe("it fixes a seat number");
    expect(moveReason(six, [], 4, 4)).toMatch(/only says where someone is not/);
    expect(moveReason(six, [12], 13, 1)).toMatch(/already placed/);
    expect(moveReason(table, [], 1, 1)).toMatch(/round table/);
  });
  it("finds the translator kind of every modelled set clue it can, so a misread clue leads to its practice", () => {
    expect(kindOfExpr(six.clues[5])).toBe("count");
    expect(kindOfExpr(six.clues[9])).toBe("immediate");
    expect(kindOfExpr(MODELS.find((m) => m.set === "arr-friends-drinks")!.clues[6])).toBe("onlyif");
    expect(kindOfExpr(MODELS.find((m) => m.set === "arr-seven-consultants")!.clues[0])).toBe("facing");
    expect(kindOfExpr(six.clues[11])).toBeUndefined();
  });
  it("runs a single kind when asked", () => {
    const pick = pickClues(CLUES, [], 8, () => 0.5, "between");
    expect(pick).toHaveLength(8);
    pick.forEach((c) => expect(c.kind).toBe("between"));
  });
  it("only goes back to an LR set's page", () => {
    expect(backTo("/practice/lr/arr-round-table?review=abc123")).toBe("/practice/lr/arr-round-table?review=abc123");
    expect(backTo("https://evil.example/")).toBeNull();
    expect(backTo("//evil.example")).toBeNull();
    expect(backTo(null)).toBeNull();
  });
});
