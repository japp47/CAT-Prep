import { beforeEach, describe, expect, it, vi } from "vitest";
import { blankState, normalize, STORAGE_KEY, type AppState } from "./state";

// One localStorage shared by two "tabs": two separate copies of the module, as two tabs have.
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
  vi.resetModules();
});

const tabsModule = async () => { vi.resetModules(); return import("./tabs"); };
const att = (id: string) => ({ id, d: "2026-10-21", set: "s", mode: "library" as const, ans: [0], c: 1, w: 0, secs: 60, first: 0 });
const edit = (st: AppState, f: (s: AppState) => void) => { const n = structuredClone(st); f(n); return normalize(JSON.parse(JSON.stringify(n))); };
const disk = () => normalize(JSON.parse(store.get(STORAGE_KEY)!));

describe("two tabs saving", () => {
  it("a tab that saves after another keeps both edits instead of overwriting", async () => {
    const A = await tabsModule(), B = await tabsModule();
    const a0 = A.loadTracked(), b0 = B.loadTracked();
    const a1 = edit(a0, (s) => { s.rcAttempts.push(att("from-A")); });
    expect(A.commit(a1).merged).toBeUndefined();
    // B has not heard of A's save yet and saves its own edit.
    const b1 = edit(b0, (s) => { s.errors.push({ id: "from-B", d: "2026-10-21", sec: "VARC", t: "Tone", trap: "", src: "", why: "", fix: "" }); });
    const res = B.commit(b1);
    expect(res.merged).toBeDefined();
    expect(disk().rcAttempts.map((x) => x.id)).toEqual(["from-A"]);
    expect(disk().errors.map((x) => x.id)).toEqual(["from-B"]);
  });

  it("the other tab's save arriving during an unsaved edit is merged, not taken over it", async () => {
    const A = await tabsModule(), B = await tabsModule();
    const a0 = A.loadTracked(), b0 = B.loadTracked();
    A.commit(edit(a0, (s) => { s.ticks["guide-a"] = 1; }));
    const bEditing = edit(b0, (s) => { s.ticks["guide-b"] = 1; });
    const r = B.fromOtherTab(bEditing, store.get(STORAGE_KEY)!);
    expect(r.needsSave).toBe(true);
    expect(Object.keys(r.st.ticks).sort()).toEqual(["guide-a", "guide-b"]);
    B.commit(r.st);
    expect(Object.keys(disk().ticks).sort()).toEqual(["guide-a", "guide-b"]);
  });

  it("with nothing unsaved, a tab simply takes the other tab's save", async () => {
    const A = await tabsModule(), B = await tabsModule();
    const a0 = A.loadTracked(), b0 = B.loadTracked();
    A.commit(edit(a0, (s) => { s.ticks["x"] = 1; }));
    const r = B.fromOtherTab(b0, store.get(STORAGE_KEY)!);
    expect(r.needsSave).toBe(false);
    expect(r.st.ticks).toEqual({ x: 1 });
  });

  it("both tabs change the same day: the minutes of both are kept", async () => {
    const A = await tabsModule(), B = await tabsModule();
    const a0 = A.loadTracked(), b0 = B.loadTracked();
    A.commit(edit(a0, (s) => { s.days["2026-10-21"] = { done: { "varc:rc": 30 } }; }));
    B.commit(edit(b0, (s) => { s.days["2026-10-21"] = { done: { "varc:va": 20 } }; }));
    expect(disk().days["2026-10-21"].done).toEqual({ "varc:rc": 30, "varc:va": 20 });
  });

  it("a deletion in one tab and no change in the other stays deleted", async () => {
    store.set(STORAGE_KEY, JSON.stringify(edit(blankState(), (s) => { s.rcAttempts.push(att("old")); })));
    const A = await tabsModule(), B = await tabsModule();
    const a0 = A.loadTracked(), b0 = B.loadTracked();
    A.commit(edit(a0, (s) => { s.rcAttempts = []; }));
    B.commit(edit(b0, (s) => { s.ticks["t"] = 1; }));
    expect(disk().rcAttempts).toEqual([]);
    expect(disk().ticks).toEqual({ t: 1 });
  });

  it("many interleaved saves from two tabs lose nothing", async () => {
    const A = await tabsModule(), B = await tabsModule();
    let a = A.loadTracked(), b = B.loadTracked();
    for (let i = 0; i < 40; i++) {
      if (i % 3 === 0) { const r = B.fromOtherTab(b, store.get(STORAGE_KEY) ?? JSON.stringify(b)); b = r.st; if (r.needsSave) B.commit(b); }
      a = edit(a, (s) => { s.ticks["a" + i] = 1; }); const ra = A.commit(a); a = ra.merged ?? a;
      b = edit(b, (s) => { s.ticks["b" + i] = 1; }); const rb = B.commit(b); b = rb.merged ?? b;
    }
    const keys = Object.keys(disk().ticks);
    expect(keys.length).toBe(80);
  });
});
