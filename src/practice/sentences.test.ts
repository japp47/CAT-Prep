import { describe, expect, it } from "vitest";
import { RC_SETS } from "./rc";
import { findLine, lineVerdict, sentences } from "./sentences";

describe("a passage's lines (F103)", () => {
  it("cut at a stop before a capital, and never at an abbreviation, a decimal or a lower-case word", () => {
    expect(sentences('It rose 3.5 times, e.g. in towns. Dr. Rao agreed! Is it so? “Yes,” she said. (Then) more.')).toEqual([
      "It rose 3.5 times, e.g. in towns.", "Dr. Rao agreed!", "Is it so?", "“Yes,” she said.", "(Then) more.",
    ]);
  });
  it("lose no text from any passage", () => {
    for (const s of RC_SETS) for (const p of s.paras) expect(sentences(p).join(" "), s.id).toBe(p.trim().replace(/\s+/g, " "));
  });
});

describe("the deciding lines in the RC sets (F103, D99)", () => {
  it("are one or two exact sentences of their own passage", () => {
    for (const s of RC_SETS) s.questions.forEach((q, qi) => {
      if (!q.lines) return;
      expect(q.lines.length, `${s.id} Q${qi}`).toBeGreaterThan(0);
      expect(q.lines.length, `${s.id} Q${qi}`).toBeLessThanOrEqual(2);
      q.lines.forEach((l) => expect(findLine(s.paras, l), `${s.id} Q${qi}: "${l.slice(0, 50)}"`).not.toBeNull());
    });
  });
  it("cover most questions, and stay off paragraph-function and EXCEPT questions unless a line truly settles them", () => {
    const qs = RC_SETS.flatMap((s) => s.questions);
    expect(qs.filter((q) => q.lines).length / qs.length).toBeGreaterThan(0.75);
    const except = qs.filter((q) => q.type === "except");
    expect(except.filter((q) => q.lines).length).toBeLessThan(except.length / 4);
  });
});

describe("what a tapped line shows", () => {
  const paras = ["Alpha one. Alpha two.", "Beta one. Beta two."];
  it("is the line, the right paragraph, or not the line", () => {
    expect(lineVerdict(paras, ["Beta two."], [1], [1, 1])).toBe("proves");
    expect(lineVerdict(paras, ["Beta two."], [1], [1, 0])).toBe("near");
    expect(lineVerdict(paras, ["Beta two."], [1], [0, 1])).toBe("off");
    // A deciding line outside the listed proof paragraphs still makes its own paragraph "near".
    expect(lineVerdict(paras, ["Beta two."], [0], [1, 0])).toBe("near");
  });
});
