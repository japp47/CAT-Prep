import { describe, expect, it } from "vitest";
import { aiPack } from "./aipack";
import { RC_SETS } from "./rc";
import { sentences } from "./sentences";
import { rcVersion } from "./types";

describe("the AI service's copy of the RC sets (F35, D100)", () => {
  const pack = aiPack(RC_SETS);
  it("carries every set and question, with the version the browser sends", () => {
    expect(pack.sets.length).toBe(RC_SETS.length);
    pack.sets.forEach((s, i) => {
      expect(s.v).toBe(rcVersion(RC_SETS[i]));
      expect(s.questions.length).toBe(RC_SETS[i].questions.length);
      expect(s.paras).toEqual(RC_SETS[i].paras.map(sentences));
    });
  });
  it("keeps every deciding line, as a reference to that exact sentence", () => {
    pack.sets.forEach((s, i) => s.questions.forEach((q, qi) => {
      const want = RC_SETS[i].questions[qi].lines ?? [];
      expect(q.lines.length, `${s.id} Q${qi}`).toBe(want.length);
      q.lines.forEach(([p, n], k) => expect(s.paras[p][n]).toBe(want[k]));
    }));
  });
});
