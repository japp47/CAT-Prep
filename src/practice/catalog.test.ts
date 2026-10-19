import { describe, expect, it } from "vitest";
import { CONTENT } from "./full";
import { RC_FILES } from "./bank";
import { CR_CATALOG, RC_CATALOG, RC_FILE, VA_CATALOG } from "./catalog.gen";
import { RC_BY_FILE } from "./rc";
import { RC_LEADS } from "./leads.gen";
import { crMeta, rcLead, rcMeta, vaMeta } from "./types";

describe("content catalog", () => {
  it("matches the content files (run `npm run catalog` if this fails)", () => {
    expect(RC_CATALOG).toEqual(CONTENT.rcSets.map(rcMeta));
    expect(VA_CATALOG).toEqual(CONTENT.vaParas.map(vaMeta));
    expect(CR_CATALOG).toEqual(CONTENT.crItems.map(crMeta));
    expect(RC_LEADS).toEqual(Object.fromEntries(CONTENT.rcSets.map((s) => [s.id, rcLead(s)])));
  });

  it("splits every opening paragraph before a whole last sentence", () => {
    for (const s of CONTENT.rcSets) {
      const [body, turn] = rcLead(s);
      expect(turn, s.id).toMatch(/^[A-Z].*[.!?]["”’)]?$/);
      expect(body + " " + turn, s.id).toBe(s.paras[0]);
    }
  });

  it("keeps the full content out of the main bundle", () => {
    // The content files are reached only through the loaders in bank.ts, which content.ts calls; everything else uses the catalog.
    // full.ts loads everything at once and is for tests and the catalog script only.
    const files = import.meta.glob<string>(["/src/**/*.{ts,tsx}", "!/src/**/*.test.ts", "!/src/practice/rc/**", "!/src/practice/cr/**", "!/src/practice/full.ts"], { query: "?raw", import: "default", eager: true });
    const content = Object.keys(files).filter((f) => /from "[./]*(?:practice\/)?(?:rc|cr|va\/paragraphs|full)"|from "[./]*content\/(?:rc|cr)\//.test(files[f]));
    const bank = Object.keys(files).filter((f) => /from "[./]*(?:practice\/)?bank"/.test(files[f]));
    expect(Object.keys(files).length).toBeGreaterThan(30);
    expect(content).toEqual([]);
    expect(bank).toEqual(["/src/practice/content.ts"]);
  });

  it("can load every RC file, and knows which file holds each set", () => {
    // A file added to content/rc/ but not to rc/index.ts (or the other way round) fails here.
    expect([...RC_FILES].sort()).toEqual(Object.keys(RC_BY_FILE).sort());
    expect(Object.keys(RC_FILE).sort()).toEqual(CONTENT.rcSets.map((s) => s.id).sort());
    for (const [file, sets] of Object.entries(RC_BY_FILE)) sets.forEach((s) => expect(RC_FILE[s.id], s.id).toBe(file));
  });
});
