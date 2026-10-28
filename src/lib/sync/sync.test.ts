import { describe, expect, it } from "vitest";
import { uid } from "../date";
import { blankState, normalize, type AppState } from "../state";
import { blankLedger, dirty, receive, records, track, type Ledger } from "./ledger";
import { fromRecords, mergeBackup, mergeRecord, recKey, toRecords, type SyncRecord } from "./records";

/** A small fixed RNG, so a failing seed can be replayed. */
function rng(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function base(): AppState {
  const s = blankState();
  s.since = "2026-09-01";
  s.errors.push(
    { id: "e1", d: "2026-10-01", sec: "VARC", t: "Inference", trap: "Extreme", src: "", why: "", fix: "" },
    { id: "e2", d: "2026-10-02", sec: "VARC", t: "Main idea", trap: "Too narrow", src: "", why: "", fix: "" },
    { id: "e3", d: "2026-10-03", sec: "VARC", t: "Tone", trap: "", src: "", why: "", fix: "" },
  );
  s.days["2026-10-10"] = { done: { "varc:rc": 20 } };
  s.redo.push({ k: "rc:set-a:0", added: "2026-10-01", due: "2026-10-04", box: 1, tries: 1 }, { k: "va:p1", added: "2026-10-02", due: "2026-10-05", box: 0, tries: 0 });
  s.ticks["guide-1"] = 1;
  s.rcAttempts.push({ id: "a0", d: "2026-10-01", set: "set-a", mode: "library", ans: [0, 1], c: 1, w: 1, secs: 300, first: 0 });
  return normalize(JSON.parse(JSON.stringify(s)));
}

/** The shared starting point, as if both devices had already synced it. */
function synced(st: AppState, t: number): Ledger {
  const L = track({ ...blankLedger(), on: true }, st, t);
  Object.values(L.rows).forEach((r) => { r[2] = 1; r[3] = r[0]; });
  return L;
}

const DAYS = ["2026-10-10", "2026-10-11", "2026-10-12"];
const BLOCKS = ["varc:rc", "varc:va", "varc:read"];
const TRAPS = ["Extreme", "Too narrow", "Out of scope", ""];

function edit(st: AppState, r: () => number, dev: string, n: number) {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  switch (Math.floor(r() * 9)) {
    case 0: st.rcAttempts.push({ id: `${dev}-rc-${n}`, d: pick(DAYS), set: "set-b", mode: "library", ans: [1], c: 1, w: 0, secs: 100, first: 0 }); break;
    case 1: { const e = st.errors.length ? pick(st.errors) : null; if (e) e.trap = pick(TRAPS); break; }
    case 2: if (st.errors.length) st.errors.splice(Math.floor(r() * st.errors.length), 1); break;
    case 3: { const d = pick(DAYS); st.days[d] ??= {}; st.days[d].done = { ...st.days[d].done, [pick(BLOCKS)]: 5 + Math.floor(r() * 40) }; break; }
    case 4: { const d = pick(DAYS); if (st.days[d]?.done) delete st.days[d].done![pick(BLOCKS)]; break; }
    case 5: { const it = pick(st.redo); it.tries++; it.box = Math.min(it.box + 1, 3); break; }
    case 6: st.settings.varc.wd = 30 + Math.floor(r() * 90); break;
    case 7: { const k = pick(["guide-1", "guide-2", "guide-3"]); if (st.ticks[k]) delete st.ticks[k]; else st.ticks[k] = 1; break; }
    default: st.vocab.push({ id: `${dev}-w-${n}`, w: "laconic", m: "brief", s: "", b: 0, due: "2026-10-12" });
  }
}

const doneBlocks = (s: AppState) => Object.entries(s.days).flatMap(([d, x]) => Object.keys(x.done ?? {}).map((b) => d + "/" + b));

describe("two devices that edit offline and then exchange records", () => {
  for (let seed = 1; seed <= 40; seed++) {
    it(`end up the same and lose no attempt or ticked block (seed ${seed})`, () => {
      const r = rng(seed);
      let a = base(), b = base();
      let La = synced(a, 1000), Lb = synced(b, 1000);
      // B's clock runs up to a day ahead or behind.
      const skew = Math.floor((r() - 0.5) * 2 * 864e5);
      let clock = 2000;
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < 12; i++) {
          clock += 1000;
          if (r() < 0.5) { a = structuredClone(a); edit(a, r, "A", clock); La = track(La, a, clock); }
          else { b = structuredClone(b); edit(b, r, "B", clock); Lb = track(Lb, b, clock + skew); }
        }
        const fromA = records(La, a), fromB = records(Lb, b);
        const ids = new Set([...a.rcAttempts, ...b.rcAttempts].map((x) => x.id));
        const blocks = new Set([...doneBlocks(a), ...doneBlocks(b)]);
        const na = receive(La, a, fromB, clock), nb = receive(Lb, b, fromA, clock + skew);
        a = na.st; La = na.L; b = nb.st; Lb = nb.L;
        expect(a).toEqual(b);
        expect(new Set(a.rcAttempts.map((x) => x.id))).toEqual(ids);
        blocks.forEach((k) => expect(doneBlocks(a)).toContain(k));
      }
    });
  }

  it("receiving the same records twice changes nothing", () => {
    let a = base(); let La = synced(a, 1000);
    const b = structuredClone(a); b.errors[0].trap = "Out of scope"; b.rcAttempts.push({ id: "x", d: "2026-10-11", set: "s", mode: "daily", ans: [], c: 0, w: 0, secs: 1, first: 0 });
    const Lb = track(synced(base(), 1000), b, 5000);
    const once = receive(La, a, records(Lb, b), 6000);
    const twice = receive(once.L, once.st, records(Lb, b), 7000);
    expect(twice.st).toEqual(once.st);
    a = once.st; La = once.L;
    expect(a.errors[0].trap).toBe("Out of scope");
  });
});

describe("clock skew", () => {
  it("an edit made after seeing a copy from a phone whose clock is a day ahead still wins", () => {
    const day = 864e5;
    const a0 = base(), b0 = base();
    let La = synced(a0, 1000), Lb = synced(b0, 1000);
    // B, a day ahead, edits e1.
    const b = structuredClone(b0); b.errors[0].trap = "Too narrow"; Lb = track(Lb, b, 2000 + day);
    // A pulls it, then edits e1 a minute later by its own (right) clock.
    let { L, st } = receive(La, a0, records(Lb, b), 3000);
    La = L;
    const a = structuredClone(st); a.errors[0].trap = "Out of scope"; La = track(La, a, 63000);
    // B pulls A's edit: A's edit wins on both.
    const nb = receive(Lb, b, records(La, a), 4000 + day);
    expect(nb.st.errors[0].trap).toBe("Out of scope");
  });
});

describe("records", () => {
  it("a state becomes records and back unchanged", () => {
    const s = base();
    expect(fromRecords(toRecords(s))).toEqual(s);
  });
  it("every kind of row has a record", () => {
    const kinds = new Set(toRecords(base()).map((r) => r.kind));
    ["rc", "error", "day", "redo", "tick", "setting", "profile"].forEach((k) => expect(kinds).toContain(k));
  });
  it("merging gives the same answer in either order", () => {
    const x: SyncRecord = { kind: "day", id: "d", data: { done: { a: 10 }, min: { varc: 30 } }, updatedAt: 5, deleted: false };
    const y: SyncRecord = { kind: "day", id: "d", data: { done: { a: 20, b: 5 }, carried: { varc: 1 } }, updatedAt: 9, deleted: false };
    expect(mergeRecord(x, y)).toEqual(mergeRecord(y, x));
    expect(mergeRecord(x, y).data).toEqual({ done: { a: 20, b: 5 }, carried: { varc: 1 } });
  });
  it("a redo item keeps the copy with more tries", () => {
    const x: SyncRecord = { kind: "redo", id: "k", data: { k: "k", tries: 3 }, updatedAt: 1, deleted: false };
    const y: SyncRecord = { kind: "redo", id: "k", data: { k: "k", tries: 1 }, updatedAt: 9, deleted: false };
    expect(mergeRecord(x, y)).toBe(x);
  });
  it("the profile keeps the earliest start date", () => {
    const x: SyncRecord = { kind: "profile", id: "me", data: { since: "2026-09-01", targets: { varc: 95 } }, updatedAt: 1, deleted: false };
    const y: SyncRecord = { kind: "profile", id: "me", data: { since: "2026-10-01", targets: { varc: 99 } }, updatedAt: 2, deleted: false };
    expect(mergeRecord(x, y).data).toEqual({ since: "2026-09-01", targets: { varc: 99 } });
  });
  it("the profile's about comes from the newer copy, whichever side merges", () => {
    const x: SyncRecord = { kind: "profile", id: "me", data: { since: "2026-09-01", targets: { varc: 95 }, about: { attempt: "repeat" } }, updatedAt: 3, deleted: false };
    const y: SyncRecord = { kind: "profile", id: "me", data: { since: "2026-08-01", targets: { varc: 99 }, about: { work: "working" } }, updatedAt: 2, deleted: false };
    const want = { since: "2026-08-01", targets: { varc: 95 }, about: { attempt: "repeat" } };
    expect(mergeRecord(x, y).data).toEqual(want);
    expect(mergeRecord(y, x).data).toEqual(want);
  });
  it("about survives records and a save, and bad values are dropped", () => {
    const s = blankState();
    s.about = { attempt: "first", work: "studying" };
    expect(fromRecords(toRecords(s)).about).toEqual({ attempt: "first", work: "studying" });
    expect(normalize({ ...s, about: { attempt: "third", work: 1 } }).about).toEqual({});
  });
});

describe("the ledger", () => {
  it("marks new and changed rows as dirty and leaves the rest", () => {
    const s = base();
    let L = synced(s, 1000);
    expect(dirty(L)).toEqual([]);
    const t = structuredClone(s); t.errors[1].why = "rushed"; t.vocab.push({ id: "w", w: "x", m: "y", s: "", b: 0, due: "2026-10-12" });
    L = track(L, t, 2000);
    expect(dirty(L).sort()).toEqual(["error:e2", "word:w"]);
  });
  it("turns a deleted row the server has into one deletion, and forgets rows the server never had", () => {
    const s = base();
    let L = synced(s, 1000);
    const t = structuredClone(s); t.errors.splice(0, 1); t.vocab.push({ id: "w", w: "x", m: "y", s: "", b: 0, due: "2026-10-12" });
    L = track(L, t, 2000);
    const u = structuredClone(t); u.vocab = [];
    L = track(L, u, 3000);
    L = track(L, u, 4000);
    expect(L.rows["error:e1"][0]).toBe("");
    expect(L.rows["word:w"]).toBeUndefined();
    expect(records(L, u).filter((r) => r.deleted).map(recKey)).toEqual(["error:e1"]);
  });
  it("keeps no deletions while sync is off", () => {
    const s = base();
    let L = track(blankLedger(), s, 1000);
    const t = structuredClone(s); t.errors.splice(0, 1);
    L = track(L, t, 2000);
    expect(L.rows["error:e1"]).toBeUndefined();
  });
  it("stamps never go back, even when the clock does", () => {
    const s = base();
    let L = track(blankLedger(), s, 10_000);
    const t = structuredClone(s); t.errors[0].why = "x";
    L = track(L, t, 5_000);
    expect(L.rows["error:e1"][1]).toBeGreaterThan(10_000);
  });
});

describe("restoring a backup while synced", () => {
  it("adds what the backup has and deletes nothing", () => {
    const now = base();
    now.errors[0].trap = "Out of scope";
    now.vocab.push({ id: "new", w: "a", m: "b", s: "", b: 0, due: "2026-10-12" });
    const old = base();
    old.errors = old.errors.slice(0, 1);
    old.mocks.push({ id: "m1", d: "2026-09-20", sec: "VARC", n: "Mock 1", k: "", c: 10, w: 4 });
    const L = track(blankLedger(), now, 5000);
    const out = mergeBackup(now, JSON.parse(JSON.stringify(old)), (k) => L.rows[k]?.[1] ?? 0);
    expect(out.errors.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
    expect(out.errors[0].trap).toBe("Out of scope");
    expect(out.vocab.map((w) => w.id)).toEqual(["new"]);
    expect(out.mocks.map((m) => m.id)).toEqual(["m1"]);
  });
});

describe("uid", () => {
  it("does not repeat in 100,000 ids and starts with the time", () => {
    const ids = new Set(Array.from({ length: 100_000 }, uid));
    expect(ids.size).toBe(100_000);
    // The clock can tick between reading it and making the id, so either side of the call is fine.
    const before = Date.now().toString(36).slice(0, 8), id = uid(), after = Date.now().toString(36).slice(0, 8);
    expect([before, after]).toContain(id.slice(0, 8));
  });
});
