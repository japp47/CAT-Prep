import { describe, expect, it } from "vitest";
import { blankState, normalize, type MockQ, type MockReview, type PracticeSet } from "../lib/state";
import { CONTENT } from "./full";
import {
  acrossReviews, DEFAULT_LAYOUT, findings, fromSectional, lost, proposeActions, questionsFor, toErrors, toPractice, typesOf,
} from "./mockreview";
import { resolveExam } from "./redo";
import { buildPaper, marksOf, scorePaper } from "./sectional";

const review = (qs: MockQ[], extra: Partial<MockReview> = {}): MockReview => ({
  id: "r1", d: "2026-10-20", updatedAt: 1, mock: "m1", sec: "VARC", from: "manual", name: "SimCAT 3", layout: DEFAULT_LAYOUT, qs, recs: [], ...extra,
});
/** The default layout, all right, with some questions changed by grid number (1-based). */
const grid = (changes: Record<number, Partial<MockQ>>) => questionsFor(DEFAULT_LAYOUT).map((q, i) => ({ ...q, ...changes[i + 1] }));

describe("mock review layout", () => {
  it("defaults to CAT's VARC: 16 RC questions, then 2 of each VA type", () => {
    const t = typesOf(DEFAULT_LAYOUT);
    expect(t).toHaveLength(24);
    expect(t.slice(0, 16).every((x) => x === "rc")).toBe(true);
    expect(t.slice(16)).toEqual(["ps", "ps", "si", "si", "oso", "oso", "pj", "pj"]);
  });
  it("keeps answers where the type at that place stays the same", () => {
    const qs = grid({ 2: { st: "wrong", cause: "trap" }, 17: { st: "skip", could: true } });
    const next = questionsFor({ rc: [4, 4, 4, 4, 2], va: DEFAULT_LAYOUT.va }, qs);
    expect(next[1]).toEqual(qs[1]);
    expect(next[16]).toEqual({ st: "right", type: "rc" });
  });
});

describe("where the marks went", () => {
  it("adds up: 3 per right answer, minus 1 per wrong MCQ, and a wrong TITA costs nothing extra", () => {
    const qs = grid({ 1: { st: "wrong", cause: "slip" }, 23: { st: "wrong", cause: "trap" }, 5: { st: "skip", could: false } });
    const f = findings(review(qs));
    expect(f.right).toBe(21);
    expect(f.score).toBe(3 * 21 - 1);
    expect(lost(qs[0])).toBe(4);
    expect(lost(qs[22])).toBe(3);
  });
  it("counts every lost question in exactly one group, and a good skip in none", () => {
    const qs = grid({
      1: { st: "wrong", cause: "slip" }, 2: { st: "wrong", cause: "misread" }, 3: { st: "wrong", cause: "trap" }, 4: { st: "wrong" },
      5: { st: "skip", could: true }, 6: { st: "skip", could: false }, 7: { st: "skip" }, 8: { st: "unseen" }, 9: { st: "wrong", cause: "guess" },
    });
    const f = findings(review(qs));
    const lostQs = qs.filter((q) => q.st !== "right" && !(q.st === "skip" && q.could === false));
    expect(f.groups.reduce((s, g) => s + g.n, 0)).toBe(lostQs.length);
    expect(f.groups.reduce((s, g) => s + g.marks, 0)).toBe(lostQs.reduce((s, q) => s + lost(q), 0));
    expect(f.goodSkips).toBe(1);
    expect(f.groups.find((g) => g.key === "careless")).toMatchObject({ n: 2, marks: 8 });
    expect(f.groups.find((g) => g.key === "unsorted")).toMatchObject({ n: 2 });
    expect(f.groups.find((g) => g.key === "time")).toMatchObject({ n: 1, marks: 3 });
  });
  it("gives the score with no careless slips and the doable skips that were solved", () => {
    const qs = grid({ 1: { st: "wrong", cause: "slip" }, 5: { st: "skip", could: true, solved: true }, 6: { st: "skip", could: true, solved: false } });
    const f = findings(review(qs));
    expect(f.potential).toBe(f.score + 4 + 3);
    expect(f.doable).toBe(2);
    expect(f.solved).toBe(1);
  });
  it("splits time only when it is known", () => {
    expect(findings(review(grid({}))).time).toBeUndefined();
    const timed = grid({ 1: { st: "wrong", cause: "trap", secs: 90 }, 2: { st: "skip", could: false, secs: 40 } }).map((q) => ({ ...q, secs: q.secs ?? 60 }));
    expect(findings(review(timed)).time).toEqual({ right: 22 * 60, wrong: 90, gaveUp: 40 });
  });
});

describe("proposed actions", () => {
  it("needs two questions of a kind, and gives at most three, biggest first", () => {
    expect(proposeActions(review(grid({ 1: { st: "wrong", cause: "trap" } })), [])).toEqual([]);
    const qs = grid({
      1: { st: "wrong", cause: "trap" }, 2: { st: "wrong", cause: "trap" }, 3: { st: "wrong", cause: "trap" },
      17: { st: "wrong", cause: "slip" }, 18: { st: "wrong", cause: "slip" },
      23: { st: "wrong", cause: "method" }, 24: { st: "wrong", cause: "method" },
      9: { st: "skip", could: true }, 10: { st: "skip", could: true },
    });
    const a = proposeActions(review(qs), []);
    expect(a).toHaveLength(3);
    expect(a[0].skill).toEqual({ kind: "cause", key: "trap" });
    expect(a.map((x) => x.lost)).toEqual([...a.map((x) => x.lost)].sort((x, y) => y - x));
    a.forEach((x) => expect(x.why).toMatch(/\d/));
  });
  it("turns a weak type into a drill, with the accuracy before", () => {
    const practice: PracticeSet[] = [{ id: "p", d: "2026-10-01", sec: "VARC", t: "Para jumble", a: 10, c: 4, src: "" }];
    const a = proposeActions(review(grid({ 23: { st: "wrong", cause: "method" }, 24: { st: "wrong", cause: "method" } })), practice);
    expect(a[0]).toMatchObject({ skill: { kind: "type", key: "Para jumble" }, to: "/practice/va?type=pj&n=6", before: { c: 4, n: 10 } });
  });
});

describe("saving a review", () => {
  it("logs practice rows by type and error entries for wrong answers", () => {
    const r = review(grid({ 1: { st: "wrong", cause: "time" }, 17: { st: "skip", could: true } }));
    const rows = toPractice(r);
    expect(rows.find((x) => x.t === "RC")).toMatchObject({ a: 16, c: 15 });
    expect(rows.find((x) => x.t === "Para summary")).toMatchObject({ a: 1, c: 1 });
    const errs = toErrors(r);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatchObject({ t: "RC", trap: "Ran out of time", src: "Mock: SimCAT 3, Q1" });
  });
  it("adds up marks by group across the last reviews", () => {
    const a = review(grid({ 1: { st: "wrong", cause: "slip" } }), { id: "a", d: "2026-10-01" });
    const b = review(grid({ 2: { st: "wrong", cause: "slip" }, 3: { st: "unseen" } }), { id: "b", d: "2026-10-08" });
    const x = acrossReviews([a, b], "VARC");
    expect(x.count).toBe(2);
    expect(x.groups[0]).toMatchObject({ key: "careless", marks: 8 });
  });
});

describe("from a sectional on this site", () => {
  it("fills status, type and time per question, and matches the sectional's own score", () => {
    const qs = buildPaper(blankState(), "mock-review");
    const a = qs.map((k, i) => {
      const ref = resolveExam(k, CONTENT)!;
      if (i === 0) return ""; // blank
      if (i === 1) return ref.kind === "rc" ? String((ref.set.questions[ref.qi].answer + 1) % 4) : "9";
      return ref.kind === "rc" ? String(ref.set.questions[ref.qi].answer) : ref.item.answer;
    });
    const t = qs.map((_, i) => (i === 0 ? 0 : i === 2 ? 200 : 60));
    const rows = scorePaper(qs, a, CONTENT);
    const { layout, qs: mq } = fromSectional({ id: "s", d: "2026-10-20", qs, a, t, secs: 2400, c: 0, w: 0, updatedAt: 1 }, rows);
    expect(layout.rc).toEqual([4, 4, 4, 4]);
    expect(layout.va).toHaveLength(8);
    expect(mq[0]).toMatchObject({ st: "unseen", type: "rc" });
    expect(mq[1].st).toBe("wrong");
    expect(mq[2]).toMatchObject({ st: "right", slow: true, secs: 200 });
    expect(findings({ qs: mq }).score).toBe(marksOf(rows));
  });
});

describe("state", () => {
  it("loads old backups with no reviews or recommendations", () => {
    const s = normalize({ settings: {}, days: {}, mocks: [] });
    expect(s.mockReviews).toEqual([]);
    expect(s.recs).toEqual([]);
  });
  it("keeps a review and a recommendation through a save, and drops bad fields", () => {
    const s = blankState();
    s.mockReviews.push(review(grid({ 1: { st: "wrong", cause: "trap" }, 2: { st: "skip", could: true, solved: false } }), { planned: 20 }));
    s.recs.push({ id: "x", d: "2026-10-20", updatedAt: 1, from: "mock", src: "r1", sec: "VARC", skill: { kind: "cause", key: "trap" }, text: "Name the trap.", why: "3 wrong.", to: "/practice", status: "open", before: { c: 1, n: 2 } });
    const back = normalize(JSON.parse(JSON.stringify(s)));
    expect(back.mockReviews).toEqual(s.mockReviews);
    expect(back.recs).toEqual(s.recs);
    const bad = normalize({ mockReviews: [{ id: "z", d: "2026-10-20", qs: [{ st: "maybe", type: "rc", cause: "aliens" }] }], recs: [{ id: "y", d: "2026-10-20", text: "x", to: "https://evil.example" }] });
    expect(bad.mockReviews[0].qs[0]).toEqual({ st: "right", type: "rc" });
    expect(bad.recs[0].to).toBeUndefined();
  });
});
