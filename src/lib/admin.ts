import { useEffect, useState } from "react";
import { api } from "./api";

/**
 * The staff API (docs/feature.md F79, B8). Every route answers 404 to anyone who is not staff, so a 404 here simply
 * means "not for you" (D33).
 */
export type ReportStatus = "new" | "seen" | "fixed" | "wont_fix";
export type ReportKind = "answer_key" | "unclear" | "typo" | "other";
export interface Report { id: number; createdAt: string; page: string; itemId: string; kind: ReportKind; note: string; status: ReportStatus; handledAt: string | null; handledBy: string }
export interface StaffMe { email: string; permissions: string[] }
export interface Overview {
  identities: number; activeThisWeek: number; newThisWeek: number; accounts: number; devices: number; records: number;
  refusedThisWeek: number; reportsOpen: number; reportsNew: number; closedThisWeek: number; databaseBytes: number; databaseFreeBytes: number;
}

export const staffMe = () => api<StaffMe>("/admin/me");
export const listReports = (state: "open" | "closed") => api<{ reports: Report[] }>("/admin/reports?state=" + state);
export const setStatus = (ids: number[], status: Exclude<ReportStatus, "new">) => api<{ changed: number }>("/admin/reports/status", { ids, status });
export const overview = () => api<Overview>("/admin/overview");

/** The Reminders panel (F65 R2, D97): counts only, and the owner's two actions. */
export interface ReminderStats {
  setup: { worker: boolean; dry: boolean; email: boolean; push: boolean; bounceCheck: boolean; emailCap: number };
  emailsLastDay: number;
  students: { remindersOn: number; weeklyOn: number; emailOn: number; pushDevices: number; bounced: number; paused: number };
  kinds: { kind: string; channel: "email" | "push"; sent: number; skipped: number; failed: number; practised: number }[] | null;
  days: { day: string; sent: number }[] | null;
  skips: { reason: string; n: number }[] | null;
  bounces: { read: number; matched: number };
  unsubscribes: { reminders: number; weekly: number };
  wordings: { kind: string; ids: string[] }[] | null;
}
export const reminderStats = () => api<ReminderStats>("/admin/reminders");
export const sendTestReminder = (kind: string, id: string) => api<{ channels: string[]; to: string }>("/admin/reminders/test", { kind, id });
export const markBounced = (email: string) => api<{ marked: number }>("/admin/reminders/bounced", { email });
/** Plain names for the reminder kinds the server sends. */
export const REMINDER_KIND: Record<string, string> = {
  daily: "Daily nudge", "daily-streak": "Daily nudge, on a streak", "missed-2": "Two days missed", "missed-5": "Five days missed",
  "missed-12": "Twelve days missed", weekly: "Weekly review",
};

/** Remembered for the session, so the account menu asks once, not on every open. */
let staff: Promise<StaffMe | null> | null = null;
export function isStaff(): Promise<StaffMe | null> {
  staff ??= staffMe().then((r) => (r.ok ? r.data : null));
  return staff;
}
export const forgetStaff = () => { staff = null; };

/**
 * Whether this signed-in person is staff, for the Admin links (account menu, You page). Asked once a session and only
 * when signed in: no one else can be staff (D33).
 */
export function useIsStaff(signedIn: boolean): boolean {
  const [yes, setYes] = useState(false);
  useEffect(() => {
    if (!signedIn) { setYes(false); return; }
    let live = true;
    void isStaff().then((m) => { if (live) setYes(!!m); });
    return () => { live = false; };
  }, [signedIn]);
  return yes;
}

export const KIND_LABEL: Record<ReportKind, string> = { answer_key: "Wrong answer key", unclear: "Unclear", typo: "Typo", other: "Something else" };

/** Reports about one question, as the admin page shows them. */
export interface ReportGroup { itemId: string; reports: Report[]; latest: string }

/** Groups reports by question: more reports first, then the newest (F79). */
export function groupReports(reports: Report[]): ReportGroup[] {
  const by = new Map<string, Report[]>();
  reports.forEach((r) => { const l = by.get(r.itemId); if (l) l.push(r); else by.set(r.itemId, [r]); });
  return [...by.entries()]
    .map(([itemId, rs]) => ({ itemId, reports: rs.sort((a, b) => b.id - a.id), latest: rs.reduce((m, r) => (r.createdAt > m ? r.createdAt : m), "") }))
    .sort((a, b) => b.reports.length - a.reports.length || (a.latest < b.latest ? 1 : a.latest > b.latest ? -1 : 0));
}

/** The AI panel (D102): the order each task tries its models in, which are resting and why, working keys, and the last seven days per model. */
export interface AiModelStatus { name: string; id: string; provider: string; state: "ready" | "resting" | "no key"; until?: string; lastError?: string; lastErrorAt?: string; lastOk?: string }
export interface AiPanel {
  on: boolean; budget: number; perStudent: number; usedToday: number;
  router?: { tasks: Record<string, string[]>; models: AiModelStatus[]; providers: { name: string; keysEnv?: string; keys: number; working: number }[] };
  days: { day: string; model: string; answered: number; refused: number; limited: number; failed: number; tokens: number }[];
}
export const aiPanel = () => api<AiPanel>("/admin/ai");
