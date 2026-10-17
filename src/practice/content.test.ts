import { describe, expect, it } from "vitest";
import { OPTION_TRAPS } from "../data/traps";
import { VARC } from "../sections/varc";
import { RC_SETS } from "./rc";
import { RC_QTYPE, setWords } from "./types";
import { VA_PARAS } from "./va/paragraphs";

describe("RC library", () => {
  it("has unique ids", () => {
    expect(new Set(RC_SETS.map((s) => s.id)).size).toBe(RC_SETS.length);
  });
  for (const s of RC_SETS) {
    it(`${s.id} is a well-formed CAT set`, () => {
      expect(s.questions).toHaveLength(4);
      expect(s.recall).toHaveLength(2);
      const w = setWords(s);
      expect(w).toBeGreaterThanOrEqual(320);
      expect(w).toBeLessThanOrEqual(650);
      for (const q of s.questions) {
        expect(q.options).toHaveLength(4);
        // exactly one option has no trap, and that is the answer
        expect(q.options.filter((o) => !o.trap)).toHaveLength(1);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        q.options.forEach((o) => { expect(o.why.length).toBeGreaterThan(10); if (o.trap) expect(OPTION_TRAPS).toContain(o.trap); });
        expect(q.proof.length).toBeGreaterThan(0);
        q.proof.forEach((p) => expect(p).toBeLessThan(s.paras.length));
        expect(VARC.errorTypes).toContain(RC_QTYPE[q.type].error);
      }
      for (const r of s.recall) {
        expect(r.options).toHaveLength(4);
        expect(r.answer).toBeLessThan(4);
      }
    });
  }
  it("spreads right answers across A to D", () => {
    const counts = [0, 0, 0, 0];
    RC_SETS.forEach((s) => s.questions.forEach((q) => counts[q.answer]++));
    const total = counts.reduce((a, b) => a + b, 0);
    counts.forEach((c) => expect(c / total).toBeGreaterThan(0.15));
  });
});

describe("VA paragraphs", () => {
  it("has unique ids", () => {
    expect(new Set(VA_PARAS.map((p) => p.id)).size).toBe(VA_PARAS.length);
  });
  for (const p of VA_PARAS) {
    it(`${p.id} has the right shape`, () => {
      [p.s, p.cues, p.marks].forEach((xs) => { expect(xs).toHaveLength(4); xs.forEach((x) => expect(typeof x).toBe("string")); });
      expect([0, 1, 2, 3, 4]).toContain(p.insAt);
      expect(["easy", "medium", "hard"]).toContain(p.difficulty);
      expect(p.topic.length).toBeGreaterThan(3);
      [p.oddWhy, p.insWhy].forEach((x) => expect(x.length).toBeGreaterThan(10));
      if (p.since) expect(p.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    it(`${p.id} marks appear in their sentences`, () => {
      p.marks.forEach((m, i) => expect(p.s[i]).toContain(m));
      expect(p.cues.every((c) => c.length > 10)).toBe(true);
      expect(p.odd).not.toEqual("");
      expect(p.ins).not.toEqual("");
      expect(p.sum).toHaveLength(4);
      expect(p.sum.filter((o) => !o.trap)).toHaveLength(1);
      p.sum.forEach((o) => { expect(o.why.length).toBeGreaterThan(10); if (o.trap) expect(OPTION_TRAPS).toContain(o.trap); });
    });
  }
  it("spreads insertion gaps so the last gap is not a safe guess", () => {
    const last = VA_PARAS.filter((p) => p.insAt === 4).length;
    expect(last / VA_PARAS.length).toBeLessThan(0.4);
  });
  it("does not make the right summary the longest one most of the time", () => {
    // A right answer that is usually the longest option teaches students to guess by length.
    const longest = VA_PARAS.filter((p) => {
      const right = p.sum.find((o) => !o.trap)!;
      return p.sum.every((o) => o === right || o.t.length < right.t.length);
    }).length;
    expect(longest / VA_PARAS.length).toBeLessThan(0.5);
  });
});
