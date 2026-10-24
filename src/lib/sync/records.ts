import { normalize, type AppState, type DayRec } from "../state";

/**
 * Sync records (docs/architecture.md §6.1). AppState keeps its shape; for sync it is seen as a set of records,
 * one per row, each with a kind and an id. Merging two copies of a record follows the kind's rule, and every rule
 * gives the same answer whichever copy is "ours", so two devices that exchange records end up equal.
 */
export const KINDS = ["rc", "va", "cr", "speed", "sectional", "mockReview", "summary", "error", "word", "mock", "practice", "recommendation", "weekReview", "redo", "day", "tick", "setting", "profile"] as const;
export type Kind = (typeof KINDS)[number];

export interface Rec { kind: Kind; id: string; data: unknown }
/** A record with what sync needs: when it last changed on a device (ms) and whether it was deleted. */
export interface SyncRecord extends Rec { updatedAt: number; deleted: boolean }

export const recKey = (r: { kind: Kind; id: string }) => r.kind + ":" + r.id;
/** The kind and id of a ledger key. Ids may contain ":" (redo keys such as "rc:set:2"); kinds never do. */
export const parseKey = (key: string) => { const i = key.indexOf(":"); return { kind: key.slice(0, i) as Kind, id: key.slice(i + 1) }; };

/** List fields of AppState and the kind each becomes. All rows have an `id`. */
const LISTS = {
  rcAttempts: "rc", vaAttempts: "va", crAttempts: "cr", speedRuns: "speed", sectionals: "sectional", mockReviews: "mockReview",
  summaries: "summary", errors: "error", vocab: "word", mocks: "mock", practice: "practice", recs: "recommendation", weekReviews: "weekReview",
} as const satisfies Partial<Record<keyof AppState, Kind>>;
type ListField = keyof typeof LISTS;
const FIELD = Object.fromEntries(Object.entries(LISTS).map(([f, k]) => [k, f])) as Record<string, ListField>;

/** Kinds written once and never changed: any two copies are the same attempt. */
const WRITE_ONCE = new Set<Kind>(["rc", "va", "cr", "speed", "sectional", "mockReview"]);

export function toRecords(st: AppState): Rec[] {
  const out: Rec[] = [];
  (Object.keys(LISTS) as ListField[]).forEach((f) => (st[f] as { id: string }[]).forEach((row) => out.push({ kind: LISTS[f], id: row.id, data: row })));
  st.redo.forEach((r) => out.push({ kind: "redo", id: r.k, data: r }));
  Object.entries(st.days).forEach(([d, rec]) => out.push({ kind: "day", id: d, data: rec }));
  Object.keys(st.ticks).forEach((k) => out.push({ kind: "tick", id: k, data: 1 }));
  Object.entries(st.settings).forEach(([sec, s]) => out.push({ kind: "setting", id: sec, data: s }));
  out.push({ kind: "profile", id: "me", data: { since: st.since, targets: st.targets, about: st.about } });
  return out;
}

/** The time a row carries itself, when it has one (sectionals, summaries, reviews, recommendations). */
export const ownTime = (data: unknown) => {
  const t = (data as { updatedAt?: unknown } | null)?.updatedAt;
  return typeof t === "number" && t > 0 ? t : 0;
};

const json = (x: unknown) => JSON.stringify(x) ?? "";
/**
 * Deterministic pick between two copies: the later stamp, then a deletion, then the larger JSON. Stamps come from the
 * ledger's hybrid clock, so an edit made after seeing the other copy always has the later stamp (§6.2).
 */
function newer(a: SyncRecord, b: SyncRecord): SyncRecord {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  if (a.deleted !== b.deleted) return a.deleted ? a : b;
  return json(a.data) >= json(b.data) ? a : b;
}

const maxMap = (x: Record<string, number> = {}, y: Record<string, number> = {}) => {
  const o: Record<string, number> = { ...x };
  Object.entries(y).forEach(([k, v]) => { o[k] = Math.max(o[k] ?? 0, v); });
  return o;
};
const union = <T extends object>(x?: T, y?: T): T | undefined => (x || y ? ({ ...x, ...y } as T) : undefined);

/** Two days merged field by field: ticked blocks and timer minutes keep the larger value, flags are kept from both, minutes set for the day come from the newer copy. */
function mergeDay(a: SyncRecord, b: SyncRecord): DayRec {
  const x = a.data as DayRec, y = b.data as DayRec;
  const n = newer(a, b).data as DayRec;
  const out: DayRec = {};
  if (n.min) out.min = n.min;
  if (x.done || y.done) out.done = maxMap(x.done, y.done);
  if (x.spent || y.spent) out.spent = maxMap(x.spent, y.spent);
  const carried = union(x.carried, y.carried), dismiss = union(x.dismiss, y.dismiss);
  if (carried) out.carried = carried;
  if (dismiss) out.dismiss = dismiss;
  return out;
}

/** Merges two copies of the same record. The result does not depend on which copy is passed first. */
export function mergeRecord(a: SyncRecord, b: SyncRecord): SyncRecord {
  const updatedAt = Math.max(a.updatedAt, b.updatedAt);
  if (a.deleted || b.deleted) return newer(a, b);
  if (WRITE_ONCE.has(a.kind)) return newer(a, b);
  if (a.kind === "redo") {
    const ta = (a.data as { tries: number }).tries, tb = (b.data as { tries: number }).tries;
    return ta === tb ? newer(a, b) : ta > tb ? a : b;
  }
  if (a.kind === "day") return { ...a, data: mergeDay(a, b), updatedAt };
  if (a.kind === "profile") {
    type P = Pick<AppState, "since" | "targets" | "about">;
    const x = a.data as P, y = b.data as P;
    const since = x.since && y.since ? (x.since < y.since ? x.since : y.since) : x.since || y.since;
    // Everything but since comes from the newer copy, whole: fields added later (about) are kept, never dropped.
    return { ...a, data: { ...(newer(a, b).data as P), since }, updatedAt };
  }
  return newer(a, b);
}

/** Sort key that keeps lists in the order they were made, the same on every device. Ids start with the time (`uid()`). */
const order = (row: Record<string, unknown>) => String(row.d ?? row.added ?? "") + "|" + String(row.id ?? row.k ?? "");

/** Builds a state from live records. Lists come out in a fixed order; everything goes through normalize(). */
export function fromRecords(recs: Rec[]): AppState {
  const raw: Record<string, unknown> = { ticks: {}, days: {}, settings: {}, redo: [], redoSeeded: true };
  (Object.keys(LISTS) as ListField[]).forEach((f) => (raw[f] = []));
  recs.forEach((r) => {
    if (r.kind in FIELD) (raw[FIELD[r.kind]] as unknown[]).push(r.data);
    else if (r.kind === "redo") (raw.redo as unknown[]).push(r.data);
    else if (r.kind === "day") (raw.days as Record<string, unknown>)[r.id] = r.data;
    else if (r.kind === "tick") (raw.ticks as Record<string, unknown>)[r.id] = 1;
    else if (r.kind === "setting") (raw.settings as Record<string, unknown>)[r.id] = r.data;
    else if (r.kind === "profile") Object.assign(raw, r.data);
  });
  [...Object.keys(LISTS), "redo"].forEach((f) => (raw[f] as Record<string, unknown>[]).sort((x, y) => (order(x) < order(y) ? -1 : order(x) > order(y) ? 1 : 0)));
  return normalize(raw);
}

/**
 * Merges incoming records into a state. `timeOf` gives the stamp of each local row (from the sync ledger); rows it
 * does not know count as old (0). `gone` are this device's deletions, so an older copy from elsewhere does not bring
 * a deleted row back. Records that are not kinds we know are ignored.
 */
export function applyRecords(st: AppState, incoming: SyncRecord[], timeOf: (key: string) => number = () => 0, gone: SyncRecord[] = []): AppState {
  const live = new Map<string, SyncRecord>();
  toRecords(st).forEach((r) => { const k = recKey(r); live.set(k, { ...r, updatedAt: timeOf(k) || ownTime(r.data), deleted: false }); });
  gone.forEach((r) => { if (!live.has(recKey(r))) live.set(recKey(r), r); });
  incoming.forEach((r) => {
    if (!(KINDS as readonly string[]).includes(r.kind)) return;
    const k = recKey(r), mine = live.get(k);
    live.set(k, mine ? mergeRecord(mine, r) : r);
  });
  const out = fromRecords([...live.values()].filter((r) => !r.deleted));
  out.redoSeeded = st.redoSeeded;
  return out;
}

/**
 * Restoring a backup while sync is on adds its progress instead of replacing (docs/architecture.md §6.3a):
 * replacing would delete, on every device, whatever the backup is missing. Backup rows count as old, so a row
 * changed on this device keeps this device's copy; nothing is deleted.
 */
export function mergeBackup(st: AppState, backup: unknown, timeOf?: (key: string) => number): AppState {
  // -1 for rows without a time of their own: on a tie this device's copy wins.
  const rows = toRecords(normalize(backup)).map((r) => ({ ...r, updatedAt: ownTime(r.data) || -1, deleted: false }));
  return applyRecords(st, rows, timeOf);
}
