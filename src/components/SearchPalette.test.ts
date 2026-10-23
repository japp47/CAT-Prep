import { describe, expect, it } from "vitest";
import { rankSearch } from "./SearchPalette";

describe("site search words", () => {
  it("finds a word by its simple form", () => {
    const sync = ["Sync between devices", "sync link code qr scan devices"] as const;
    expect(rankSearch("syncing", ...sync)).toBeGreaterThan(0);
    expect(rankSearch("synced", ...sync)).toBeGreaterThan(0);
    expect(rankSearch("linking devices", ...sync)).toBeGreaterThan(0);
    expect(rankSearch("sync", ...sync)).toBe(3);
  });

  it("does not stretch short words or unrelated ones", () => {
    expect(rankSearch("bus", "Sync between devices", "sync")).toBe(0);
    expect(rankSearch("mocking", "Sync between devices", "sync")).toBe(0);
  });
});
