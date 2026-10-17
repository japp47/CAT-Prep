import { describe, expect, it } from "vitest";
import { DRAFT_TTL, pruneDrafts } from "./draft";

describe("pruneDrafts", () => {
  it("keeps drafts younger than a day and drops older ones", () => {
    const now = 1_000_000_000;
    const all = {
      fresh: { at: now - 1000, v: 1 },
      edge: { at: now - DRAFT_TTL, v: 2 },
      old: { at: now - DRAFT_TTL - 1, v: 3 },
    };
    expect(Object.keys(pruneDrafts(all, now))).toEqual(["fresh", "edge"]);
  });

  it("drops entries that are not drafts", () => {
    const bad = { x: null, y: { v: 1 } } as unknown as Parameters<typeof pruneDrafts>[0];
    expect(pruneDrafts(bad, 0)).toEqual({});
  });
});
