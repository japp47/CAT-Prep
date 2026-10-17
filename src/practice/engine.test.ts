import { describe, expect, it } from "vitest";
import { addDays } from "../lib/date";
import { CONTENT } from "./bank";
import { DAILY_EPOCH, dailyPick, rcOfDay, speedSetOfDay, vaKeysOfDay } from "./daily";
import { RC_SETS } from "./rc";
import { computeStreak } from "./streak";
import { buildItem, customDrill, DAILY_MIX, parseKey, scoreItem, sentenceAt, sumAt, VA_KINDS, type VaItem } from "./va/build";
import { VA_PARAS } from "./va/paragraphs";

describe("VA items", () => {
  for (const p of VA_PARAS) {
    it(`${p.id} builds four valid items`, () => {
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

      const ps = buildItem("ps", p);
      expect([...ps.order].sort()).toEqual([0, 1, 2, 3]);
      expect(sumAt(ps, +ps.answer - 1).trap).toBeUndefined();
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
    const ps = buildItem("ps", VA_PARAS[0]);
    expect(scoreItem(ps, ps.answer).pts).toBe(3);
    expect(scoreItem(ps, String((+ps.answer % 4) + 1)).pts).toBe(-1);
  });
  it("spreads para summary answers across A to D", () => {
    const counts = [0, 0, 0, 0];
    VA_PARAS.forEach((p) => counts[+buildItem("ps", p).answer - 1]++);
    counts.forEach((c) => expect(c / VA_PARAS.length).toBeGreaterThan(0.1));
  });
  it("mixes all four types in a mixed drill", () => {
    const kinds = new Set(customDrill(VA_PARAS, "mix", 8, "m1", new Set()).map((i) => i.kind));
    expect(kinds.size).toBe(VA_KINDS.length);
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
    const launch = RC_SETS.filter((x) => !x.since).length;
    const seen: string[] = [];
    for (let i = 0; i < launch + RC_SETS.length * 2; i++) seen.push(rcOfDay(addDays(DAILY_EPOCH, i)).id);
    // The first cycle is the launch set; the next cycle has every set published since.
    expect(new Set(seen.slice(0, launch)).size).toBe(launch);
    expect(new Set(seen.slice(launch, launch + RC_SETS.length)).size).toBe(RC_SETS.length);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  });
  it("is the same for everyone on a date", () => {
    expect(rcOfDay("2027-03-04").id).toBe(rcOfDay("2027-03-04").id);
    expect(vaKeysOfDay("2027-03-04")).toEqual(vaKeysOfDay("2027-03-04"));
  });
  it("gives a daily VA set of 8 items from 8 different paragraphs, 2 of each type", () => {
    const items = vaKeysOfDay("2026-11-02").map((k) => parseKey(k, CONTENT.vaParas)).filter((x): x is VaItem => !!x);
    expect(items).toHaveLength(8);
    expect(new Set(items.map((i) => i.para.id)).size).toBe(8);
    expect(items.map((i) => i.kind)).toEqual(DAILY_MIX);
    VA_KINDS.forEach((k) => expect(items.filter((i) => i.kind === k)).toHaveLength(2));
  });
  it("works before the epoch", () => {
    expect(dailyPick(RC_SETS, "2026-01-01", "rc")).toHaveLength(1);
  });
});

describe("daily rotation stays put when content is added", () => {
  // Served before content had publish dates. A content change that moves any of these days fails here.
  const SERVED = {"rc": ["econ-cities", "soc-cash", "sci-leapsecond", "econ-rules", "hist-maps", "hist-cholera", "soc-algorithms", "phil-theseus", "sci-wood", "soc-remote", "econ-minwage", "hist-silk", "psy-memory", "sci-placebo", "psy-willpower", "phil-luck", "econ-lemons", "phil-future", "lit-minds", "psy-planning", "lit-tragedy", "lit-translation", "hist-print", "phil-experts", "sci-shrinking", "psy-choice-blind", "soc-repair", "lit-oral", "econ-thrift", "sci-microbiome"], "sp": ["phil-theseus", "hist-print", "psy-choice-blind", "sci-leapsecond", "lit-oral", "phil-future", "econ-lemons", "psy-willpower", "psy-memory", "econ-minwage", "sci-wood", "econ-thrift", "sci-shrinking", "hist-maps", "soc-remote", "lit-tragedy", "econ-cities", "lit-translation", "soc-algorithms", "psy-planning", "hist-cholera", "econ-rules", "soc-repair", "phil-experts", "phil-luck", "soc-cash", "hist-silk", "sci-placebo", "lit-minds", "sci-microbiome"], "va": ["ps:teaindia,ps:qwerty,si:chess,si:letters,oso:opium,oso:stepwells,pj:stoics,pj:daycare", "ps:defaults,ps:kintsugi,si:roads,si:boredom,oso:openplan,oso:mangroves,pj:practice,pj:languages", "ps:mercator,ps:libet,si:heat,si:jam,oso:antibiotics,oso:rivers,pj:sorites,pj:photography", "ps:sleep,ps:zero,si:bees,si:peacock,oso:beetles,oso:handwriting,pj:labels,pj:serials", "ps:darksky,ps:money,si:octopus,si:diamonds,oso:matthew,oso:lighthouses,pj:trees,pj:glaciers", "ps:qwerty,ps:bees,si:stepwells,si:beetles,oso:rivers,oso:teaindia,pj:libet,pj:chess", "ps:sorites,ps:money,si:openplan,si:mangroves,oso:languages,oso:labels,pj:zero,pj:jam", "ps:trees,ps:photography,si:handwriting,si:roads,oso:kintsugi,oso:opium,pj:peacock,pj:darksky", "ps:defaults,ps:glaciers,si:mercator,si:serials,oso:letters,oso:sleep,pj:lighthouses,pj:boredom", "ps:daycare,ps:practice,si:antibiotics,si:octopus,oso:heat,oso:stoics,pj:diamonds,pj:matthew"]};
  const days = (n: number) => Array.from({ length: n }, (_, i) => addDays(DAILY_EPOCH, i));
  it("keeps the RC of the day, speed test passage and VA drill already served", () => {
    expect(days(SERVED.rc.length).map((d) => rcOfDay(d).id)).toEqual(SERVED.rc);
    expect(days(SERVED.sp.length).map((d) => speedSetOfDay(d).id)).toEqual(SERVED.sp);
    expect(days(SERVED.va.length).map((d) => vaKeysOfDay(d).join(","))).toEqual(SERVED.va);
  });
  const items = Array.from({ length: 10 }, (_, i) => ({ id: "x" + i }));
  it("brings a new item in at the next cycle after its date, without changing earlier days", () => {
    const before = days(40).map((d) => dailyPick(items, d, "t")[0].id);
    const more = [...items, { id: "new", since: "2026-10-15" }];
    const after = days(40).map((d) => dailyPick(more, d, "t")[0].id);
    // Cycle 1 starts on day 10 (22 Oct), the first cycle start on or after 15 Oct, so the new item joins there
    expect(after.slice(0, 10)).toEqual(before.slice(0, 10));
    expect(after.slice(10, 21)).toContain("new");
    expect(new Set(after.slice(10, 21)).size).toBe(11);
  });
  it("gives every content item a valid date", () => {
    [...RC_SETS, ...CONTENT.vaParas].forEach((x) => { if (x.since) expect(x.since >= DAILY_EPOCH && /^\d{4}-\d{2}-\d{2}$/.test(x.since)).toBe(true); });
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
