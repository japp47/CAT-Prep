import { describe, expect, it } from "vitest";
import { addDays } from "../lib/date";
import { dailyPick, rcOfDay, vaOfDay } from "./daily";
import { RC_SETS } from "./rc";
import { computeStreak } from "./streak";
import { buildItem, customDrill, scoreItem, sentenceAt } from "./va/build";
import { VA_PARAS } from "./va/paragraphs";

describe("VA items", () => {
  for (const p of VA_PARAS) {
    it(`${p.id} builds three valid items`, () => {
      const pj = buildItem("pj", p);
      expect(pj.order).not.toEqual([0, 1, 2, 3]);
      expect(pj.answer).toHaveLength(4);
      // typing the key back gives the sentences in their true order
      expect(pj.answer.split("").map((n) => sentenceAt(pj, +n - 1))).toEqual(p.s);

      const oso = buildItem("oso", p);
      expect(oso.order).toHaveLength(5);
      expect(sentenceAt(oso, +oso.answer - 1)).toBe(p.odd);

      const si = buildItem("si", p);
      expect(si.gaps).toHaveLength(4);
      expect(si.gaps[+si.answer - 1]).toBe(p.insAt);
    });
  }
  it("scores TITA without negative marks and insertion with them", () => {
    const pj = buildItem("pj", VA_PARAS[0]);
    expect(scoreItem(pj, pj.answer).pts).toBe(3);
    expect(scoreItem(pj, "9999").pts).toBe(0);
    expect(scoreItem(pj, "").blank).toBe(true);
    expect(scoreItem(pj, pj.answer.split("").join(" ")).ok).toBe(true);
    const si = buildItem("si", VA_PARAS[0]);
    const wrong = String((+si.answer % 4) + 1);
    expect(scoreItem(si, wrong).pts).toBe(-1);
    expect(scoreItem(si, "").pts).toBe(0);
  });
  it("puts unseen items first in custom drills", () => {
    const first = customDrill(VA_PARAS, "pj", 5, "s1", new Set());
    const seen = new Set(first.map((i) => i.key));
    const next = customDrill(VA_PARAS, "pj", 5, "s1", seen);
    expect(next.some((i) => seen.has(i.key))).toBe(false);
  });
});

describe("daily picks", () => {
  it("serves every RC set once per cycle, never the same set two days running", () => {
    const start = "2026-10-12";
    const seen: string[] = [];
    for (let i = 0; i < RC_SETS.length * 3; i++) seen.push(rcOfDay(addDays(start, i)).id);
    expect(new Set(seen.slice(0, RC_SETS.length)).size).toBe(RC_SETS.length);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  });
  it("is the same for everyone on a date", () => {
    expect(rcOfDay("2027-03-04").id).toBe(rcOfDay("2027-03-04").id);
    expect(vaOfDay("2027-03-04").map((i) => i.key)).toEqual(vaOfDay("2027-03-04").map((i) => i.key));
  });
  it("gives a daily VA set of 8 items from 8 different paragraphs", () => {
    const items = vaOfDay("2026-11-02");
    expect(items).toHaveLength(8);
    expect(new Set(items.map((i) => i.para.id)).size).toBe(8);
  });
  it("works before the epoch", () => {
    expect(dailyPick(RC_SETS, "2026-01-01", "rc")).toHaveLength(1);
  });
});

describe("streak", () => {
  const days = (...d: string[]) => new Set(d);
  it("counts consecutive days and stays alive while today is open", () => {
    expect(computeStreak(days("2026-10-15", "2026-10-16"), "2026-10-17").days).toBe(2);
    expect(computeStreak(days("2026-10-15", "2026-10-16", "2026-10-17"), "2026-10-17").days).toBe(3);
  });
  it("uses a shield to bridge a single missed day", () => {
    const s = computeStreak(days("2026-10-13", "2026-10-14", "2026-10-16"), "2026-10-17");
    expect(s.days).toBe(3);
    expect(s.shielded).toEqual(["2026-10-15"]);
    expect(s.shieldsLeft).toBe(1);
  });
  it("breaks when the month's shields run out, without wasting them", () => {
    const s = computeStreak(days("2026-10-10", "2026-10-16"), "2026-10-17");
    expect(s.days).toBe(1);
    expect(s.shieldsLeft).toBe(2);
  });
  it("is zero with no activity", () => {
    expect(computeStreak(days(), "2026-10-17").days).toBe(0);
  });
});
