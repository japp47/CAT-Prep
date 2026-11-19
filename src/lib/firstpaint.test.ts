import { describe, expect, it } from "vitest";
import html from "../../index.html?raw";
import headers from "../../public/_headers?raw";

/** The sha256 of a text, base64, as a security policy names it. */
async function sha256(text: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return btoa(String.fromCharCode(...d));
}

// F97, D115: the one inline script in index.html (theme and page shape before the first paint) runs only because the
// security policy lists its hash. Edit the script and this fails until public/_headers carries the new hash.
describe("the first paint's inline script", () => {
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

  it("is the only inline script", () => {
    expect(inline).toHaveLength(1);
  });

  it("is allowed by its hash in every security policy the site sends", async () => {
    const hash = "'sha256-" + (await sha256(inline[0])) + "'";
    const policies = headers.split("\n").filter((l: string) => l.trim().startsWith("Content-Security-Policy:"));
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) expect(p).toContain(hash);
  });

  it("keeps the frame inside #root, so React replaces it", () => {
    expect(html).toMatch(/<div id="root"><div class="fp" aria-hidden="true">/);
  });
});

// F97, D115: what the first screen does not need stays out of the first download. Follows every static import from
// main.tsx (type imports and import() excluded) and fails when one of these is reached again.
describe("the first download", () => {
  const sources = import.meta.glob(["/src/**/*.ts", "/src/**/*.tsx", "!/src/**/*.test.*"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;
  const STATIC = /^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm;
  const resolve = (from: string, spec: string): string | null => {
    const base = spec.startsWith("@/") ? "/src/" + spec.slice(2) : spec.startsWith(".") ? new URL(spec, "file://" + from).pathname : null;
    if (!base) return null;
    for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) if (sources[base + ext] !== undefined) return base + ext;
    return null;
  };
  const eager = new Set<string>();
  const walk = (f: string) => {
    if (eager.has(f)) return;
    eager.add(f);
    for (const m of sources[f].matchAll(STATIC)) { const r = resolve(f, m[1]); if (r) walk(r); }
  };
  walk("/src/main.tsx");

  it.each([
    "/src/practice/catalog.gen.ts", "/src/practice/daily.ts", "/src/practice/bank.ts", "/src/practice/content.ts",
    "/src/practice/record.ts", "/src/practice/redo.ts", "/src/planner/engine.ts", "/src/planner/auto.ts",
    "/src/planner/templates.ts", "/src/sections/varc/plan.ts", "/src/sections/dilr/plan.ts", "/src/data/updates.ts",
  ])("does not carry %s", (mod) => {
    expect(sources[mod], mod + " moved or renamed: update this list").toBeDefined();
    expect(eager.has(mod)).toBe(false);
  });

  it("does carry what the first screen needs", () => {
    for (const mod of ["/src/App.tsx", "/src/components/Layout.tsx", "/src/pages/Home.tsx", "/src/sections/index.ts", "/src/planner/done.ts"]) expect(eager.has(mod)).toBe(true);
  });
});
