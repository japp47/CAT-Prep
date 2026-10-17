import { describe, expect, it } from "vitest";
import { CONTENT } from "./bank";
import { RC_CATALOG, VA_CATALOG } from "./catalog.gen";
import { rcMeta, vaMeta } from "./types";

describe("content catalog", () => {
  it("matches the content files (run `npm run catalog` if this fails)", () => {
    expect(RC_CATALOG).toEqual(CONTENT.rcSets.map(rcMeta));
    expect(VA_CATALOG).toEqual(CONTENT.vaParas.map(vaMeta));
  });

  it("keeps the full content out of the main bundle", () => {
    // Only the content loader may import the content files; everything else uses the catalog.
    const files = import.meta.glob<string>(["/src/**/*.{ts,tsx}", "!/src/**/*.test.ts", "!/src/practice/rc/**", "!/src/practice/bank.ts"], { query: "?raw", import: "default", eager: true });
    const offenders = Object.keys(files).filter((f) => /from "[./]*(?:practice\/)?(?:rc|va\/paragraphs|bank)"/.test(files[f]));
    expect(Object.keys(files).length).toBeGreaterThan(30);
    expect(offenders).toEqual([]);
  });
});
