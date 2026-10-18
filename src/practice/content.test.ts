import { describe, expect, it } from "vitest";
import { OPTION_TRAPS } from "../data/traps";
import { VARC } from "../sections/varc";
import { CR_ITEMS } from "./cr";
import { RC_SETS } from "./rc";
import { CR_TYPE, CR_TYPES, RC_QTYPE, setWords, words } from "./types";
import { VA_PARAS } from "./va/paragraphs";

describe("RC library", () => {
  it("has unique ids", () => {
    expect(new Set(RC_SETS.map((s) => s.id)).size).toBe(RC_SETS.length);
  });
  for (const s of RC_SETS) {
    it(`${s.id} is a well-formed CAT set`, () => {
      // CAT asks 4 per passage; a set may add a fifth for practice (the sectional uses only the first 4)
      expect([4, 5]).toContain(s.questions.length);
      expect(s.recall).toHaveLength(2);
      const w = setWords(s);
      expect(w).toBeGreaterThanOrEqual(320);
      expect(w).toBeLessThanOrEqual(650);
      for (const q of s.questions) {
        expect(q.options).toHaveLength(4);
        // exactly one option has no trap, and that is the answer
        expect(q.options.filter((o) => !o.trap)).toHaveLength(1);
        expect(q.answer).toBe(q.options.findIndex((o) => !o.trap));
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
      expect([4, 5]).toContain(p.s.length);
      [p.cues, p.marks].forEach((xs) => expect(xs).toHaveLength(p.s.length));
      [p.s, p.cues, p.marks].forEach((xs) => xs.forEach((x) => expect(typeof x).toBe("string")));
      expect(Number.isInteger(p.insAt) && p.insAt >= 0 && p.insAt <= p.s.length).toBe(true);
      expect(["easy", "medium", "hard"]).toContain(p.difficulty);
      expect(p.topic.length).toBeGreaterThan(3);
      [p.oddWhy, p.insWhy].forEach((x) => expect(x.length).toBeGreaterThan(10));
      if (p.since) expect(p.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    it(`${p.id} has a jumble and an odd-one-out view that match its sentences`, () => {
      const n = p.s.length;
      // Five-sentence paragraphs come with hand-set views; four-sentence ones are shuffled when built.
      if (n === 5) { expect(p.pj).toBeDefined(); expect(p.ooo).toBeDefined(); }
      if (p.pj) {
        const { show, answer } = p.pj;
        expect([...show].sort()).toEqual(Array.from({ length: n }, (_, i) => i + 1));
        expect(show).not.toEqual(Array.from({ length: n }, (_, i) => i + 1));
        // the key lists, for each sentence in true order, the position it is shown at
        expect(answer).toBe(Array.from({ length: n }, (_, i) => show.indexOf(i + 1) + 1).join(""));
      }
      if (p.ooo) {
        const { show, answer, drop } = p.ooo;
        expect(show).toHaveLength(5);
        expect(show.filter((x) => x === 0)).toHaveLength(1);
        expect(drop).toBeGreaterThanOrEqual(1);
        expect(drop).toBeLessThanOrEqual(n);
        // the four sentences shown are the core sentences without the dropped one
        expect(show.filter((x) => x > 0).sort()).toEqual(Array.from({ length: n }, (_, i) => i + 1).filter((x) => x !== drop));
        expect(answer).toBe(show.indexOf(0) + 1);
      }
      if (p.wordCount !== undefined) expect(p.wordCount).toBe(p.s.join(" ").split(/\s+/).length);
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
    const last = VA_PARAS.filter((p) => p.insAt === p.s.length).length;
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

/** Words the question stem must contain, by type. They catch an item filed under the wrong type. */
const ASKS = { assumption: /assumption/, strengthen: /strengthens/, weaken: /weakens/, inference: /inferred/, flaw: /flawed/, paradox: /explains/ } as const;

describe("critical reasoning items", () => {
  it("has unique ids", () => {
    expect(new Set(CR_ITEMS.map((c) => c.id)).size).toBe(CR_ITEMS.length);
  });
  it("covers every type at least three times", () => {
    CR_TYPES.forEach((t) => expect(CR_ITEMS.filter((c) => c.type === t).length, t).toBeGreaterThanOrEqual(3));
  });
  for (const c of CR_ITEMS) {
    it(`${c.id} has the right shape`, () => {
      expect(Object.keys(CR_TYPE)).toContain(c.type);
      expect(["easy", "medium", "hard"]).toContain(c.difficulty);
      expect(c.topic.length).toBeGreaterThan(3);
      expect(c.question).toMatch(ASKS[c.type]);
      expect(c.takeaway.length).toBeGreaterThan(20);
      expect(c.wordCount).toBe(words(c.stimulus));
      // Arguments have a conclusion quoted from the text; inference and paradox statements have none.
      if (c.type === "inference" || c.type === "paradox") expect(c.conclusion).toBeNull();
      else { expect(c.conclusion).not.toBeNull(); expect(c.stimulus).toContain(c.conclusion!); }
    });
    it(`${c.id} has four options and one answer`, () => {
      expect(c.options).toHaveLength(4);
      // exactly one option has no trap, and that is the answer
      expect(c.options.filter((o) => !o.trap)).toHaveLength(1);
      expect(c.answer).toBe(c.options.findIndex((o) => !o.trap));
      c.options.forEach((o) => {
        expect(o.t.length).toBeGreaterThan(10);
        expect(o.why.length).toBeGreaterThan(10);
        if (o.trap) expect(OPTION_TRAPS).toContain(o.trap);
      });
      expect(new Set(c.options.map((o) => o.t)).size).toBe(4);
    });
  }
  it("spreads right answers across A to D", () => {
    const counts = [0, 0, 0, 0];
    CR_ITEMS.forEach((c) => counts[c.answer]++);
    counts.forEach((n) => { expect(n / CR_ITEMS.length).toBeGreaterThan(0.15); expect(n / CR_ITEMS.length).toBeLessThan(0.4); });
  });
  it("does not make the right option the longest one most of the time", () => {
    // A right answer that is usually the longest option teaches students to guess by length.
    const longest = CR_ITEMS.filter((c) => c.options.every((o, i) => i === c.answer || o.t.length < c.options[c.answer].t.length)).length;
    expect(longest / CR_ITEMS.length).toBeLessThan(0.4);
  });
});
