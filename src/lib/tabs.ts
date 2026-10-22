import { loadState, normalize, STORAGE_KEY, type AppState } from "./state";
import { fromRecords, mergeRecord, recKey, toRecords, type Rec, type SyncRecord } from "./sync/records";

/**
 * Saving safely when the site is open in two tabs. Each tab saves the whole state, so without care the last tab to
 * save wins and the other tab's edits are lost. This works like booking a seat:
 *
 * - Every save writes a version next to the state, and each tab remembers the version it last read or wrote (its
 *   base). A save checks that the stored version is still its base and writes in the same synchronous step
 *   (compare-and-set): localStorage calls are synchronous, so nothing in this tab runs in between.
 * - If another tab saved in between, nothing is overwritten: the two copies are merged record by record against
 *   the base (a three-way merge), so each tab's edits are kept, then the result is written and shown in this tab.
 * - When the other tab's save arrives (a storage event) while this tab has an unsaved edit, the same merge runs.
 *
 * Web Locks were considered and left out: a browser may cache localStorage per process and copy writes across
 * later, so a lock would not make the check stronger, only slower. Merging whenever a difference shows up is what
 * keeps both tabs' edits.
 */

export const VERSION_KEY = "cat-prep-hub-ver";

type Recs = Map<string, Rec>;
const byKey = (st: AppState): Recs => new Map(toRecords(st).map((r) => [recKey(r), r]));
const same = (a?: Rec, b?: Rec) => (a === undefined) === (b === undefined) && (a === undefined || JSON.stringify(a.data) === JSON.stringify(b!.data));

/**
 * Three-way merge of two copies that both started from `base`. A record only one side changed takes that side's
 * version (including a deletion). A record both sides changed is merged by its kind's rule (more tries, the larger
 * minutes of a day…), with this tab's copy counted as the later edit; a deletion against an edit keeps the edit.
 */
export function merge3(base: AppState, ours: AppState, theirs: AppState): AppState {
  if (ours === base) return theirs;
  if (theirs === base) return ours;
  const B = byKey(base), O = byKey(ours), T = byKey(theirs);
  const out: Rec[] = [];
  new Set([...O.keys(), ...T.keys(), ...B.keys()]).forEach((k) => {
    const b = B.get(k), o = O.get(k), t = T.get(k);
    let r: Rec | undefined;
    if (same(o, b)) r = t;
    else if (same(t, b)) r = o;
    else if (o && t) r = mergeRecord({ ...t, updatedAt: 1, deleted: false } as SyncRecord, { ...o, updatedAt: 2, deleted: false } as SyncRecord);
    else r = o ?? t;
    if (r) out.push({ kind: r.kind, id: r.id, data: r.data });
  });
  const merged = fromRecords(out);
  merged.redoSeeded = ours.redoSeeded;
  return merged;
}

let counter = 0;
const tab = Math.random().toString(36).slice(2, 8);
const nextVersion = () => `${Date.now()}-${tab}-${++counter}`;
const readVersion = () => { try { return localStorage.getItem(VERSION_KEY) ?? ""; } catch { return ""; } };

/** What this tab last read or wrote: the base of the next three-way merge. */
let base: { ver: string; st: AppState } | null = null;

/** Loads the state at startup and remembers it as this tab's base. */
export function loadTracked(): AppState {
  const st = loadState();
  base = { ver: readVersion(), st };
  return st;
}

/** The state this tab last read or wrote. */
export const baseState = () => base?.st;

export interface Saved { ok: boolean; merged?: AppState }

/**
 * Saves `next`. If another tab saved since this tab's base, merges first and returns the merged state, which the
 * caller shows instead (rebasing any edit made meanwhile).
 */
export function commit(next: AppState): Saved {
  const b = base ?? { ver: readVersion(), st: next };
  let out = next, merged: AppState | undefined;
  if (readVersion() !== b.ver) {
    out = merge3(b.st, next, loadState());
    merged = out;
  }
  try {
    const ver = nextVersion();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    localStorage.setItem(VERSION_KEY, ver);
    base = { ver, st: out };
    return { ok: true, merged };
  } catch {
    return { ok: false, merged };
  }
}

/**
 * Another tab saved (a storage event). Returns the state this tab should show: the other tab's copy when this tab
 * had nothing unsaved, else both merged against the base.
 */
export function fromOtherTab(current: AppState, raw: string): { st: AppState; needsSave: boolean } {
  const theirs = normalize(JSON.parse(raw));
  const b = base?.st ?? current;
  base = { ver: readVersion(), st: theirs };
  if (current === b) return { st: theirs, needsSave: false };
  return { st: merge3(b, current, theirs), needsSave: true };
}
