import { describe, expect, it } from "vitest";
import { LR_CATALOG } from "../../practice/catalog.gen";
import { LR_TYPE } from "../../practice/types";
import { RESOURCES } from "./resources";
import { LR_GUIDES } from "./guides";

describe("LR type guides (F21)", () => {
  it("has a guide for every LR type that has sets, and none for a type that is unknown", () => {
    const withSets = new Set(LR_CATALOG.map((m) => m.type));
    withSets.forEach((t) => expect(LR_GUIDES.some((g) => g.id === t), t).toBe(true));
    LR_GUIDES.forEach((g) => expect(Object.keys(LR_TYPE)).toContain(g.id));
    expect(new Set(LR_GUIDES.map((g) => g.id)).size).toBe(LR_GUIDES.length);
  });
  for (const g of LR_GUIDES) {
    it(`${g.id}: a full guide whose worked example is one of its own sets`, () => {
      [g.h, g.tag, g.what, g.draw, g.start].forEach((t) => expect(t.trim()).not.toBe(""));
      expect(g.method.length).toBeGreaterThanOrEqual(4);
      expect(g.traps.length).toBeGreaterThanOrEqual(3);
      const set = LR_CATALOG.find((m) => m.id === g.example.set);
      expect(set, g.example.set).toBeDefined();
      expect(set!.type).toBe(g.id);
      expect(g.links).toHaveLength(3);
    });
    it(`${g.id}: every link is one of the checked DILR resources`, () => {
      const checked = new Set(RESOURCES.map((r) => r.u));
      g.links.forEach((l) => { expect(l.u).toMatch(/^https:\/\//); expect(checked.has(l.u), l.u).toBe(true); });
    });
  }
});
