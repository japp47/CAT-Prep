import { describe, expect, it } from "vitest";
import { blankState, normalize } from "../lib/state";
import { activityDays } from "./streak";
import { markPhrases, recordArticleSummary, recordRcSummary, splitRef, summaryFor, summaryHabits, summaryScore } from "./summary";
import type { RcSet } from "./types";

const set = { id: "econ-x", summary: { model: "Cities may partly teach skills.", tone: "analytical", claim: "teach skills", qualifier: "may partly" } } as unknown as RcSet;

describe("summary writing", () => {
  it("scores the number of checks ticked", () => {
    expect(summaryScore([true, false, true, true])).toBe(3);
    expect(summaryScore([false, false, false, false])).toBe(0);
  });

  it("highlights the claim and the qualifier wherever they fall, ignoring case", () => {
    const parts = markPhrases("Cities May partly teach skills.", ["teach skills", "may partly"]);
    expect(parts).toEqual([
      { t: "Cities ", hl: false }, { t: "May partly", hl: true }, { t: " ", hl: false }, { t: "teach skills", hl: true }, { t: ".", hl: false },
    ]);
    expect(parts.map((p) => p.t).join("")).toBe("Cities May partly teach skills.");
    expect(markPhrases("No match here.", ["absent"])).toEqual([{ t: "No match here.", hl: false }]);
  });

  it("saves a summary against its attempt, with the word count and the time for sync", () => {
    const st = blankState();
    recordRcSummary(st, "s1", set, "a1", "  Cities may partly teach skills, so building limits tax learning.  ", "analytical", [true, true, true, false], "2026-10-20", 1000);
    const e = summaryFor(st, "a1");
    expect(e).toMatchObject({ id: "s1", src: "rc", set: "econ-x", att: "a1", tone: "analytical", words: 10, updatedAt: 1000, d: "2026-10-20" });
    expect(e?.text.startsWith("Cities")).toBe(true);
    expect(summaryFor(st, "other")).toBeUndefined();
  });

  it("counts a day with a summary for the streak", () => {
    const st = blankState();
    recordRcSummary(st, "s1", set, "a1", "Cities may partly teach skills.", "", [false, false, false, false], "2026-10-20", 1);
    expect(activityDays(st).has("2026-10-20")).toBe(true);
  });
});

describe("article summaries", () => {
  it("save the source, and put a link or a title from the one optional field", () => {
    expect(splitRef("  ")).toEqual({});
    expect(splitRef("https://aeon.co/essays/x")).toEqual({ url: "https://aeon.co/essays/x" });
    expect(splitRef("Why we sleep")).toEqual({ title: "Why we sleep" });
    const st = blankState();
    recordArticleSummary(st, "s1", { text: " The author argues sleep is undervalued. ", tone: "persuasive", checks: [true, true, false, true], from: "Aeon", ...splitRef("Why we sleep") }, "2026-10-20", 7);
    expect(st.summaries[0]).toEqual({ id: "s1", d: "2026-10-20", src: "article", text: "The author argues sleep is undervalued.", tone: "persuasive", checks: [true, true, false, true], words: 6, updatedAt: 7, from: "Aeon", title: "Why we sleep" });
  });
});

describe("summary habits", () => {
  const entry = (i: number, checks: boolean[]) => ({ id: "s" + i, d: "2026-10-" + String(10 + i).padStart(2, "0"), src: "rc" as const, text: "x", tone: "", checks, words: 1, updatedAt: i });

  it("counts each check over the latest ten only", () => {
    const old = Array.from({ length: 5 }, (_, i) => entry(i, [false, false, false, false]));
    const recent = Array.from({ length: 10 }, (_, i) => entry(i + 5, [true, i < 4, true, true]));
    const h = summaryHabits([...recent, ...old]);
    expect(h.count).toBe(10);
    expect(h.rows.map((r) => r.correct)).toEqual([10, 4, 10, 10]);
    expect(h.weakest).toBe("You dropped the qualifier in 6 of your last 10. Look for words like often, partly, mainly, some and may.");
  });

  it("says nothing about a check missed only once, or when there are no summaries", () => {
    expect(summaryHabits([entry(1, [true, true, true, false]), entry(2, [true, true, true, true])]).weakest).toBeNull();
    expect(summaryHabits([])).toEqual({ count: 0, rows: expect.any(Array), weakest: null });
  });
});

describe("saved summaries", () => {
  it("old saves have none", () => {
    expect(blankState().summaries).toEqual([]);
    expect(normalize({ settings: {}, days: {} }).summaries).toEqual([]);
  });

  it("keep everything through a save and a restore", () => {
    const st = blankState();
    recordRcSummary(st, "s1", set, "a1", "Cities may partly teach skills.", "analytical", [true, false, true, false], "2026-10-20", 5);
    st.summaries.push({ id: "s2", d: "2026-10-20", src: "article", text: "A long read.", tone: "", checks: [true, true, true, true], words: 3, updatedAt: 6, from: "Aeon", url: "https://aeon.co/x" });
    expect(normalize(JSON.parse(JSON.stringify(st))).summaries).toEqual(st.summaries);
  });

  it("drop entries with no text or a bad date, and fill missing checks as unticked", () => {
    const out = normalize({ summaries: [
      { id: "a", d: "2026-10-20", text: "  ", checks: [] },
      { id: "b", d: "yesterday", text: "Fine.", checks: [] },
      { id: "c", d: "2026-10-20", text: "Kept.", checks: [true], src: "odd" },
    ] }).summaries;
    expect(out.map((e) => e.id)).toEqual(["c"]);
    expect(out[0].checks).toEqual([true, false, false, false]);
    expect(out[0].src).toBe("rc");
  });
});
