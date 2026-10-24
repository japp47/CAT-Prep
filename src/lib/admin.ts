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

/** Remembered for the session, so the account menu asks once, not on every open. */
let staff: Promise<StaffMe | null> | null = null;
export function isStaff(): Promise<StaffMe | null> {
  staff ??= staffMe().then((r) => (r.ok ? r.data : null));
  return staff;
}
export const forgetStaff = () => { staff = null; };

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
