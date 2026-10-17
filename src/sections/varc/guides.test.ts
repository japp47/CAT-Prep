import { describe, expect, it } from "vitest";
import { TYPE_GUIDES } from "./guides";
import { CATEGORIES, RESOURCES } from "./resources";

describe("question type guides", () => {
  it("covers every VARC type once", () => {
    expect(TYPE_GUIDES.map((g) => g.id)).toEqual(["summary-writing", "rc", "pj", "ps", "oso", "si", "cr"]);
  });
  it.each(TYPE_GUIDES.map((g) => [g.h, g] as const))("%s has method, traps, an example and three links", (_, g) => {
    expect(g.method.length).toBeGreaterThanOrEqual(4);
    expect(g.traps.length).toBeGreaterThanOrEqual(4);
    expect(g.links.map((l) => l.k)).toEqual(["Guide", "Video", "Practice"]);
    g.links.forEach((l) => expect(l.u).toMatch(/^https:\/\/[^\s()]+$/));
    expect(g.links[1].u).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
    const x = g.example;
    expect(x.answer.trim()).not.toBe("");
    expect(x.why.length).toBeGreaterThanOrEqual(2);
    if (x.options) {
      expect(x.options).toHaveLength(4);
      expect(x.answer).toMatch(/^[ABCD]$/);
    }
    if (x.items && g.id === "pj") expect([...x.answer].sort().join("")).toBe(x.items.map((_, i) => i + 1).join(""));
    if (x.items && g.id === "oso") expect(Number(x.answer)).toBeLessThanOrEqual(x.items.length);
  });
});

describe("VARC resources", () => {
  it("have unique ids and known categories", () => {
    const ids = RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    RESOURCES.forEach((r) => expect(cats.has(r.c), r.id).toBe(true));
  });
  it("give every question type at least one free bank on the Practice tab", () => {
    ["b-rc", "b-pj", "b-ps", "b-oso", "b-si", "b-cr"].forEach((c) => {
      expect(CATEGORIES.find((x) => x.id === c)?.tab).toBe("practice");
      expect(RESOURCES.some((r) => r.c === c)).toBe(true);
    });
  });
  it("drop the Cracku para jumbles PDF link, which now redirects to the blog home", () => {
    expect(RESOURCES.some((r) => r.u.includes("cat-para-jumbles-questions-pdf"))).toBe(false);
  });
});
