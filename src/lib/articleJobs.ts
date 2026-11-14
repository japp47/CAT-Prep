import { useSyncExternalStore } from "react";
import type { ArticleOrigin } from "../practice/articleText";

/**
 * The article set being made (F34, D104), shared by the article page and the watcher in the site's frame
 * (components/ArticleWatcher.tsx), so a set finishes and is saved whichever page the student is on. Kept in
 * localStorage, so it survives a reload; one at a time. Tiny on purpose: it is in the first download.
 */
export interface Pending { job: string; title: string; site: string; link: string; paras: string[]; at: number; origin: ArticleOrigin; file?: string }
export interface JobState { phase: "queued" | "running" | "failed"; msg?: string; stage?: "queued" | "writing" | "checking" | "waiting"; ahead?: number }

const KEY = "cat-prep-article-pending";
/** A set not done in 30 minutes is given up on; the job on the server ends well before. */
export const PENDING_FOR = 30 * 60_000;

export function readPending(): Pending | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Pending | null;
    return p && Date.now() - p.at < PENDING_FOR ? p : null;
  } catch { return null; }
}

let state: JobState | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function setPending(p: Pending | null): void {
  try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch { /* the job still runs */ }
  if (p) state = { phase: "queued" };
  emit();
}

export function setJobState(s: JobState | null): void { state = s; emit(); }

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Whether a set is being made: the frame mounts the watcher only then. */
export const useHasPending = () => useSyncExternalStore(subscribe, () => readPending() !== null, () => false);

/** The current set's progress, for the article page. */
export const useJobState = () => useSyncExternalStore(subscribe, () => state, () => null);
