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
    it(`${p.id} marks appear in their sentences`, () => {
      p.marks.forEach((m, i) => expect(p.s[i]).toContain(m));
      expect(p.cues.every((c) => c.length > 10)).toBe(true);
      expect(p.odd).not.toEqual("");
      expect(p.ins).not.toEqual("");
    });
  }
});
