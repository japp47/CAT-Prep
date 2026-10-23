import { CAUSE_IDS, type Cause, type ErrorEntry } from "../lib/state";

/**
 * Error log filters (docs/feature.md F52). They live in the URL (/errors?sec=VARC&t=RC&trap=…), so Progress, the
 * report card and patterns can link straight to the matching entries.
 * t is an error type ("RC: inference", "Para jumble") or a practice type: "RC" means every RC kind.
 */
export interface ErrorFilter { sec?: string; t?: string; trap?: string; cause?: Cause; status?: Status }

/**
 * fixed: the question was answered right on its latest try after the mistake (or left the redo queue).
 * open: not fixed, and the same mistake (type, and trap or cause) was logged in the last two weeks.
 * Worked out by `statuses` in errorlink.ts, which needs the catalog.
 */
export type Status = "open" | "fixed";
export const STATUS_LABEL: Record<Status, string> = { open: "Still happening", fixed: "Fixed" };
export const RECENT_DAYS = 14;

const isCause = (c: string | null): c is Cause => !!c && (CAUSE_IDS as readonly string[]).includes(c);

export function parseFilter(sp: URLSearchParams): ErrorFilter {
  const f: ErrorFilter = {};
  const sec = sp.get("sec"), t = sp.get("t"), trap = sp.get("trap"), cause = sp.get("cause"), status = sp.get("status");
  if (sec) f.sec = sec;
  if (t) f.t = t;
  if (trap) f.trap = trap;
  if (isCause(cause)) f.cause = cause;
  if (status === "open" || status === "fixed") f.status = status;
  return f;
}

export function filterHref(f: ErrorFilter): string {
  const sp = new URLSearchParams();
  (["sec", "t", "trap", "cause", "status"] as const).forEach((k) => { if (f[k]) sp.set(k, f[k]!); });
  const q = sp.toString();
  return "/errors" + (q ? "?" + q : "");
}

export const typeMatches = (t: string, want: string) => t === want || (want === "RC" && t.startsWith("RC: "));

export function matches(e: ErrorEntry, f: ErrorFilter, status: Status | null | undefined): boolean {
  if (f.sec && e.sec !== f.sec) return false;
  if (f.t && !typeMatches(e.t, f.t)) return false;
  if (f.trap && e.trap !== f.trap) return false;
  if (f.cause && e.cause !== f.cause) return false;
  if (f.status && status !== f.status) return false;
  return true;
}

export const isEmpty = (f: ErrorFilter) => !f.t && !f.trap && !f.cause && !f.status;

/** Entries matching a filter, newest first. */
export function filterErrors(errors: ErrorEntry[], f: ErrorFilter, st: Map<string, Status | null>): ErrorEntry[] {
  return errors.filter((e) => matches(e, f, st.get(e.id))).slice().reverse();
}
