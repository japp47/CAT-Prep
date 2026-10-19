import { describe, expect, it } from "vitest";
import { blankState, normalize } from "../lib/state";
import { CONTENT } from "./full";
import { resolveExam, resolveRedo } from "./redo";
import { buildPaper, byType, newDraft, qStatus, recordSectional, scorePaper, secsLeft, SECTIONAL_SECS, SECTIONAL_SRC } from "./sectional";
import { DAILY_MIX } from "./va/build";

/** The right answer for every question, as the player stores it. */
const rightAnswers = (qs: string[]) => qs.map((k) => {
  const ref = resolveExam(k, CONTENT)!;
  return ref.kind === "rc" ? String(ref.set.questions[ref.qi].answer) : ref.item.answer;
});

describe("sectional paper", () => {
  const qs = buildPaper(blankState(), "seed-1");

  it("has 4 passages of 4 questions, then 8 VA questions in the daily mix", () => {
    expect(qs).toHaveLength(24);
    const rc = qs.slice(0, 16), va = qs.slice(16);
    expect(rc.every((k) => k.startsWith("rc:"))).toBe(true);
    expect(new Set(rc.map((k) => k.split(":")[1])).size).toBe(4);
    expect(va.map((k) => k.split(":")[0])).toEqual(DAILY_MIX);
    expect(new Set(va.map((k) => k.split(":")[1])).size).toBe(8);
    qs.forEach((k) => expect(resolveRedo(k, CONTENT), k).not.toBeNull());
  });
  it("is the same for the same seed and differs for another", () => {
    expect(buildPaper(blankState(), "seed-1")).toEqual(qs);
    expect(buildPaper(blankState(), "seed-2")).not.toEqual(qs);
  });
  it("leaves out passages and paragraphs from the last sectional while there are unseen ones", () => {
    const st = blankState();
    recordSectional(st, "s1", qs, qs.map(() => ""), qs.map(() => 0), 60, "2026-10-18", CONTENT, 1);
    const next = buildPaper(st, "seed-3");
    const ids = (xs: string[]) => new Set(xs.map((k) => k.split(":")[1]));
    const before = ids(qs);
    [...ids(next)].forEach((id) => expect(before.has(id), id).toBe(false));
  });
});

describe("scoring and saving", () => {
  const qs = buildPaper(blankState(), "seed-1");
  const right = rightAnswers(qs);

  it("scores a perfect paper at 72", () => {
    const rows = scorePaper(qs, right, CONTENT);
    expect(rows.reduce((s, r) => s + r.pts, 0)).toBe(72);
  });
  it("takes a mark for a wrong MCQ but not for a wrong TITA answer", () => {
    const a = right.slice();
    a[0] = String((Number(a[0]) + 1) % 4); // RC, MCQ
    const tita = qs.findIndex((k) => k.startsWith("pj:"));
    a[tita] = "1111";
    a[1] = "";
    const rows = scorePaper(qs, a, CONTENT);
    expect(rows.reduce((s, r) => s + r.pts, 0)).toBe(72 - 4 - 3 - 3);
  });
  it("saves the attempt, practice rows by type, the redo queue and a mock score", () => {
    const st = blankState();
    const a = right.slice();
    a[0] = String((Number(a[0]) + 1) % 4);
    a[20] = "";
    recordSectional(st, "s1", qs, a, qs.map(() => 30), 1500, "2026-10-18", CONTENT, 123);
    expect(st.sectionals[0]).toMatchObject({ id: "s1", c: 22, w: 1, secs: 1500, updatedAt: 123 });
    expect(st.practice.filter((p) => p.src === SECTIONAL_SRC).map((p) => p.t)).toEqual(["RC", "Para summary", "Para jumble", "Odd sentence out", "Sentence insertion"]);
    expect(st.practice.find((p) => p.t === "RC")).toMatchObject({ a: 16, c: 15 });
    expect(st.redo.map((r) => r.k).sort()).toEqual([qs[0], qs[20]].sort());
    expect(st.mocks[0]).toMatchObject({ k: "Sectional", c: 22, w: 1 });
  });
  it("adds up time by question type", () => {
    const rows = scorePaper(qs, right, CONTENT);
    const t = qs.map((_, i) => (i < 16 ? 60 : 90));
    const rc = byType(rows, t).find((x) => x.type === "RC")!;
    expect(rc).toMatchObject({ n: 16, secs: 960, marks: 48 });
  });
  it("survives a save and reload", () => {
    const st = blankState();
    recordSectional(st, "s1", qs, right, qs.map(() => 10), 900, "2026-10-18", CONTENT, 5);
    const back = normalize(JSON.parse(JSON.stringify(st)));
    expect(back.sectionals).toEqual(st.sectionals);
  });
});

describe("draft", () => {
  it("counts the clock from the start time, so time away still counts", () => {
    const d = newDraft("x", ["a", "b"], 0);
    expect(secsLeft(d, 0)).toBe(SECTIONAL_SECS);
    expect(secsLeft(d, 10 * 60 * 1000)).toBe(30 * 60);
    expect(secsLeft(d, 60 * 60 * 1000)).toBe(0);
  });
  it("shows CAT's palette states", () => {
    const d = newDraft("x", ["a", "b", "c", "d"], 0);
    d.seen = [true, true, false, true];
    d.a = ["1", "", "", "2"];
    d.marked = [false, false, true, true];
    expect([0, 1, 2, 3].map((i) => qStatus(d, i))).toEqual(["done", "open", "marked", "doneMarked"]);
  });
});
