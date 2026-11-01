import { describe, expect, it } from "vitest";
import { RESOURCES as VARC } from "../varc/resources";
import { CATEGORIES, RESOURCES } from "./resources";
import { GROUPS, PARTS, SLOTS, TABS, TOPICS } from "./learn";

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
  it("lists the past CAT DI sets in order, each pointing at its paper on 2IIM and naming its slot", () => {
    const ladder = RESOURCES.filter((r) => r.c === "d-di-ladder");
    expect(ladder).toHaveLength(12);
    ladder.forEach((r, i) => {
      expect(r.n.startsWith(`${i + 1}. `), r.id).toBe(true);
      const [, y, s] = r.u.match(/CAT-(\d{4})-Question-Paper-Slot-(\d)-DILR\/$/) ?? [];
      expect(y, r.id).toBeDefined();
      expect(r.t.startsWith(`CAT ${y}, slot ${s}.`), r.id).toBe(true);
    });
  });
  it("lists each recent slot with four or five sets", () => {
    SLOTS.forEach((r) => expect(r.data.length + r.logic.length, r.slot).toBeGreaterThanOrEqual(4));
    SLOTS.forEach((r) => expect(r.data.length + r.logic.length, r.slot).toBeLessThanOrEqual(5));
  });
  it("gives each Learn half its own guides and lists, and every Practice category a phase group", () => {
    PARTS.forEach((p) => {
      expect(TOPICS.some((t) => t.part === p.id), p.id).toBe(true);
      expect(CATEGORIES.some((c) => c.tab === "learn" && c.part === p.id), p.id).toBe(true);
    });
    CATEGORIES.filter((c) => c.part).forEach((c) => expect(c.tab, c.id).toBe("learn"));
    CATEGORIES.filter((c) => c.tab === "practice").forEach((c) => expect(c.group && GROUPS[c.group], c.id).toBeTruthy());
  });
});
