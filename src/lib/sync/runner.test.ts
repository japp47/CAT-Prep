import { beforeEach, describe, expect, it, vi } from "vitest";
import { blankState } from "../state";
import { blankLedger, type Ledger } from "./ledger";
import type { SyncIO } from "./client";

// The runner listens on window and document; a bare EventTarget stands in for both under Node.
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  vi.stubGlobal("navigator", { userAgent: "test", maxTouchPoints: 0 });
});

function io(call: SyncIO["call"]): SyncIO {
  let L: Ledger = { ...blankLedger(), on: true };
  return { call, getState: () => blankState(), apply: async () => {}, load: () => L, save: (x) => { L = x; }, now: () => Date.now() };
}

describe("sync runner", () => {
  it("a round that throws is reported, and the next round still runs", async () => {
    const { start, syncNow, getStatus } = await import("./runner");
    let calls = 0;
    const stop = start(io(async () => { calls++; throw new Error("boom"); }));
    await new Promise((r) => setTimeout(r, 0));
    expect(getStatus().phase).toBe("error");
    const before = calls;
    await syncNow(true);
    expect(calls).toBeGreaterThan(before);
    expect(getStatus().phase).toBe("error");
    stop();
  });

  it("two tabs never run a round at the same time", async () => {
    const held: string[] = [];
    let inside = 0, most = 0;
    // A minimal Web Locks: one holder per name, the rest wait in turn.
    const queue: (() => void)[] = [];
    let busy = false;
    const locks = { request: async (_name: string, f: () => Promise<unknown>) => {
      if (busy) await new Promise<void>((r) => queue.push(r));
      busy = true;
      try { return await f(); } finally { busy = false; queue.shift()?.(); }
    } };
    vi.stubGlobal("navigator", { userAgent: "test", maxTouchPoints: 0, locks });
    const slow: SyncIO["call"] = async <T,>() => {
      inside++; most = Math.max(most, inside); held.push("in");
      await new Promise((r) => setTimeout(r, 5));
      inside--;
      return { ok: true, status: 200, data: { cursor: 0, records: [], more: false } } as never as import("../api").ApiResult<T>;
    };
    const tab1 = await import("./runner");
    vi.resetModules();
    const tab2 = await import("./runner");
    const s1 = tab1.start(io(slow)), s2 = tab2.start(io(slow));
    await Promise.all([tab1.syncNow(true), tab2.syncNow(true)]);
    expect(held.length).toBeGreaterThanOrEqual(2);
    expect(most).toBe(1);
    s1(); s2();
  });
});
