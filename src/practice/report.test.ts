import { describe, expect, it } from "vitest";
import type { ErrorEntry, PracticeSet, RcAttempt, SpeedRun } from "../lib/state";
import { CR_CATALOG, RC_CATALOG } from "./catalog.gen";
import { CONTENT } from "./full";
import { accuracy, byPracticeType, crByKind, focusLines, paceTrend, rcByDifficulty, rcByGenre, rcByQuestionType, topTraps, weakest, type Row } from "./report";

const row = (key: string, attempted: number, correct: number): Row => ({ key, label: key, attempted, correct });
const set = CONTENT.rcSets[0];
const meta = RC_CATALOG.find((m) => m.id === set.id)!;
const attempt = (id: string, ans: (number | null)[], c: number, w: number, over: Partial<RcAttempt> = {}): RcAttempt => ({ id, d: "2026-10-01", set: set.id, mode: "library", ans, c, w, secs: 400, first: 100, ...over });

describe("accuracy and weakest", () => {
  it("rounds to a whole percent and is null for no questions", () => {
    expect(accuracy(row("x", 3, 2))).toBe(67);
    expect(accuracy(row("x", 0, 0))).toBeNull();
  });
  it("finds the lowest accuracy among groups with enough questions", () => {
    const w = weakest([row("a", 10, 9), row("b", 10, 4), row("c", 2, 0)]);
    expect(w?.key).toBe("b");
  });
  it("breaks a tie toward the group with more questions, and is null when none has enough", () => {
    expect(weakest([row("a", 6, 3), row("b", 12, 6)])?.key).toBe("b");
    expect(weakest([row("a", 3, 1)])).toBeNull();
  });
});

describe("byPracticeType", () => {
  const p = (t: string, a: number, c: number, sec = "VARC"): PracticeSet => ({ id: t + a, d: "2026-10-01", sec, t, a, c, src: "" });
  it("adds up the logged sets of one section and keeps types with no sets", () => {
    const rows = byPracticeType([p("RC", 4, 3), p("RC", 4, 1), p("Para jumbles", 2, 1), p("RC", 9, 9, "DILR")], "VARC", ["RC", "Para jumbles", "Odd sentence out"]);
    expect(rows.map((r) => [r.key, r.attempted, r.correct])).toEqual([["RC", 8, 4], ["Para jumbles", 2, 1], ["Odd sentence out", 0, 0]]);
  });
  it("shows a type that is not on the section's list, after the listed ones", () => {
    expect(byPracticeType([p("Other", 2, 1)], "VARC", ["RC"]).map((r) => r.key)).toEqual(["RC", "Other"]);
  });
});

describe("RC breakdowns", () => {
  const a = attempt("a", [set.questions[0].answer, null, set.questions[2].answer, set.questions[3].answer + 1], 2, 1);
  it("groups attempts by the genre and level of the passage and counts attempted as right plus wrong", () => {
    expect(rcByGenre([a, a], RC_CATALOG)).toEqual([{ key: meta.genre, label: expect.any(String), attempted: 6, correct: 4 }]);
    const d = rcByDifficulty([a], RC_CATALOG);
    expect(d).toHaveLength(1);
    expect(d[0].key).toBe(meta.difficulty);
  });
  it("ignores an attempt at a passage that is no longer in the catalog", () => {
    expect(rcByGenre([attempt("x", [], 1, 0, { set: "gone" })], RC_CATALOG)).toEqual([]);
  });
  it("groups by kind of question, skipping unanswered ones", () => {
    const rows = rcByQuestionType([a], (id) => CONTENT.rcById(id));
    const total = rows.reduce((s, r) => s + r.attempted, 0);
    expect(total).toBe(3);
    expect(rows.reduce((s, r) => s + r.correct, 0)).toBe(2);
  });
});

describe("paceTrend", () => {
  const run = (d: string, wpm: number, recall = 2): SpeedRun => ({ id: d + wpm, d, set: "x", words: 400, secs: 100, wpm, recall });
  it("uses only runs with full recall, oldest first, and averages the first and last three", () => {
    const p = paceTrend([run("2026-10-05", 190), run("2026-10-01", 150), run("2026-10-02", 300, 1), run("2026-10-03", 160), run("2026-10-04", 170), run("2026-10-06", 200)]);
    expect(p.runs.map((r) => r.wpm)).toEqual([150, 160, 170, 190, 200]);
    expect(p.best).toBe(200);
    expect([p.first, p.last]).toEqual([160, 187]);
  });
  it("has no trend until there are two good runs", () => {
    expect(paceTrend([run("2026-10-01", 150)])).toMatchObject({ best: 150, first: null, last: null });
    expect(paceTrend([])).toMatchObject({ runs: [], best: 0 });
  });
});

describe("topTraps", () => {
  const e = (trap: string, sec = "VARC"): ErrorEntry => ({ id: trap + Math.random(), d: "2026-10-01", sec, t: "RC", trap, src: "", why: "", fix: "" });
  it("counts the traps of one section, most common first, and ignores mistakes with no trap", () => {
    expect(topTraps([e("Extreme words"), e("Extreme words"), e("Out of scope"), e(""), e("Other", "DILR")], "VARC")).toEqual([["Extreme words", 2], ["Out of scope", 1]]);
  });
});

describe("focusLines", () => {
  const noPace = paceTrend([]);
  const base = { genres: [] as Row[], traps: [] as [string, number][], pace: noPace, examPace: 200 };
  it("says nothing until about 20 questions are done", () => {
    expect(focusLines({ ...base, types: [row("RC", 10, 2)] })).toEqual([]);
  });
  it("names the weakest type, with a way to drill it", () => {
    const lines = focusLines({ ...base, types: [row("RC", 20, 16), row("Para jumbles", 8, 2)] });
    expect(lines[0].text).toBe("Para jumbles is your weakest type: 2 of 8 right, 25%.");
    expect(lines[0].to).toBe("/practice");
  });
  it("does not call a type weak when every type is at 80% or better", () => {
    expect(focusLines({ ...base, types: [row("RC", 20, 17), row("Para jumbles", 8, 7)] })).toEqual([]);
  });
  it("names a genre only when it trails the rest by 10 points", () => {
    const types = [row("RC", 30, 24)];
    const trail = focusLines({ ...base, types, genres: [row("history", 12, 10), { ...row("philosophy", 12, 5), label: "Philosophy" }] });
    expect(trail.some((l) => l.text.startsWith("Philosophy passages trail the rest: 42% right"))).toBe(true);
    const even = focusLines({ ...base, types, genres: [row("history", 12, 8), row("philosophy", 12, 7)] });
    expect(even.some((l) => l.text.includes("trail"))).toBe(false);
  });
  it("compares the reading pace with CAT's, and names a trap only when it happened twice", () => {
    const types = [row("RC", 30, 28)];
    const slow = paceTrend([{ id: "a", d: "2026-10-01", set: "x", words: 1, secs: 1, wpm: 150, recall: 2 }]);
    expect(focusLines({ ...base, types, pace: slow })[0].text).toContain("150 words a minute. CAT needs about 200.");
    expect(focusLines({ ...base, types, traps: [["Extreme words", 1]] })).toEqual([]);
    expect(focusLines({ ...base, types, traps: [["Extreme words", 3]] })[0].text).toBe("The trap that caught you most is “Extreme words”, 3 times.");
  });
});

describe("critical reasoning by kind", () => {
  const byType = (t: string) => CR_CATALOG.filter((m) => m.type === t);
  const item = (m: { id: string }, ok: boolean, a: number | null = ok ? 0 : 1) => ({ k: "cr:" + m.id, a, ok });
  it("counts right and attempted per kind, in the order of the guide, and skips blanks", () => {
    const [w1, w2] = byType("weaken"), [a1] = byType("assumption");
    const rows = crByKind([{ id: "1", d: "2026-10-17", secs: 60, items: [item(w1, true), item(w2, false), item(a1, false, null)] }], CR_CATALOG);
    expect(rows).toEqual([{ key: "weaken", label: "Weaken", attempted: 2, correct: 1 }]);
  });
  it("puts kinds in a fixed order across attempts and ignores questions that left the library", () => {
    const [f] = byType("flaw"), [a] = byType("assumption");
    const rows = crByKind([
      { id: "1", d: "2026-10-17", secs: 1, items: [item(f, true)] },
      { id: "2", d: "2026-10-18", secs: 1, items: [item(a, true), { k: "cr:gone", a: 0, ok: true }] },
    ], CR_CATALOG);
    expect(rows.map((r) => r.key)).toEqual(["assumption", "flaw"]);
  });
});
