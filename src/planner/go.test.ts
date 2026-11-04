import { describe, expect, it } from "vitest";
import { blankState } from "../lib/state";
import { rcOfDay } from "../practice/daily";
import { DI_ORDER, LR_ORDER, nextLrSet } from "../practice/lrorder";
import { isDi } from "../practice/types";
import { DI_LADDER } from "../sections/dilr/ladder";
import { goFor } from "./go";

const today = "2026-11-04";

describe("a plan block's on-site action (D56)", () => {
  it("opens the next untried LR set, in the practice order", () => {
    const st = blankState();
    expect(goFor({ go: "lr-next", links: [] }, st, today)?.to).toBe(`/practice/lr/${LR_ORDER[0].id}`);
    st.lrAttempts.push({ id: "a", d: today, set: LR_ORDER[0].id, ans: [], c: 0, w: 0, secs: 1, updatedAt: 1 });
    expect(nextLrSet(st.lrAttempts)?.id).toBe(LR_ORDER[1].id);
    expect(goFor({ go: "lr-next", links: [] }, st, today)?.to).toBe(`/practice/lr/${LR_ORDER[1].id}`);
  });
  it("keeps the LR block to logical reasoning sets (D82)", () => {
    const st = blankState();
    LR_ORDER.filter((s) => !isDi(s.type)).forEach((s, i) => st.lrAttempts.push({ id: String(i), d: today, set: s.id, ans: [], c: 0, w: 0, secs: 1, updatedAt: 1 }));
    expect(nextLrSet(st.lrAttempts)).toBeUndefined();
  });
  it("opens the next DI set, charts and tables by turns, then the past CAT ladder, then the redo queue (D82)", () => {
    const st = blankState();
    expect(DI_ORDER.slice(0, 2).map((s) => s.type)).toEqual(["di-chart", "di-table"]);
    expect(goFor({ go: "di-next", links: [] }, st, today)?.to).toBe(`/practice/lr/${DI_ORDER[0].id}`);
    DI_ORDER.forEach((s, i) => st.lrAttempts.push({ id: "d" + i, d: today, set: s.id, ans: [], c: 0, w: 0, secs: 1, updatedAt: 1 }));
    expect(goFor({ go: "di-next", links: [] }, st, today)).toEqual({ to: DI_LADDER[0][2], label: "Open CAT 2021, slot 1: Sales across product subcategories" });
    st.ticks[DI_LADDER[0][0]] = 1;
    expect(goFor({ go: "di-next", links: [] }, st, today)?.to).toBe(DI_LADDER[1][2]);
    DI_LADDER.forEach(([id]) => (st.ticks[id] = 1));
    expect(goFor({ go: "di-next", links: [] }, st, today)?.to).toBe("/practice/redo");
  });
  it("sends an RC block to the RC of the day, and to its review once done today", () => {
    const st = blankState(), rc = rcOfDay(today);
    expect(goFor({ ptype: "RC", links: [] }, st, today)).toEqual({ to: `/practice/rc/${rc.id}`, label: "Start the RC of the day" });
    st.rcAttempts.push({ id: "r1", d: today, set: rc.id, mode: "daily", ans: [], c: 0, w: 0, secs: 1, first: 0 });
    expect(goFor({ ptype: "RC", links: [] }, st, today)?.to).toBe(`/practice/rc/${rc.id}?review=r1`);
  });
  it("sends VA blocks to the daily drill, named drills to their page, and others to their first link inside the site", () => {
    const st = blankState();
    expect(goFor({ ptype: "Para jumble", links: [] }, st, today)?.to).toBe("/practice/va");
    expect(goFor({ go: "/practice/clues", links: [] }, st, today)).toEqual({ to: "/practice/clues", label: "Start the clue translator" });
    expect(goFor({ links: [["Article", "https://example.com"], ["Your flashcards", "/words"]] }, st, today)).toEqual({ to: "/words", label: "Your flashcards" });
    expect(goFor({ links: [["Article", "https://example.com"]] }, st, today)).toBeNull();
  });
});
