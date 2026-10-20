import { describe, expect, it } from "vitest";
import { RC_CATALOG, VA_CATALOG } from "./catalog.gen";
import { CONTENT } from "./full";
import { contentHash, rcVersion, vaVersion } from "./types";
import { rcStale, sectionalStale } from "./versions";

describe("content versions", () => {
  it("match between the catalog and the content", () => {
    CONTENT.rcSets.forEach((s) => expect(RC_CATALOG.find((m) => m.id === s.id)?.v, s.id).toBe(rcVersion(s)));
    CONTENT.vaParas.forEach((p) => expect(VA_CATALOG.find((m) => m.id === p.id)?.v, p.id).toBe(vaVersion(p)));
  });
  it("change when one option changes, and only for that set", () => {
    const [a, b] = CONTENT.rcSets;
    const edited = structuredClone(a);
    edited.questions[0].options[1].t += " Indeed.";
    expect(rcVersion(edited)).not.toBe(rcVersion(a));
    expect(rcVersion(structuredClone(b))).toBe(rcVersion(b));
  });
  it("ignore a typo fixed in the passage itself", () => {
    const a = structuredClone(CONTENT.rcSets[0]);
    const before = rcVersion(a);
    a.paras[0] += " ";
    expect(rcVersion(a)).toBe(before);
  });
  it("are short and stable", () => {
    expect(contentHash({ x: 1 })).toMatch(/^[0-9a-f]{8}$/);
    expect(contentHash({ x: 1 })).toBe(contentHash({ x: 1 }));
  });
  it("flag an attempt on a rewritten set, but not one without a version", () => {
    const m = RC_CATALOG[0];
    expect(rcStale({ set: m.id, v: m.v })).toBe(false);
    expect(rcStale({ set: m.id, v: "00000000" })).toBe(true);
    expect(rcStale({ set: m.id })).toBe(false);
  });
  it("find the rewritten questions in a sectional", () => {
    const rc = RC_CATALOG[0], va = VA_CATALOG[0];
    const qs = [`rc:${rc.id}:0`, `pj:${va.id}`];
    expect(sectionalStale({ qs, v: [rc.v, va.v] })).toEqual([]);
    expect(sectionalStale({ qs, v: [rc.v, "ffffffff"] })).toEqual([1]);
    expect(sectionalStale({ qs })).toEqual([]);
  });
});
