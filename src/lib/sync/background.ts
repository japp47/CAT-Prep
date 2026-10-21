import { hasProgress } from "../backup";
import { askToKeep } from "../keep";
import type { AppState } from "../state";
import { loadLedger, saveLedger, track } from "./ledger";

/**
 * Runs after saves, off the first page's critical path (loaded through whenIdle in store.tsx): updates the sync
 * ledger a moment after the last change, and once there is progress asks the browser to keep the data (F50).
 */
let timer: ReturnType<typeof setTimeout> | undefined;
let asked = false;

export function onSaved(st: AppState) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    saveLedger(track(loadLedger(), st));
    if (!asked && hasProgress(st)) { asked = true; void askToKeep(); }
  }, 1500);
}
