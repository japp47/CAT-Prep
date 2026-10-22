import { describe as group, expect, it } from "vitest";
import type { ApiResult } from "../api";
import { blankState, normalize, type AppState } from "../state";
import { canon, describe, link, round, turnOn, type SyncIO, type WireRecord } from "./client";
import { blankLedger, dirty, track, type Ledger } from "./ledger";

/**
 * A fake of the Go server's sync API with the same rules (server/internal/syncapi): server revs, compare-and-set on
 * baseRev, equal data counts as applied. Like Postgres jsonb, it hands JSON back with its keys reordered.
 */
class FakeServer {
  rev = 0;
  rows = new Map<string, WireRecord>();
  ids = 0;
  /** Set to make the next call fail after the server did its work (a lost answer). */
  dropNextAnswer = false;
  down = false;
  pageSize = 500;
  /** Rows the server refuses one by one, with a code, as the Go server does for too big or unknown kinds. */
  refuse: (c: WireRecord) => string | undefined = () => undefined;
  /** Link and recovery codes and the identity each brings: link codes work once. */
  codes = new Map<string, string>();
  /** Another device writes this record just before every push: the worst case for stale answers. */
  storm?: string;

  sorted(x: unknown): unknown {
    if (Array.isArray(x)) return x.map((v) => this.sorted(v));
    if (x && typeof x === "object") return Object.fromEntries(Object.keys(x).sort().reverse().map((k) => [k, this.sorted((x as Record<string, unknown>)[k])]));
    return x;
  }

  handle(path: string, body: unknown): ApiResult<unknown> {
    if (this.down) return { ok: false, status: 0, code: "offline", message: "offline" };
    const out = this.route(path, body);
    if (this.dropNextAnswer) { this.dropNextAnswer = false; return { ok: false, status: 503, code: "http_503", message: "lost" }; }
    return out;
  }

  route(path: string, body: unknown): ApiResult<unknown> {
    const ok = (data: unknown): ApiResult<unknown> => ({ ok: true, status: 200, data });
    if (path === "/identity") return ok({ identityId: "id-" + ++this.ids, deviceId: "dev-" + this.ids, recoveryCode: "RECO-VERY-CODE-" + this.ids });
    if (path === "/identity/link" || path === "/identity/recover") {
      const who = this.codes.get((body as { code: string }).code);
      if (!who) return { ok: false, status: 404, code: "bad_code", message: "That code did not work." };
      if (path === "/identity/link") this.codes.delete((body as { code: string }).code);
      return { ok: true, status: 201, data: { identityId: who, deviceId: "dev-" + ++this.ids } };
    }
    if (path === "/sync/pull") {
      const cursor = (body as { cursor: number }).cursor;
      const recs = [...this.rows.values()].filter((r) => r.rev > cursor).sort((a, b) => a.rev - b.rev);
      const page = recs.slice(0, this.pageSize).map((r) => ({ ...r, data: this.sorted(r.data) }));
      return ok({ cursor: page.length ? page[page.length - 1].rev : cursor, records: page, more: recs.length > this.pageSize });
    }
    if (path === "/sync/push") {
      const applied: unknown[] = [], stale: unknown[] = [], rejected: unknown[] = [];
      if (this.storm) { const r = this.rows.get(this.storm); if (r) this.rows.set(this.storm, { ...r, data: { ...(r.data as object), other: this.rev }, rev: ++this.rev }); }
      for (const c of (body as { changes: (WireRecord & { baseRev: number })[] }).changes) {
        const why = this.refuse(c);
        if (why) { rejected.push({ kind: c.kind, id: c.id, code: why }); continue; }
        const k = c.kind + ":" + c.id, cur = this.rows.get(k);
        if (!cur) { this.rows.set(k, { kind: c.kind, id: c.id, data: c.data, deleted: c.deleted, stamp: c.stamp, rev: ++this.rev }); applied.push({ kind: c.kind, id: c.id, rev: this.rev }); }
        else if (cur.deleted === c.deleted && canon(cur.data) === canon(c.data)) applied.push({ kind: c.kind, id: c.id, rev: cur.rev });
        else if (cur.rev === c.baseRev) { this.rows.set(k, { ...cur, data: c.data, deleted: c.deleted, stamp: c.stamp, rev: ++this.rev }); applied.push({ kind: c.kind, id: c.id, rev: this.rev }); }
        else stale.push({ ...cur, data: this.sorted(cur.data) });
      }
      return ok({ applied, stale, rejected });
    }
    return { ok: false, status: 404, code: "not_found", message: path };
  }
}

/** One browser: its state and ledger in memory, stored through JSON like localStorage. */
class Browser {
  st: AppState;
  ledger = JSON.stringify(blankLedger());
  calls: string[] = [];
  clock = 1_700_000_000_000;
  io: SyncIO;
  constructor(server: FakeServer, st = blankState()) {
    this.st = normalize(JSON.parse(JSON.stringify(st)));
    this.io = {
      call: async <T,>(path: string, body?: unknown) => { this.calls.push(path); return server.handle(path, JSON.parse(JSON.stringify(body ?? null))) as ApiResult<T>; },
      getState: () => this.st,
      apply: async (fn) => { this.st = fn(this.st); },
      load: () => JSON.parse(this.ledger) as Ledger,
      save: (L) => { this.ledger = JSON.stringify(L); },
      now: () => (this.clock += 1000),
    };
  }
  get L() { return this.io.load(); }
  /** What the app does after a save: the background ledger update. */
  edit(fn: (st: AppState) => void) {
    const next = structuredClone(this.st);
    fn(next);
    this.st = normalize(JSON.parse(JSON.stringify(next)));
    this.io.save(track(this.io.load(), this.st, this.io.now()));
  }
  attempt(id: string, set = "set-a") {
    this.edit((s) => { s.rcAttempts.push({ id, d: "2026-10-20", set, mode: "library", ans: [0, 1], c: 1, w: 1, secs: 300, first: 0 }); });
  }
  ids() { return this.st.rcAttempts.map((a) => a.id).sort(); }
}

const about = { label: "Test", platform: "mac" };
/** b joins a's progress with a link code, as scanning a's QR does. */
async function linkB(server: FakeServer, a: Browser, b: Browser, keep = true) {
  server.codes.set("ABCDEFGH", a.L.who!.identityId);
  return link(b.io, "link", "ABCDEFGH", about, keep);
}
const rcRows = (server: FakeServer) => [...server.rows.keys()].filter((k) => k.startsWith("rc:")).length;

group("sync client", () => {
  it("turning on pushes everything this device has, and leaves nothing dirty", async () => {
    const server = new FakeServer();
    const a = new Browser(server);
    a.attempt("a1");
    a.edit((s) => { s.errors.push({ id: "e1", d: "2026-10-01", sec: "VARC", t: "Tone", trap: "", src: "", why: "", fix: "" }); });
    const out = await turnOn(a.io, about);
    expect(out.ok).toBe(true);
    expect([...server.rows.keys()]).toEqual(expect.arrayContaining(["rc:a1", "error:e1", "profile:me"]));
    expect(a.L.on).toBe(true);
    expect(a.L.who?.identityId).toBe("id-1");
    expect(dirty(a.L)).toEqual([]);
  });

  it("brings one browser's attempts to another and back", async () => {
    const server = new FakeServer();
    const a = new Browser(server), b = new Browser(server);
    a.attempt("a1"); a.attempt("a2");
    b.attempt("b1");
    await turnOn(a.io, about);
    await linkB(server, a, b);
    expect(b.ids()).toEqual(["a1", "a2", "b1"]);
    await round(a.io);
    expect(a.ids()).toEqual(["a1", "a2", "b1"]);
    expect(rcRows(server)).toBe(3);
  });

  it("does not push again what it just pulled, though the server reorders JSON keys", async () => {
    const server = new FakeServer();
    const a = new Browser(server), b = new Browser(server);
    a.attempt("a1");
    await turnOn(a.io, about);
    const revBefore = server.rev;
    await linkB(server, a, b);
    expect(b.calls).toEqual(["/identity/link", "/sync/pull"]);
    b.calls = [];
    await round(b.io);
    expect(server.rev).toBe(revBefore);
    expect(b.calls).toEqual(["/sync/pull"]);
  });

  it("a lost answer is safe: the retry changes nothing on the server", async () => {
    const server = new FakeServer();
    const a = new Browser(server);
    await turnOn(a.io, about);
    a.attempt("a1");
    server.dropNextAnswer = true;
    await round(a.io); // the pull answer is lost, nothing pushed yet
    server.dropNextAnswer = false;
    await round(a.io);
    const rev = server.rev;
    a.edit(() => {});
    server.dropNextAnswer = true;
    a.attempt("a2");
    const lost = await round(a.io);
    expect(lost.ok).toBe(false);
    await round(a.io);
    expect(rcRows(server)).toBe(2);
    expect(server.rev).toBe(rev + 1);
    expect(dirty(a.L).filter((k) => k.startsWith("rc:"))).toEqual([]);
  });

  it("a deletion travels, and a stale write is merged instead of overwriting", async () => {
    const server = new FakeServer();
    const a = new Browser(server), b = new Browser(server);
    a.attempt("a1"); a.attempt("a2");
    await turnOn(a.io, about);
    await linkB(server, a, b);
    a.edit((s) => { s.rcAttempts = s.rcAttempts.filter((x) => x.id !== "a1"); });
    await round(a.io);
    expect(server.rows.get("rc:a1")?.deleted).toBe(true);
    // b changed a1 without having seen the deletion: its push is stale, the merge keeps the deletion.
    b.edit((s) => { s.rcAttempts.find((x) => x.id === "a1")!.secs = 999; });
    await round(b.io);
    expect(b.ids()).toEqual(["a2"]);
    await round(a.io);
    expect(a.ids()).toEqual(["a2"]);
  });

  it("offline keeps everything; a removed device turns sync off here", async () => {
    const server = new FakeServer();
    const a = new Browser(server);
    a.attempt("a1");
    await turnOn(a.io, about);
    server.down = true;
    a.attempt("a2");
    const out = await round(a.io);
    expect(out.ok).toBe(false);
    expect(a.ids()).toEqual(["a1", "a2"]);
    expect(a.L.on).toBe(true);
    server.down = false;
    a.io.call = async <T,>() => ({ ok: false, status: 401, code: "signed_out", message: "x" }) as ApiResult<T>;
    await round(a.io);
    expect(a.L.on).toBe(false);
    expect(a.ids()).toEqual(["a1", "a2"]);
  });

  it("pulls in pages", async () => {
    const server = new FakeServer();
    server.pageSize = 2;
    const a = new Browser(server), b = new Browser(server);
    ["1", "2", "3", "4", "5"].forEach((n) => a.attempt("a" + n));
    await turnOn(a.io, about);
    await linkB(server, a, b);
    expect(b.ids()).toEqual(["a1", "a2", "a3", "a4", "a5"]);
    expect(b.L.cursor).toBe(server.rev);
  });

  it("two browsers editing in random order end up equal", async () => {
    for (let seed = 1; seed <= 20; seed++) {
      let x = seed;
      const r = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
      const server = new FakeServer();
      const a = new Browser(server), b = new Browser(server);
      await turnOn(a.io, about);
      await linkB(server, a, b);
      for (let step = 0; step < 30; step++) {
        const d = r() < 0.5 ? a : b;
        const roll = r();
        if (roll < 0.4) d.attempt(`s${seed}-${step}`);
        else if (roll < 0.55 && d.st.rcAttempts.length) { const id = d.st.rcAttempts[Math.floor(r() * d.st.rcAttempts.length)].id; d.edit((s) => { s.rcAttempts = s.rcAttempts.filter((q) => q.id !== id); }); }
        else if (roll < 0.7) server.down = !server.down;
        else await round(d.io);
      }
      server.down = false;
      for (let i = 0; i < 3; i++) { await round(a.io); await round(b.io); }
      expect(a.ids(), `seed ${seed}`).toEqual(b.ids());
    }
  });
});

group("linking", () => {
  it("turning on hands back the recovery code once", async () => {
    const server = new FakeServer();
    const a = new Browser(server);
    const out = await turnOn(a.io, about);
    expect(out.ok && out.recoveryCode).toBe("RECO-VERY-CODE-1");
    expect(JSON.stringify(a.L)).not.toContain("RECO"); // never stored on the device
  });

  it("start fresh: this device takes the server's progress and deletes nothing anywhere", async () => {
    const server = new FakeServer();
    const a = new Browser(server), b = new Browser(server);
    a.attempt("a1");
    b.attempt("b-old");
    await turnOn(a.io, about);
    const out = await linkB(server, a, b, false);
    expect(out.ok).toBe(true);
    expect(b.ids()).toEqual(["a1"]);
    expect([...server.rows.values()].some((r) => r.deleted)).toBe(false);
  });

  it("a wrong code changes nothing on this device", async () => {
    const server = new FakeServer();
    const b = new Browser(server);
    b.attempt("b1");
    const out = await link(b.io, "link", "WRONGCDE", about, false);
    expect(out.ok).toBe(false);
    expect(b.ids()).toEqual(["b1"]);
    expect(b.L.on).toBe(false);
  });

  it("a recovery code brings everything to a fresh browser", async () => {
    const server = new FakeServer();
    const a = new Browser(server), fresh = new Browser(server);
    a.attempt("a1"); a.attempt("a2");
    await turnOn(a.io, about);
    server.codes.set("RECOVERYCODE1234", a.L.who!.identityId);
    expect((await link(fresh.io, "recover", "RECOVERYCODE1234", about, true)).ok).toBe(true);
    expect(fresh.ids()).toEqual(["a1", "a2"]);
  });
});

group("every kind", () => {
  it("errors, words, mocks, settings and the profile travel", async () => {
    const server = new FakeServer();
    const a = new Browser(server), b = new Browser(server);
    a.edit((s) => {
      s.errors.push({ id: "e1", d: "2026-10-01", sec: "VARC", t: "Tone", trap: "", src: "", why: "", fix: "" });
      s.vocab.push({ id: "w1", w: "laconic", m: "using few words", s: "", b: 0, due: "2026-10-02" });
      s.ticks["guide-1"] = 1;
      s.since = "2026-09-01";
    });
    await turnOn(a.io, about);
    await linkB(server, a, b);
    expect(b.st.errors.map((e) => e.id)).toEqual(["e1"]);
    expect(b.st.vocab.map((w) => w.id)).toEqual(["w1"]);
    expect(b.st.ticks["guide-1"]).toBe(1);
    expect(b.st.since).toBe("2026-09-01");
  });

  it("two devices tick blocks on the same day offline: both ticks survive", async () => {
    const server = new FakeServer();
    const a = new Browser(server), b = new Browser(server);
    await turnOn(a.io, about);
    await linkB(server, a, b);
    server.down = true;
    a.edit((s) => { s.days["2026-10-21"] = { done: { "varc:rc": 30 } }; });
    b.edit((s) => { s.days["2026-10-21"] = { done: { "varc:va": 20 }, spent: { "varc:va": 25 } }; });
    await round(a.io); await round(b.io);
    server.down = false;
    await round(a.io); await round(b.io); await round(a.io);
    for (const d of [a, b]) expect(d.st.days["2026-10-21"]).toEqual({ done: { "varc:rc": 30, "varc:va": 20 }, spent: { "varc:va": 25 } });
  });

  it("a redo item practised on both keeps the higher tries", async () => {
    const server = new FakeServer();
    const a = new Browser(server), b = new Browser(server);
    a.edit((s) => { s.redo.push({ k: "rc:set-a:0", added: "2026-10-01", due: "2026-10-04", box: 1, tries: 1 }); });
    await turnOn(a.io, about);
    await linkB(server, a, b);
    a.edit((s) => { s.redo[0].tries = 3; s.redo[0].box = 3; });
    b.edit((s) => { s.redo[0].tries = 2; });
    await round(b.io); await round(a.io); await round(b.io);
    expect(a.st.redo[0].tries).toBe(3);
    expect(b.st.redo[0].tries).toBe(3);
  });

  it("unticking travels as a deletion", async () => {
    const server = new FakeServer();
    const a = new Browser(server), b = new Browser(server);
    a.edit((s) => { s.ticks["guide-1"] = 1; s.ticks["guide-2"] = 1; });
    await turnOn(a.io, about);
    await linkB(server, a, b);
    a.edit((s) => { delete s.ticks["guide-1"]; });
    await round(a.io); await round(b.io);
    expect(Object.keys(b.st.ticks)).toEqual(["guide-2"]);
  });

  it("a big first sync goes in batches and reports its progress", async () => {
    const server = new FakeServer();
    const a = new Browser(server);
    a.edit((s) => { for (let i = 0; i < 450; i++) s.ticks["t" + i] = 1; });
    const seen: [number, number][] = [];
    a.io.progress = (done, total) => seen.push([done, total]);
    await turnOn(a.io, about);
    expect([...server.rows.keys()].filter((k) => k.startsWith("tick:")).length).toBe(450);
    expect(seen[0][0]).toBe(0);
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.every(([d, t]) => d < t)).toBe(true);
    expect(a.calls.filter((c) => c === "/sync/push").length).toBeGreaterThanOrEqual(3);
  });

  it("wiping a device with sync turned off first sends no deletions", async () => {
    const server = new FakeServer();
    const a = new Browser(server);
    a.attempt("a1");
    a.edit((s) => { s.ticks["guide-1"] = 1; });
    await turnOn(a.io, about);
    const before = server.rev;
    a.io.save({ ...a.L, on: false }); // what Settings does before "Delete from this device"
    a.st = blankState();
    a.io.save(track(a.io.load(), a.st, a.io.now()));
    await round(a.io);
    expect(server.rev).toBe(before);
    expect([...server.rows.values()].some((r) => r.deleted)).toBe(false);
  });
});

group("nothing gets stuck", () => {
  it("a row the server refuses is set aside: the rest syncs, and it is tried again once it changes", async () => {
    const server = new FakeServer();
    server.refuse = (c) => (c.id === "huge" ? "record_too_big" : undefined);
    const a = new Browser(server);
    a.attempt("huge"); a.attempt("ok1");
    expect((await turnOn(a.io, about)).ok).toBe(true);
    expect(server.rows.has("rc:ok1")).toBe(true);
    expect(dirty(a.L)).toEqual(["rc:huge"]); // only the refused row is still different from the server
    a.calls = [];
    a.attempt("ok2");
    expect((await round(a.io)).ok).toBe(true);
    const pushes = a.calls.filter((c) => c === "/sync/push").length;
    expect(server.rows.has("rc:ok2")).toBe(true);
    expect(pushes).toBe(1); // the refused row is not sent again and again
    expect(dirty(a.L)).toEqual(["rc:huge"]);
    server.refuse = () => undefined;
    a.edit((s) => { s.rcAttempts.find((x) => x.id === "huge")!.secs = 1; });
    await round(a.io);
    expect(server.rows.has("rc:huge")).toBe(true);
  });

  it("another device writing the same record during every push does not trap a round", async () => {
    const server = new FakeServer();
    const a = new Browser(server);
    a.edit((s) => { s.ticks["t"] = 1; });
    await turnOn(a.io, about);
    server.storm = "redo:x";
    a.edit((s) => { s.redo.push({ k: "x", added: "2026-10-01", due: "2026-10-02", box: 0, tries: 1 }); });
    await round(a.io);
    a.edit((s) => { s.redo[0].tries = 2; });
    a.calls = [];
    const out = await round(a.io);
    expect(out.ok).toBe(true);
    expect(a.calls.length).toBeLessThanOrEqual(8);
  });

  it("a malformed answer is an error, not a crash", async () => {
    const server = new FakeServer();
    const a = new Browser(server);
    await turnOn(a.io, about);
    for (const bad of [null, {}, { records: "x" }, { cursor: 1, records: [{ kind: "rc" }], more: false }]) {
      a.io.call = async <T,>() => ({ ok: true, status: 200, data: bad }) as ApiResult<T>;
      const out = await round(a.io);
      expect(out.ok, JSON.stringify(bad)).toBe(false);
    }
  });
});

group("describe", () => {
  it("names the browser and platform for the device list", () => {
    expect(describe("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36")).toEqual({ label: "Chrome on Android", platform: "android" });
    expect(describe("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", 5)).toEqual({ label: "Safari on iPhone or iPad", platform: "ios" });
    expect(describe("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0")).toEqual({ label: "Edge on Windows", platform: "windows" });
  });
});

group("canon", () => {
  it("ignores key order", () => {
    expect(canon({ b: 1, a: [{ y: 2, x: 1 }] })).toBe(canon({ a: [{ x: 1, y: 2 }], b: 1 }));
    expect(canon({ a: 1 })).not.toBe(canon({ a: 2 }));
  });
});
