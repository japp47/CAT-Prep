import { todayIso } from "./date";
import type { AppState } from "./state";

/** Saves all progress as a file the student can restore here or on another device. */
export function downloadBackup(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "99ile-backup-" + todayIso() + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** True once there is anything worth keeping. */
export const hasProgress = (s: AppState) =>
  s.rcAttempts.length + s.vaAttempts.length + s.crAttempts.length + s.lrAttempts.length + s.sectionals.length + s.speedRuns.length + s.practice.length + s.mocks.length + s.errors.length + s.vocab.length > 0 || Object.keys(s.days).length > 0;
