import { describe, expect, it, vi } from "vitest";
import { isStaleChunk, reloadOnce } from "./reload";

describe("after a deploy (hotfix, 20 Nov 2026)", () => {
  it("knows a failed code file in each browser's words, and nothing else", () => {
    expect(isStaleChunk(new TypeError("Failed to fetch dynamically imported module: https://99ile.in/assets/More-npb4Csyr.js"))).toBe(true);
    expect(isStaleChunk(new TypeError("error loading dynamically imported module: https://99ile.in/assets/x.js"))).toBe(true);
    expect(isStaleChunk(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isStaleChunk(new Error("Unable to preload CSS for /assets/x.css"))).toBe(true);
    expect(isStaleChunk(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(false);
    expect(isStaleChunk(null)).toBe(false);
  });

  it("reloads once, then not again within a minute", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    expect(reloadOnce(1_000_000)).toBe(true);
    expect(reloadOnce(1_030_000)).toBe(false);
    expect(reloadOnce(1_070_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
