/**
 * Sync status for anything on screen: the Sync row in the sidebar and menu, the prompts, the Sync card. It is tiny
 * and has no imports, so the main script can show the status before the sync code itself has loaded (the runner
 * loads when the browser is idle and keeps this up to date).
 */
export type Phase = "off" | "idle" | "syncing" | "error";
export interface Status { phase: Phase; last?: number; message?: string; identityId?: string }

const LEDGER_KEY = "cat-prep-sync"; // lib/sync/ledger.ts

/** Read straight from the ledger at start, so the row is right on the first paint. */
function fromStorage(): Status {
  try {
    const L = JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "null");
    if (L && L.on === true) return { phase: "idle", last: typeof L.last === "number" ? L.last : undefined, identityId: L.who?.identityId };
  } catch { /* blocked or corrupt: off */ }
  return { phase: "off" };
}

let status: Status | null = null;
const listeners = new Set<() => void>();

export const getStatus = (): Status => (status ??= typeof localStorage === "undefined" ? { phase: "off" } : fromStorage());
export function setStatus(next: Status) {
  status = next;
  listeners.forEach((f) => f());
}
export function subscribe(f: () => void) {
  listeners.add(f);
  return () => { listeners.delete(f); };
}
