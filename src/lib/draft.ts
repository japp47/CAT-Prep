/**
 * Unfinished RC sets and CR/VA drills, so leaving the page or closing the tab does not lose the attempt.
 * All drafts sit under one key. A draft older than a day is dropped: by then the attempt is stale. A dropped practice
 * draft is noted, so its set can say so once (D83, docs/design/resume-and-quick-pick.md).
 * The timed sectional keeps its own draft (practice/sectional.ts), because its clock never stops.
 */
const KEY = "cat-prep-drafts";
const CLEARED = "cat-prep-drafts-cleared";
export const DRAFT_TTL = 24 * 60 * 60 * 1000;
/** Away longer than this, a set asks whether to start fresh or carry on (D83). */
export const AWAY_MS = 30 * 60 * 1000;
/** Drafts of practice sets: only these are noted when dropped. */
const PRACTICE = /^(rc|va|cr|lr):/;

/** at: the last save, which is the moment the student left. away: seconds of breaks over 30 minutes the student chose to carry on after. */
export type Drafts = Record<string, { at: number; v: unknown; away?: number }>;

/** The drafts still fresh at `now`. */
export function pruneDrafts(all: Drafts, now: number): Drafts {
  return Object.fromEntries(Object.entries(all).filter(([, d]) => d && typeof d.at === "number" && now - d.at <= DRAFT_TTL));
}

function readAll(): Drafts {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const all = JSON.parse(raw) as Drafts, now = Date.now(), fresh = pruneDrafts(all, now);
    const gone = Object.keys(all).filter((k) => !(k in fresh) && PRACTICE.test(k) && typeof all[k]?.at === "number");
    if (gone.length) {
      noteCleared(Object.fromEntries(gone.map((k) => [k, all[k].at])), now);
      localStorage.setItem(KEY, JSON.stringify(fresh));
    }
    return fresh;
  } catch {
    return {};
  }
}

export function readDraft<T>(key: string): T | null {
  return (readAll()[key]?.v as T | undefined) ?? null;
}

/** A draft with when it was last saved and the breaks already carried on after. */
export function readDraftAt<T>(key: string): { at: number; v: T; away?: number } | null {
  const d = readAll()[key];
  return d ? { at: d.at, v: d.v as T, ...(d.away ? { away: d.away } : {}) } : null;
}

/** Saves a draft, or removes it when `v` is null. A break already carried on after stays with the draft until it is removed. */
export function writeDraft(key: string, v: unknown): void {
  try {
    const all = readAll();
    if (v === null) delete all[key];
    else all[key] = { at: Date.now(), v, ...(all[key]?.away ? { away: all[key].away } : {}) };
    if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the attempt is simply not kept */
  }
}

/** Records a break of `secs` the student chose to carry on after; the attempt is then saved as interrupted. */
export function addAway(key: string, secs: number): number {
  try {
    const all = readAll(), d = all[key];
    if (!d) return 0;
    d.away = Math.round((d.away ?? 0) + secs);
    localStorage.setItem(KEY, JSON.stringify(all));
    return d.away;
  } catch {
    return 0;
  }
}

/** Whether a set left at `at` carries on at `now` or asks first (D83). */
export const comeBack = (at: number, now: number): "carry-on" | "ask" => (now - at > AWAY_MS ? "ask" : "carry-on");

/** Cleared drafts are remembered a week, long enough for the student to open the set again. */
const CLEARED_TTL = 7 * DRAFT_TTL;

function noteCleared(add: Record<string, number>, now: number) {
  const all = { ...readCleared(now), ...add };
  localStorage.setItem(CLEARED, JSON.stringify(all));
}

function readCleared(now: number): Record<string, number> {
  try {
    const all = JSON.parse(localStorage.getItem(CLEARED) ?? "{}") as Record<string, number>;
    return Object.fromEntries(Object.entries(all).filter(([, at]) => typeof at === "number" && now - at <= CLEARED_TTL));
  } catch {
    return {};
  }
}

/** When a dropped draft of this set was last saved, if one was dropped and not yet reported. */
export function peekCleared(key: string): number | null {
  try {
    readAll(); // notes a draft that went stale since the last read
    return readCleared(Date.now())[key] ?? null;
  } catch {
    return null;
  }
}

/** Forgets the note once the set has said so. */
export function dropCleared(key: string): void {
  try {
    const all = readCleared(Date.now());
    if (!(key in all)) return;
    delete all[key];
    if (Object.keys(all).length) localStorage.setItem(CLEARED, JSON.stringify(all));
    else localStorage.removeItem(CLEARED);
  } catch {
    /* storage blocked: nothing was noted */
  }
}
