import { describe, expect, it } from "vitest";
import { RC_SETS } from "./rc";
import { isClose, TONE_MEANS, toneVerdict } from "./tone";
import { TONES, words } from "./types";

describe("tone notes", () => {
  it("say what every tone means", () => {
    expect(Object.keys(TONE_MEANS).sort()).toEqual([...TONES].sort());
  });

  it("give every model summary a passage line that shows its tone, quoted exactly, and one short reason", () => {
    const withSummary = RC_SETS.filter((s) => s.summary);
    expect(withSummary.length).toBeGreaterThan(50);
    for (const s of withSummary) {
      const m = s.summary!;
      expect(m.toneCue, s.id).toBeTruthy();
      expect(s.paras.some((p) => p.includes(m.toneCue!)), `${s.id}: the cue is not in the passage`).toBe(true);
      expect(words(m.toneCue!), s.id).toBeLessThanOrEqual(30);
      expect(words(m.toneWhy ?? ""), s.id).toBeGreaterThanOrEqual(6);
      expect(words(m.toneWhy ?? ""), s.id).toBeLessThanOrEqual(30);
      expect(m.toneWhy, s.id).toMatch(/\.$/);
    }
  });

  it("call near pairs close, either way round, and the rest a different reading", () => {
    expect(toneVerdict("neutral", "analytical")).toBe("close");
    expect(isClose("analytical", "neutral")).toBe(true);
    expect(toneVerdict("optimistic", "analytical")).toBe("far");
    expect(toneVerdict("analytical", "analytical")).toBe("same");
    expect(toneVerdict("", "analytical")).toBe("none");
    expect(toneVerdict("grumpy", "analytical")).toBe("far");
  });
});
