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

/** A backup is due again after this many days, once there is progress to lose. */
export const BACKUP_DUE_DAYS = 14;

/** "today", "yesterday", "12 days ago". */
export const daysAgo = (n: number) => (n <= 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);

/** What a backup holds, in words: "32 days of study, 214 practice sets and 40 mistakes", leaving out what is empty. */
export function holds(st: AppState): string {
  const n = (k: number, one: string, many: string) => (k ? `${k} ${k === 1 ? one : many}` : "");
  const sets = st.rcAttempts.length + st.vaAttempts.length + st.crAttempts.length + st.lrAttempts.length;
  const parts = [
    n(Object.keys(st.days).length, "day of study", "days of study"),
    n(sets, "practice set", "practice sets"),
    n(st.mocks.length + st.sectionals.length, "mock or sectional", "mocks and sectionals"),
    n(st.errors.length, "mistake logged", "mistakes logged"),
    n(st.vocab.length, "word", "words"),
  ].filter(Boolean);
  return parts.length < 2 ? parts.join("") : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}
