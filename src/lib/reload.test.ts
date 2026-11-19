import { describe, expect, it, vi } from "vitest";
import { isStaleChunk, reloadOnce, staleUrl } from "./reload";

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

  it("names the failed file on this site, and nothing else", () => {
    vi.stubGlobal("location", { origin: "https://99ile.in" });
    expect(staleUrl(new TypeError("Failed to fetch dynamically imported module: https://99ile.in/assets/TodayLine-RnAFusUk.js"))).toBe("https://99ile.in/assets/TodayLine-RnAFusUk.js");
    expect(staleUrl(new Error("Unable to preload CSS for https://99ile.in/assets/index-5eiFamTD.css"))).toBe("https://99ile.in/assets/index-5eiFamTD.css");
    expect(staleUrl(new TypeError("Failed to fetch dynamically imported module: https://evil.example/x.js"))).toBeUndefined();
    expect(staleUrl(new TypeError("Importing a module script failed."))).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("refreshes the failed file past the browser's cache, then reloads", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    const fetch = vi.fn(() => Promise.resolve(new Response("")));
    vi.stubGlobal("fetch", fetch);
    expect(reloadOnce(5_000_000, "https://99ile.in/assets/x.js")).toBe(true);
    expect(fetch).toHaveBeenCalledWith("https://99ile.in/assets/x.js", { cache: "reload" });
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
  });
});
