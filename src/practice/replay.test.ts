import { describe, expect, it } from "vitest";
import replayJson from "../../content/lrdrill/replay.json";
import { LR_SETS } from "./lr";
import { REPLAY_OF_SET, answerOf, biggestCut, boardOf, cellKey, COUNT_CAP, FORMATS, hintFor, marksOf, modelOf, settledBy, shownOf, solvedBy, stepCheck, tap, trailOf, ways, wrongMarks, type Marks, type ReplayPuzzle } from "./replay";
import { allCases, gridCsp, gridVars, namesOf } from "./solver";

const PUZZLES = replayJson as unknown as ReplayPuzzle[];

describe("replay sets (F57): every set proven by the solver", () => {
  it("has unique ids, and at least two sets in each of the three formats", () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length);
    FORMATS.forEach((f) => expect(PUZZLES.filter((p) => p.format === f).length, f).toBeGreaterThanOrEqual(2));
  });
  for (const p of PUZZLES) {
    const m = modelOf(p);
    it(`${p.id} has exactly one answer, one expression per clue, and names only its own values`, () => {
      expect(m.clues).toHaveLength(p.clues.length);
      expect(allCases(gridCsp(m, m.clues.map((_, i) => i + 1)), 3)).toHaveLength(1);
      const names = new Set(gridVars(m).map((v) => v.name));
      m.clues.forEach((c, i) => namesOf(c, m.league).forEach((n) => expect(names.has(n), `clue ${i + 1}: ${n}`).toBe(true)));
    });
    it(`${p.id} needs every clue: drop any one and more than one answer fits`, () => {
      m.clues.forEach((_, j) => {
        const rest = m.clues.map((_, i) => i + 1).filter((k) => k !== j + 1);
        expect(allCases(gridCsp(m, rest), 2).length, `without clue ${j + 1}`).toBe(2);
      });
    });
    it(`${p.id}: the worked steps use every clue once, the count never rises, and each step settles something new`, () => {
      expect(p.steps.flatMap((s) => s.use).sort((a, b) => a - b)).toEqual(m.clues.map((_, i) => i + 1));
      const trail = trailOf(p);
      expect(trail).toHaveLength(p.steps.length + 1);
      for (let i = 1; i < trail.length; i++) {
        expect(trail[i].settled.count).toBeLessThan(trail[i - 1].settled.count);
        expect(p.steps[i - 1].say.length).toBeGreaterThan(40);
      }
      expect(trail[trail.length - 1].settled.count).toBe(1);
      // The last board is the answer: every row has its one tick.
      const answer = answerOf(p), groups = boardOf(m);
      expect(solvedBy(groups, marksOf(trail[trail.length - 1].settled), answer)).toBe(true);
    });
    it(`${p.id} is listed for its LR set's review, if it replays one`, () => {
      expect(p.set ? REPLAY_OF_SET[p.set] : undefined).toBe(p.set ? p.id : undefined);
    });
    if (p.set) it(`${p.id} replays the LR set ${p.set} word for word`, () => {
      const set = LR_SETS.find((s) => s.id === p.set);
      expect(set).toBeDefined();
      expect(p.clues).toEqual(set!.clues);
      expect(p.intro).toEqual(set!.intro);
    });
  }
});

describe("the board", () => {
  const talks = PUZZLES.find((p) => p.id === "rp-talk-week")!;
  const m = modelOf(talks), groups = boardOf(m), answer = answerOf(talks);
  it("shows a grid per group, named and labelled, and one-each grids cross their columns", () => {
    expect(groups).toHaveLength(1);
    expect(groups[0].cols.map((c) => c.label)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    expect(groups[0].distinct).toBe(true);
    const shown = shownOf(groups, { [cellKey("Asha", 1)]: "in" });
    // The rest of Asha's row and the rest of Monday's column follow from the tick.
    expect(shown.get(cellKey("Asha", 2))).toBe("auto");
    expect(shown.get(cellKey("Bilal", 1))).toBe("auto");
    expect(shown.get(cellKey("Bilal", 2))).toBeUndefined();
  });
  it("cycles a tap through cross, tick and empty", () => {
    const k = cellKey("Dev", 3);
    const a = tap({}, k), b = tap(a, k), c = tap(b, k);
    expect([a[k], b[k], c[k]]).toEqual(["out", "in", undefined]);
  });
  it("finds wrong marks, and calls the board solved only when every row is known", () => {
    expect(wrongMarks({ [cellKey("Asha", 2)]: "in", [cellKey("Asha", 1)]: "out", [cellKey("Dev", 3)]: "in" }, answer).sort()).toEqual([cellKey("Asha", 1), cellKey("Asha", 2)].sort());
    const ticks: Marks = Object.fromEntries([...answer].map(([n, v]) => [cellKey(n, v), "in"]));
    expect(solvedBy(groups, ticks, answer)).toBe(true);
    const four = { ...ticks };
    delete four[cellKey("Chitra", 5)];
    // Four ticks cross the fifth row's other days, so it is known too.
    expect(solvedBy(groups, four, answer)).toBe(true);
    delete four[cellKey("Esha", 4)];
    expect(solvedBy(groups, four, answer)).toBe(false);
  });
  it("checks a step: guesses ahead of the clues, misses, and wrong marks", () => {
    const trail = trailOf(talks);
    // After every clue the whole answer is settled.
    const last = trail[trail.length - 1].settled;
    const r = stepCheck(groups, { [cellKey("Asha", 1)]: "in", [cellKey("Bilal", 1)]: "in" }, answer, last);
    expect(r.wrong).toEqual([cellKey("Bilal", 1)]);
    expect(r.missed).toContain(cellKey("Esha", 4));
    expect(r.missed).not.toContain(cellKey("Asha", 1));
    // Before any clue nothing is settled, so a right tick is still a guess.
    expect(stepCheck(groups, { [cellKey("Asha", 1)]: "in" }, answer, trail[0].settled).ahead).toEqual([cellKey("Asha", 1)]);
  });
  it("hints at wrong marks first, then the first step not yet on the board", () => {
    const trail = trailOf(talks);
    expect(hintFor(groups, talks, trail, { [cellKey("Asha", 2)]: "in" }, answer)).toEqual({ wrong: [cellKey("Asha", 2)] });
    expect(hintFor(groups, talks, trail, {}, answer)).toEqual({ step: 1, clues: talks.steps[0].use });
    expect(hintFor(groups, talks, trail, marksOf(trail[trail.length - 1].settled), answer)).toBeNull();
  });
  it("names the step that cut the most", () => {
    const trail = trailOf(talks);
    // 120 to 6 is the largest factor.
    expect(trail.map((t) => t.settled.count)).toEqual([120, 6, 4, 1]);
    expect(biggestCut(trail)).toBe(1);
  });
});

describe("wide boards", () => {
  it("caps the count and still reads cells off when there are too many arrangements to list", () => {
    const archery = PUZZLES.find((p) => p.id === "rp-archery")!;
    const m = modelOf(archery);
    const start = settledBy(m, []);
    expect(start.capped).toBe(true);
    expect(start.count).toBe(COUNT_CAP);
    expect(start.cells.size).toBe(0);
    // Three fixed finishes settle their cells even with 17,280 ways left.
    const s = settledBy(m, [4, 5, 6]);
    expect(s.capped).toBe(false);
    expect(s.cells.get(cellKey("Uday 2", 1))).toBe("in");
    expect(s.cells.get(cellKey("Rohan 2", 7))).toBe("out");
    expect(ways(start.count, start.capped)).toBe("over 2,00,000");
    expect(ways(17280)).toBe("17,280");
  });
  it("labels league cells by result", () => {
    const rr = PUZZLES.find((p) => p.id === "rp-round-robin")!;
    const g = boardOf(modelOf(rr));
    expect(g).toHaveLength(1);
    expect(g[0].perRow).toBe(true);
    expect(g[0].rows.map((r) => r.name)).toContain("Aces v Bulls");
  });
});
