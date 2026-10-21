import type { AppState } from "../state";
import { applyRecords, ownTime, parseKey, recKey, toRecords, type SyncRecord } from "./records";

/**
 * The sync ledger (docs/architecture.md §2.3 and §6.2): for every record, a hash of its data, when it last changed
 * on this device, the server revision this device last saw and the hash the server holds. It lives in its own key,
 * outside AppState and outside backups, so the state keeps its shape.
 */
export const LEDGER_KEY = "cat-prep-sync";

/** [hash of the data ("" = deleted), changed at (ms), server rev last seen (0 = never), hash the server holds ("" = none)] */
export type Row = [string, number, number, string];
/** `hi` is the highest stamp this device has made or seen: the hybrid clock below never goes behind it. */
export interface Ledger { v: 1; on: boolean; cursor: number; hi: number; rows: Record<string, Row> }

export const blankLedger = (): Ledger => ({ v: 1, on: false, cursor: 0, hi: 0, rows: {} });

/**
 * Hybrid clock (docs/architecture.md §6.2): a change is stamped with the later of this device's clock and one more
 * than any stamp it has seen. A phone whose clock runs a day ahead cannot beat an edit made after seeing its copy.
 */
export const stamp = (L: Ledger, now: number) => Math.max(now, L.hi + 1);
/** Records a stamp seen in pulled records, so later edits here come after it. */
export const saw = (L: Ledger, t: number): Ledger => (t > L.hi ? { ...L, hi: t } : L);

/** FNV-1a, 8 hex digits: enough to notice that a row changed. */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Compares the state with the ledger. A new or changed row gets a stamp from the hybrid clock (never earlier than
 * its own `updatedAt`).
 * A missing row becomes a deletion to send, but only while sync is on and the server has a copy; otherwise it is dropped.
 */
export function track(prev: Ledger, st: AppState, now = Date.now()): Ledger {
  const t = stamp(prev, now);
  let hi = prev.hi;
  const rows: Record<string, Row> = {};
  toRecords(st).forEach((r) => {
    const k = recKey(r), h = hash(JSON.stringify(r.data)), old = prev.rows[k];
    if (old && old[0] === h) { rows[k] = old; return; }
    const at = Math.max(ownTime(r.data), t);
    rows[k] = [h, at, old?.[2] ?? 0, old?.[3] ?? ""];
    hi = Math.max(hi, at);
  });
  Object.entries(prev.rows).forEach(([k, old]) => {
    if (rows[k] || !prev.on) return;
    if (old[0] === "") rows[k] = old;
    else if (old[2] || old[3]) { rows[k] = ["", t, old[2], old[3]]; hi = Math.max(hi, t); }
  });
  return { ...prev, hi, rows };
}

/** Keys whose data differs from the server's copy: what the next push sends. Deletions are included. */
export const dirty = (L: Ledger) => Object.keys(L.rows).filter((k) => L.rows[k][0] !== L.rows[k][3]);

/** When each row last changed on this device, for the merge rules. */
export const timeOf = (L: Ledger) => (key: string) => L.rows[key]?.[1] ?? 0;

/** This device's records as sync sends them: live rows with their stamps, and deletions. `keys` limits it (a push). */
export function records(L: Ledger, st: AppState, keys = Object.keys(L.rows)): SyncRecord[] {
  const live = new Map(toRecords(st).map((r) => [recKey(r), r]));
  return keys.filter((k) => L.rows[k]).map((k) => {
    const row = L.rows[k], r = live.get(k);
    return { ...parseKey(k), data: row[0] && r ? r.data : null, updatedAt: row[1], deleted: !(row[0] && r) };
  });
}

/**
 * Takes records from elsewhere (a pull, or another device in tests): merges them in by kind and notes their stamps,
 * so a merged row keeps the merged stamp instead of looking like a new edit made here.
 */
export function receive(L: Ledger, st: AppState, incoming: SyncRecord[], now = Date.now()): { L: Ledger; st: AppState } {
  const gone = records(L, st).filter((r) => r.deleted);
  const next = applyRecords(st, incoming, timeOf(L), gone);
  const after = new Map(toRecords(next).map((r) => [recKey(r), r]));
  const rows = { ...L.rows };
  let hi = L.hi;
  incoming.forEach((r) => {
    const k = recKey(r), mine = L.rows[k], a = after.get(k);
    hi = Math.max(hi, r.updatedAt);
    rows[k] = [a ? hash(JSON.stringify(a.data)) : "", Math.max(r.updatedAt, mine?.[1] ?? 0), mine?.[2] ?? 0, mine?.[3] ?? ""];
  });
  return { L: track({ ...L, hi, rows }, next, now), st: next };
}

export function loadLedger(): Ledger {
  try {
    const raw = JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "null");
    if (raw && raw.v === 1 && raw.rows && typeof raw.rows === "object") return { v: 1, on: raw.on === true, cursor: Number(raw.cursor) || 0, hi: Number(raw.hi) || 0, rows: raw.rows };
  } catch { /* corrupt or blocked: start again; the next sync pulls and pushes everything */ }
  return blankLedger();
}

export function saveLedger(L: Ledger) {
  try { localStorage.setItem(LEDGER_KEY, JSON.stringify(L)); } catch { /* storage full: tracking waits for the next save */ }
}
