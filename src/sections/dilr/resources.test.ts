import { describe, expect, it } from "vitest";
import { RESOURCES as VARC } from "../varc/resources";
import { CATEGORIES, RESOURCES } from "./resources";
import { TABS, TOPIC_SHARE, TOPIC_YEARS } from "./learn";

describe("DILR resources", () => {
  it("has unique ids that never collide with VARC's (ticks share one store)", () => {
    const ids = RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^d-/));
    const varc = new Set(VARC.map((r) => r.id));
    ids.forEach((id) => expect(varc.has(id), id).toBe(false));
  });
  it("puts every resource in a known category, every category on a tab, and leaves no category empty", () => {
    const cats = new Set(CATEGORIES.map((c) => c.id));
    RESOURCES.forEach((r) => expect(cats.has(r.c), r.id).toBe(true));
    const tabs = new Set(TABS.map((t) => t.id));
    CATEGORIES.forEach((c) => { expect(tabs.has(c.tab), c.id).toBe(true); expect(RESOURCES.some((r) => r.c === c.id), c.id).toBe(true); });
  });
  it("links only over https and says why each link is there", () => {
    RESOURCES.forEach((r) => { expect(r.u, r.id).toMatch(/^https:\/\//); expect(r.w.length, r.id).toBeGreaterThan(20); });
  });
  it("has a value for every year in the topic table", () => {
    TOPIC_SHARE.forEach((t) => expect(t.y, t.topic).toHaveLength(TOPIC_YEARS.length));
  });
});
