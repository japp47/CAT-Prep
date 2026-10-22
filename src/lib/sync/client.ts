import type { ApiResult, CallOptions } from "../api";
import type { AppState } from "../state";
import { dirty, hash, receive, records, track, type Ledger, type Row } from "./ledger";
import { parseKey, recKey, toRecords, type Kind, type SyncRecord } from "./records";

/**
 * One sync round (docs/architecture.md §6.2): pull what the server has after the cursor and merge it in by kind,
 * then push what differs from the server's copy, merging stale answers and pushing again. Everything it needs comes
 * through `SyncIO`, so tests run it against a fake server.
 */

/** Kinds this build syncs. B2 proves the path with RC attempts; B3 adds the rest. */
export const SYNC_KINDS: ReadonlySet<Kind> = new Set<Kind>(["rc"]);

export interface SyncIO {
  call: <T>(path: string, body?: unknown, opts?: CallOptions) => Promise<ApiResult<T>>;
  /** The state as last committed, consistent with the ledger. */
  getState: () => AppState;
  /** Applies a change to the latest state; resolves once it is committed. */
  apply: (fn: (prev: AppState) => AppState) => Promise<void>;
  load: () => Ledger;
  save: (L: Ledger) => void;
  now: () => number;
}

/** A record as the API sends it. */
export interface WireRecord { kind: Kind; id: string; data: unknown; deleted: boolean; stamp: number; rev: number }
interface PullAnswer { cursor: number; records: WireRecord[]; more: boolean }
interface PushAnswer { applied: { kind: Kind; id: string; rev: number }[]; stale: WireRecord[] }
export interface Who { identityId: string; deviceId: string }

export type Outcome = { ok: true } | { ok: false; code: string; message: string; status: number };

const PUSH_ROWS = 200;
const PUSH_BYTES = 48_000; // under the server's 64 KB body cap, and under fetch keepalive's limit

/** JSON with sorted keys: Postgres stores JSON with its own key order, so equal records must compare equal. */
export function canon(x: unknown): string {
  if (Array.isArray(x)) return "[" + x.map(canon).join(",") + "]";
  if (x && typeof x === "object") return "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + canon((x as Record<string, unknown>)[k])).join(",") + "}";
  return JSON.stringify(x) ?? "null";
}

/**
 * Merges records from the server into the state and notes, for each, the rev and what the server holds. A merged
 * row that differs from the server's copy stays dirty and is pushed next.
 */
async function take(io: SyncIO, recs: WireRecord[], cursor?: number) {
  const mine = recs.filter((r) => SYNC_KINDS.has(r.kind));
  await io.apply((prev) => {
    const incoming: SyncRecord[] = mine.map((r) => ({ kind: r.kind, id: r.id, data: r.deleted ? null : r.data, updatedAt: r.stamp, deleted: r.deleted }));
    const { L, st } = receive(io.load(), prev, incoming, io.now());
    const live = new Map(toRecords(st).map((r) => [recKey(r), r.data]));
    mine.forEach((r) => {
      const k = recKey(r), row: Row = L.rows[k] ?? ["", r.stamp, 0, ""], here = live.get(k);
      const server = r.deleted ? "" : here !== undefined && canon(here) === canon(r.data) ? row[0] : hash(JSON.stringify(r.data));
      L.rows[k] = [row[0], row[1], r.rev, server];
    });
    if (cursor !== undefined) L.cursor = Math.max(L.cursor, cursor);
    io.save(L);
    return st;
  });
}

async function pull(io: SyncIO, opts: CallOptions): Promise<Outcome> {
  for (let page = 0; page < 200; page++) {
    const res = await io.call<PullAnswer>("/sync/pull", { cursor: io.load().cursor }, opts);
    if (!res.ok) return res;
    if (res.data.records.length) await take(io, res.data.records, res.data.cursor);
    if (!res.data.more) return { ok: true };
  }
  return { ok: true };
}

/** Picks the dirty rows of the synced kinds that fit in one push. */
function batch(L: Ledger, st: AppState) {
  const keys = dirty(L).filter((k) => SYNC_KINDS.has(parseKey(k).kind));
  const changes: { kind: Kind; id: string; data: unknown; deleted: boolean; stamp: number; baseRev: number }[] = [];
  const sent = new Map<string, string>();
  let bytes = 0;
  for (const r of records(L, st, keys)) {
    const c = { kind: r.kind, id: r.id, data: r.deleted ? null : r.data, deleted: r.deleted, stamp: Math.max(1, r.updatedAt), baseRev: L.rows[recKey(r)][2] };
    const size = JSON.stringify(c).length;
    if (changes.length && (changes.length >= PUSH_ROWS || bytes + size > PUSH_BYTES)) break;
    changes.push(c);
    sent.set(recKey(r), L.rows[recKey(r)][0]);
    bytes += size;
  }
  return { changes, sent };
}

async function push(io: SyncIO, opts: CallOptions): Promise<Outcome> {
  for (let round = 0; round < 10; round++) {
    const st = io.getState();
    const L = track(io.load(), st, io.now());
    io.save(L);
    const { changes, sent } = batch(L, st);
    if (!changes.length) return { ok: true };
    const res = await io.call<PushAnswer>("/sync/push", { changes }, opts);
    if (!res.ok) return res;
    const after = io.load();
    res.data.applied.forEach((a) => {
      const k = recKey(a), row = after.rows[k];
      if (row) after.rows[k] = [row[0], row[1], a.rev, sent.get(k) ?? row[3]];
    });
    io.save(after);
    if (res.data.stale.length) await take(io, res.data.stale);
  }
  return { ok: true };
}

/** One round: pull, merge, push. A 401 means this device was removed: sync turns off here, the data stays. */
export async function round(io: SyncIO, opts: CallOptions = {}): Promise<Outcome> {
  if (!io.load().on) return { ok: true };
  const pulled = await pull(io, opts);
  const out = pulled.ok ? await push(io, opts) : pulled;
  const L = io.load();
  if (!out.ok && out.status === 401) L.on = false;
  if (out.ok) L.last = io.now();
  io.save(L);
  return out;
}

/** Starts syncing as `who`: the server has nothing this device has seen yet, so every row is sent (first sync, §6.3). */
function begin(io: SyncIO, who: Who) {
  const L = track(io.load(), io.getState(), io.now());
  Object.keys(L.rows).forEach((k) => { const r = L.rows[k]; L.rows[k] = [r[0], r[1], 0, ""]; });
  io.save({ ...L, on: true, cursor: 0, who, last: undefined });
}

/** Describes this browser for the device list: "Chrome on Android" and an icon. */
export function describe(ua: string, touch = 0): { label: string; platform: string } {
  const platform = /Android/.test(ua) ? "android" : /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1) ? "ios"
    : /Mac OS X|Macintosh/.test(ua) ? "mac" : /Windows/.test(ua) ? "windows" : /Linux|CrOS/.test(ua) ? "linux" : "other";
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = { android: "Android", ios: "iPhone or iPad", mac: "Mac", windows: "Windows", linux: "Linux", other: "this device" }[platform];
  return { label: browser + " on " + os, platform };
}

/** Turns sync on: a new identity for this browser, then the first round. */
export async function turnOn(io: SyncIO, about: { label: string; platform: string }): Promise<Outcome> {
  const res = await io.call<Who>("/identity", about);
  if (!res.ok) return res;
  begin(io, res.data);
  return round(io);
}

/** Development only: adds this browser to an identity by its id, then merges both sides in the first round. */
export async function join(io: SyncIO, identityId: string, about: { label: string; platform: string }): Promise<Outcome> {
  const res = await io.call<Who>("/dev/join", { identityId: identityId.trim(), ...about });
  if (!res.ok) return res;
  begin(io, res.data);
  return round(io);
}

/** Stops syncing on this device. The progress stays here; nothing is deleted anywhere. */
export function turnOff(io: SyncIO) {
  io.save({ ...io.load(), on: false });
}
