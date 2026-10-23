import { addDays } from "../lib/date";
import type { AppState, ErrorEntry, RedoItem } from "../lib/state";
import { RECENT_DAYS, type Status } from "./errorfilter";
import { CR_CATALOG, RC_CATALOG, VA_CATALOG } from "./catalog.gen";
import { redoKeyExists } from "./redo";
import { VA_KIND, VA_KINDS } from "./va/build";

/**
 * From an Error log entry back to its question (docs/feature.md F52): the question's redo key, for "Try it again",
 * and the review of the attempt it was missed in, opened at that question, for "See the question".
 */
export interface ErrorLink { key: string; review?: string; retry: boolean }

/**
 * The redo key of the question an entry is about. New entries carry it (q); older ones are matched from the text
 * practice wrote into them ("Title, Q3 (Practice)", "Para summary: Topic (Practice)", "Critical reasoning CR-04: …").
 * Hand-written and mock entries have none.
 */
export function errorKey(e: ErrorEntry): string | null {
  if (e.q) return e.q;
  const rc = /^(.*), Q(\d+) \(Practice\)$/.exec(e.src);
  if (rc) {
    const set = RC_CATALOG.find((s) => s.title === rc[1]);
    if (set) return `rc:${set.id}:${Number(rc[2]) - 1}`;
  }
  const cr = /^Critical reasoning ([A-Za-z0-9-]+):/.exec(e.src);
  if (cr && CR_CATALOG.some((c) => c.id === cr[1])) return `cr:${cr[1]}`;
  const va = /^(.+?): (.+) \(Practice\)$/.exec(e.src);
  if (va) {
    const kind = VA_KINDS.find((k) => VA_KIND[k].label === va[1]), para = VA_CATALOG.find((p) => p.topic === va[2]);
    if (kind && para) return `${kind}:${para.id}`;
  }
  return null;
}

/** The attempt to show: the one the entry names, else the latest on or before the entry's date, else the latest. */
function pick<T extends { id: string; d: string }>(atts: T[], e: ErrorEntry): T | undefined {
  if (e.att) { const a = atts.find((x) => x.id === e.att); if (a) return a; }
  const before = atts.filter((a) => a.d <= e.d);
  const from = before.length ? before : atts;
  return from[from.length - 1];
}

export function errorLink(e: ErrorEntry, st: AppState): ErrorLink | null {
  const key = errorKey(e);
  if (!key) return null;
  const retry = redoKeyExists(key);
  if (key.startsWith("rc:")) {
    const [, set, n] = key.split(":");
    const att = pick(st.rcAttempts.filter((a) => a.set === set), e);
    return { key, retry, review: att ? `/practice/rc/${set}?review=${att.id}&q=${Number(n) + 1}` : undefined };
  }
  const list = key.startsWith("cr:") ? st.crAttempts : st.vaAttempts;
  const att = pick((list as { id: string; d: string; items: { k: string }[] }[]).filter((a) => a.items.some((i) => i.k === key)), e);
  const at = att ? att.items.findIndex((i) => i.k === key) + 1 : 0;
  const page = key.startsWith("cr:") ? "/practice/cr" : "/practice/va";
  return { key, retry, review: att ? `${page}?review=${att.id}&q=${at}` : undefined };
}

/** The newest Error log entry about a question, for "Last time you…" after a retry. */
export function lastMistake(st: AppState, key: string): ErrorEntry | undefined {
  const all = st.errors.filter((e) => errorKey(e) === key).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  return all[all.length - 1];
}

/** The status of every entry, by id. Worked out once per render: "open" needs the whole log. */
export function statuses(errors: ErrorEntry[], redo: RedoItem[], today: string): Map<string, Status | null> {
  const from = addDays(today, -RECENT_DAYS);
  const recent = new Set<string>();
  const sig = (e: ErrorEntry) => [e.sec + "|" + e.t + "|t|" + (e.trap || ""), e.sec + "|" + e.t + "|c|" + (e.cause ?? "")];
  errors.forEach((e) => { if (e.d >= from && e.d <= today) sig(e).forEach((s) => recent.add(s)); });
  const byKey = new Map(redo.map((r) => [r.k, r]));
  const out = new Map<string, Status | null>();
  errors.forEach((e) => {
    const k = errorKey(e), r = k ? byKey.get(k) : undefined;
    if (r && ((r.cleared && r.cleared >= e.d) || (r.box > 0 && r.last && r.last >= e.d))) { out.set(e.id, "fixed"); return; }
    // Without a trap or cause, the type alone is the kind of mistake.
    const [bt, bc] = sig(e);
    const same = (e.trap ? recent.has(bt) : false) || (e.cause ? recent.has(bc) : false) || (!e.trap && !e.cause && recent.has(bt));
    out.set(e.id, same ? "open" : null);
  });
  return out;
}
