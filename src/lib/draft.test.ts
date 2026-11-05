import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addAway, AWAY_MS, comeBack, DRAFT_TTL, dropCleared, peekCleared, pruneDrafts, readDraftAt, writeDraft } from "./draft";

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

describe("Coming back to a set (D83)", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T10:00:00"));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("carries on up to 30 minutes away and asks after that", () => {
    const at = Date.now();
    expect(comeBack(at, at + AWAY_MS)).toBe("carry-on");
    expect(comeBack(at, at + AWAY_MS + 1)).toBe("ask");
  });

  it("keeps a break carried on after with the draft until the draft is removed", () => {
    writeDraft("rc:a", { n: 1 });
    expect(addAway("rc:a", 3 * 3600)).toBe(10800);
    writeDraft("rc:a", { n: 2 });
    expect(readDraftAt("rc:a")).toMatchObject({ v: { n: 2 }, away: 10800 });
    expect(addAway("rc:a", 3600)).toBe(14400);
    writeDraft("rc:a", null);
    writeDraft("rc:a", { n: 3 });
    expect(readDraftAt("rc:a")?.away).toBeUndefined();
  });

  it("notes a practice draft dropped for age, once, and not other drafts", () => {
    const left = Date.now();
    writeDraft("lr:x", { n: 1 });
    writeDraft("mock-review", { n: 1 });
    vi.setSystemTime(left + DRAFT_TTL + 1000);
    expect(readDraftAt("lr:x")).toBeNull();
    expect(peekCleared("lr:x")).toBe(left);
    expect(peekCleared("mock-review")).toBeNull();
    dropCleared("lr:x");
    expect(peekCleared("lr:x")).toBeNull();
  });
});
