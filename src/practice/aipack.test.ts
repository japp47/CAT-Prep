import { describe, expect, it } from "vitest";
import { aiPack } from "./aipack";
import { RC_SETS } from "./rc";
import { sentences } from "./sentences";
import { rcVersion } from "./types";

describe("the AI service's copy of the RC sets (F36, D105)", () => {
  const pack = aiPack(RC_SETS);
  it("carries every set with a model summary, with the version the browser sends", () => {
    const want = RC_SETS.filter((s) => s.summary);
    expect(pack.sets.map((s) => s.id)).toEqual(want.map((s) => s.id));
    pack.sets.forEach((s, i) => {
      expect(s.v).toBe(rcVersion(want[i]));
      expect(s.paras).toEqual(want[i].paras.map(sentences));
      expect(s.summary.model).toBe(want[i].summary!.model);
    });
  });
  it("publishes no questions or answer keys", () => {
    const json = JSON.stringify(pack);
    expect(json).not.toContain('"questions"');
    expect(json).not.toContain('"answer"');
  });
});
