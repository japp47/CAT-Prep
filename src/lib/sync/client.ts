import type { ApiResult, CallOptions } from "../api";
import { blankState, type AppState } from "../state";
import { dirty, hash, receive, records, track, type Ledger, type Row } from "./ledger";
import { KINDS, parseKey, recKey, toRecords, type Kind, type SyncRecord } from "./records";

/**
 * One sync round (docs/architecture.md §6.2): pull what the server has after the cursor and merge it in by kind,
 * then push what differs from the server's copy, merging stale answers and pushing again. Everything it needs comes
 * through `SyncIO`, so tests run it against a fake server.
 */

/** Kinds this build syncs: all of them (docs/architecture.md §6.1). The server's allow-list matches (a Go test checks). */
export const SYNC_KINDS: ReadonlySet<Kind> = new Set<Kind>(KINDS);

export interface SyncIO {
  call: <T>(path: string, body?: unknown, opts?: CallOptions) => Promise<ApiResult<T>>;
  /** The state as last committed, consistent with the ledger. */
  getState: () => AppState;
  /** Applies a change to the latest state; resolves once it is committed. */
  apply: (fn: (prev: AppState) => AppState) => Promise<void>;
  load: () => Ledger;
  save: (L: Ledger) => void;
  now: () => number;
  /** Told how far a long push has got, for "Copying your progress… 340 of 1,200". */
  progress?: (done: number, total: number) => void;
}

/** A record as the API sends it. */
export interface WireRecord { kind: Kind; id: string; data: unknown; deleted: boolean; stamp: number; rev: number }
interface PullAnswer { cursor: number; records: WireRecord[]; more: boolean }
interface PushAnswer { applied: { kind: Kind; id: string; rev: number }[]; stale: WireRecord[]; rejected?: { kind: Kind; id: string; code: string }[] }
export interface Who { identityId: string; deviceId: string; account?: { email: string; name: string } }

export type Outcome = { ok: true } | { ok: false; code: string; message: string; status: number };

const PUSH_ROWS = 200;
const BAD_ANSWER: Outcome = { ok: false, status: 200, code: "bad_answer", message: "The server sent something unexpected. Your progress is safe on this device." };

/** A row the server refused at this content is marked so (row[3] = "!" + hash) and skipped until it changes. */
const refused = (row: Row) => row[3] === "!" + row[0];

const isRecord = (r: unknown): r is WireRecord => {
  const x = r as WireRecord;
  return !!x && typeof x.kind === "string" && typeof x.id === "string" && typeof x.rev === "number" && typeof x.stamp === "number" && typeof x.deleted === "boolean";
};
const isList = <T,>(x: unknown, ok: (v: unknown) => v is T): x is T[] => Array.isArray(x) && x.every(ok);
const isApplied = (a: unknown): a is { kind: Kind; id: string; rev: number } => {
  const x = a as { kind: unknown; id: unknown; rev: unknown };
  return !!x && typeof x.kind === "string" && typeof x.id === "string" && typeof x.rev === "number";
};
const isRefusal = (a: unknown): a is { kind: Kind; id: string; code: string } => {
  const x = a as { kind: unknown; id: unknown; code: unknown };
  return !!x && typeof x.kind === "string" && typeof x.id === "string" && typeof x.code === "string";
};
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
    if (!res.data || typeof res.data.cursor !== "number" || !isList(res.data.records, isRecord)) return BAD_ANSWER;
    if (res.data.records.length) await take(io, res.data.records, res.data.cursor);
    if (!res.data.more) return { ok: true };
  }
  return { ok: true };
}

/** Picks the dirty rows of the synced kinds that fit in one push. */
function batch(L: Ledger, st: AppState) {
  const keys = dirty(L).filter((k) => SYNC_KINDS.has(parseKey(k).kind) && !refused(L.rows[k]));
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

/**
 * Pushes in batches of up to 200 until nothing is dirty. Stops early if the server takes nothing from a batch, so
 * a row it keeps refusing cannot loop.
 */
async function push(io: SyncIO, opts: CallOptions): Promise<Outcome> {
  // `onlyStale` counts pushes in a row where another device won every row: after three, the round ends and the
  // rows wait for the next round instead of racing a busy device.
  let total = 0, done = 0, onlyStale = 0;
  for (let round = 0; round < 1000; round++) {
    const st = io.getState();
    const L = track(io.load(), st, io.now());
    io.save(L);
    const { changes, sent } = batch(L, st);
    if (!changes.length) return { ok: true };
    total = Math.max(total, done + changes.length + dirty(L).filter((k) => SYNC_KINDS.has(parseKey(k).kind) && !refused(L.rows[k]) && !sent.has(k)).length);
    if (total > PUSH_ROWS) io.progress?.(done, total);
    const res = await io.call<PushAnswer>("/sync/push", { changes }, opts);
    if (!res.ok) return res;
    const ans = res.data;
    if (!ans || !isList(ans.applied, isApplied) || !isList(ans.stale, isRecord) || (ans.rejected !== undefined && !isList(ans.rejected, isRefusal))) return BAD_ANSWER;
    const after = io.load();
    ans.applied.forEach((a) => {
      const k = recKey(a), row = after.rows[k];
      if (row) after.rows[k] = [row[0], row[1], a.rev, sent.get(k) ?? row[3]];
    });
    (ans.rejected ?? []).forEach((x) => {
      const k = recKey(x), row = after.rows[k];
      if (row && row[0] === sent.get(k)) after.rows[k] = [row[0], row[1], row[2], "!" + row[0]];
    });
    io.save(after);
    done += ans.applied.length;
    if (!ans.applied.length && !ans.stale.length) return { ok: true };
    onlyStale = ans.applied.length ? 0 : onlyStale + 1;
    if (ans.stale.length) await take(io, ans.stale);
    if (onlyStale >= 3) return { ok: true };
  }
  return { ok: true };
}

/** One round: pull, merge, push. A 401 means this device was removed: sync turns off here, the data stays. */
export async function round(io: SyncIO, opts: CallOptions = {}): Promise<Outcome> {
  if (!io.load().on) return { ok: true };
  let out: Outcome;
  try {
    const pulled = await pull(io, opts);
    out = pulled.ok ? await push(io, opts) : pulled;
  } catch {
    out = { ok: false, status: 0, code: "client_error", message: "Sync stopped on an error. It will try again later; your progress is safe on this device." };
  }
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

/** Turns sync on: a new identity for this browser, then the first round. The recovery code comes back only now. */
export async function turnOn(io: SyncIO, about: { label: string; platform: string }, turnstileToken = ""): Promise<Outcome & { recoveryCode?: string }> {
  const res = await io.call<Who & { recoveryCode: string }>("/identity", { ...about, ...(turnstileToken ? { turnstileToken } : {}) });
  if (!res.ok) return res;
  begin(io, { identityId: res.data.identityId, deviceId: res.data.deviceId });
  const out = await round(io);
  return { ...out, recoveryCode: res.data.recoveryCode };
}

/**
 * Joins this browser to the progress of a link code (from another device's QR) or a recovery code. `keep` adds
 * this device's progress to it (the first round merges both, nothing is overwritten); otherwise this device starts
 * from what the server has. Local data is cleared only after the code has worked.
 */
export async function link(io: SyncIO, kind: "link" | "recover", code: string, about: { label: string; platform: string }, keep: boolean): Promise<Outcome> {
  const res = await io.call<Who>(kind === "link" ? "/identity/link" : "/identity/recover", { code, ...about });
  if (!res.ok) return res;
  if (!keep) {
    io.save({ ...io.load(), on: false, rows: {} }); // forget the old rows first, so clearing sends no deletions
    await io.apply(() => blankState());
  }
  begin(io, res.data);
  return round(io);
}

/** The account that owns this progress (B7), or null for sync without an account. */
export interface Account { email: string; name: string }
export const whoAmI = (io: SyncIO) => io.call<Who & { account: Account | null }>("/identity");

/** What the page must ask after Google sends the student back with a ticket (docs/architecture.md §5.2). */
export interface TicketInfo { email: string; name: string; account: "new" | "existing"; accountHasProgress: boolean; device: "guest" | "anonymous" | "other_account" }
export const ticketInfo = (io: SyncIO, ticket: string) => io.call<TicketInfo>("/auth/ticket", { ticket });

/**
 * Finishes signing in: the server points this browser at the account's progress, then the same steps as linking a
 * device run here. `keep` adds this device's progress (merged, nothing overwritten); otherwise this device starts
 * from the account's progress, cleared only after the server said yes.
 */
export async function completeSignIn(io: SyncIO, ticket: string, about: { label: string; platform: string }, keep: boolean): Promise<Outcome> {
  const res = await io.call<Who & { account: Account }>("/auth/complete", { ticket, keep, ...about });
  if (!res.ok) return res;
  if (!keep) {
    io.save({ ...io.load(), on: false, rows: {} });
    await io.apply(() => blankState());
  }
  begin(io, { identityId: res.data.identityId, deviceId: res.data.deviceId, account: { email: res.data.account.email, name: res.data.account.name } });
  return round(io);
}

export interface DeviceInfo { id: string; label: string; platform: string; createdAt: string; lastSyncedAt: string | null; current: boolean }

export const newLinkCode = (io: SyncIO) => io.call<{ code: string; expiresAt: string }>("/identity/link-codes", {});
export const newRecoveryCode = (io: SyncIO) => io.call<{ recoveryCode: string }>("/identity/recovery-code", {});
export const listDevices = (io: SyncIO) => io.call<{ devices: DeviceInfo[] }>("/devices");
export const removeDevice = (io: SyncIO, id: string) => io.call<null>("/devices/" + encodeURIComponent(id), undefined, { method: "DELETE" });

/**
 * Stops syncing on this device: tells the server (so this device leaves the list) and turns sync off here, even
 * offline. `clear` also empties this device; nothing is deleted anywhere else.
 */
export async function leave(io: SyncIO, clear: boolean): Promise<void> {
  await io.call<null>("/devices/me", undefined, { method: "DELETE" });
  io.save({ ...io.load(), on: false, who: undefined, last: undefined, ...(clear ? { rows: {} } : {}) });
  if (clear) await io.apply(() => blankState());
}

/** Everything the server holds for this progress (Settings, "Download what the server has"). */
export const serverExport = (io: SyncIO) => io.call<import("./exportFile").ServerExport>("/me/export");

/**
 * Deletes this progress from the server, everywhere, then clears this device. Other devices stop syncing on their
 * next try and keep what they have. Nothing here is cleared unless the server confirmed.
 */
export async function deleteEverywhere(io: SyncIO): Promise<Outcome> {
  const res = await io.call<null>("/me", undefined, { method: "DELETE" });
  if (!res.ok) return res;
  io.save({ ...io.load(), on: false, rows: {}, cursor: 0, who: undefined, last: undefined });
  await io.apply(() => blankState());
  return { ok: true };
}

/** Stops syncing on this device without telling the server (used when it already said this device is gone). */
export function turnOff(io: SyncIO) {
  io.save({ ...io.load(), on: false });
}
