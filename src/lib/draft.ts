/**
 * Unfinished RC sets and VA drills, so leaving the page or closing the tab does not lose the answers.
 * All drafts sit under one key. A draft older than a day is dropped: by then the attempt is stale.
 * The timed sectional keeps its own draft (practice/sectional.ts), because its clock never stops.
 */
const KEY = "cat-prep-drafts";
export const DRAFT_TTL = 24 * 60 * 60 * 1000;

export type Drafts = Record<string, { at: number; v: unknown }>;

/** The drafts still fresh at `now`. */
export function pruneDrafts(all: Drafts, now: number): Drafts {
  return Object.fromEntries(Object.entries(all).filter(([, d]) => d && typeof d.at === "number" && now - d.at <= DRAFT_TTL));
}

function readAll(): Drafts {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? pruneDrafts(JSON.parse(raw) as Drafts, Date.now()) : {};
  } catch {
    return {};
  }
}

export function readDraft<T>(key: string): T | null {
  return (readAll()[key]?.v as T | undefined) ?? null;
}

/** Saves a draft, or removes it when `v` is null. */
export function writeDraft(key: string, v: unknown): void {
  try {
    const all = readAll();
    if (v === null) delete all[key];
    else all[key] = { at: Date.now(), v };
    if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the attempt is simply not kept */
  }
}
