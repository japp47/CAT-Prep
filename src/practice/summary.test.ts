import { describe, expect, it } from "vitest";
import { blankState, normalize } from "../lib/state";
import { activityDays } from "./streak";
import { markPhrases, recordRcSummary, summaryFor, summaryScore } from "./summary";
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
