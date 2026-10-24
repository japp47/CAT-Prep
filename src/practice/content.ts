import { useCallback, useEffect, useState } from "react";
import { loadCrItems, loadLrFile, loadRcFile, loadVaParas, LR_FILES, RC_FILES } from "./bank";
import { LR_CATALOG, LR_FILE, RC_CATALOG, RC_FILE } from "./catalog.gen";
import type { CrItem, LrSet, RcSet, VaPara } from "./types";

/** The practice content a page asked for. Lists and rotations use catalog.gen.ts instead, which is small. */
export interface Content {
  rcSets: RcSet[];
  rcById: (id: string) => RcSet | undefined;
  vaParas: VaPara[];
  crItems: CrItem[];
  crById: (id: string) => CrItem | undefined;
  lrSets: LrSet[];
  lrById: (id: string) => LrSet | undefined;
}

/**
 * What a page needs: "all" (the sectional, the redo queue, the report card), or only some RC sets by id,
 * the VA paragraphs, the critical reasoning questions, and some LR sets by id. A page that asks for less downloads less.
 */
export type Need = "all" | { rc?: string[]; va?: boolean; cr?: boolean; lr?: string[] };

export function makeContent(rcSets: RcSet[], vaParas: VaPara[], crItems: CrItem[], lrSets: LrSet[] = []): Content {
  const byId = new Map(rcSets.map((s) => [s.id, s]));
  const crById = new Map(crItems.map((c) => [c.id, c]));
  const lrById = new Map(lrSets.map((s) => [s.id, s]));
  return { rcSets, rcById: (id) => byId.get(id), vaParas, crItems, crById: (id) => crById.get(id), lrSets, lrById: (id) => lrById.get(id) };
}

// Parts already loaded, so a page opened again renders at once, and the loads in flight, so two pages share one.
const files = new Map<string, RcSet[]>();
const lrFiles = new Map<string, LrSet[]>();
let va: VaPara[] | null = null;
let cr: CrItem[] | null = null;
const inflight = new Map<string, Promise<void>>();
const built = new Map<string, Content>();

const keyOf = (need: Need) => (need === "all" ? "all" : JSON.stringify([need.rc ?? [], !!need.va, !!need.cr, need.lr ?? []]));
const filesFor = (need: Need) => (need === "all" ? RC_FILES : [...new Set((need.rc ?? []).map((id) => RC_FILE[id]).filter(Boolean))]);
const lrFilesFor = (need: Need) => (need === "all" ? LR_FILES : [...new Set((need.lr ?? []).map((id) => LR_FILE[id]).filter(Boolean))]);
const wants = (need: Need, part: "va" | "cr") => need === "all" || !!need[part];

function once<T>(key: string, load: () => Promise<T>, keep: (x: T) => void): Promise<void> {
  let p = inflight.get(key);
  if (!p) {
    p = load().then(keep, (e) => { inflight.delete(key); throw e; });
    inflight.set(key, p);
  }
  return p;
}

/** The content for a need if every part of it has loaded, else null. The same object comes back each time. */
export function peekContent(need: Need = "all"): Content | null {
  const key = keyOf(need);
  const hit = built.get(key);
  if (hit) return hit;
  const fs = filesFor(need);
  const ls = lrFilesFor(need);
  if (fs.some((f) => !files.has(f)) || ls.some((f) => !lrFiles.has(f)) || (wants(need, "va") && !va) || (wants(need, "cr") && !cr)) return null;
  const byId = new Map(fs.flatMap((f) => files.get(f)!).map((s) => [s.id, s]));
  // Catalog order, so "all" lists the sets the way the library does.
  const rcSets = RC_CATALOG.map((m) => byId.get(m.id)).filter((s): s is RcSet => !!s);
  const lrById = new Map(ls.flatMap((f) => lrFiles.get(f)!).map((s) => [s.id, s]));
  const lrSets = LR_CATALOG.map((m) => lrById.get(m.id)).filter((s): s is LrSet => !!s);
  const c = makeContent(rcSets, wants(need, "va") ? va! : [], wants(need, "cr") ? cr! : [], lrSets);
  built.set(key, c);
  return c;
}

/** Loads what a need asks for, each file once. Later calls share the same loads; a failed load can be tried again. */
export function loadContent(need: Need = "all"): Promise<Content> {
  return Promise.all([
    ...filesFor(need).map((f) => once("rc:" + f, () => loadRcFile(f), (x) => { files.set(f, x); })),
    ...lrFilesFor(need).map((f) => once("lr:" + f, () => loadLrFile(f), (x) => { lrFiles.set(f, x); })),
    wants(need, "va") ? once("va", loadVaParas, (x) => { va = x; }) : null,
    wants(need, "cr") ? once("cr", loadCrItems, (x) => { cr = x; }) : null,
  ]).then(() => peekContent(need)!);
}

export type ContentState = { content: Content; failed: false } | { content: null; failed: boolean };

/** The content once loaded (instantly when it already has), or null while it loads or after a failure. */
export function useContent(need: Need = "all"): ContentState & { retry: () => void } {
  const key = keyOf(need);
  const [state, setState] = useState<{ key: string; c: Content | null }>(() => ({ key, c: peekContent(need) }));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // A new need (another set, say) starts from what is already loaded for it.
  const c = state.key === key ? state.c : peekContent(need);
  useEffect(() => {
    if (c) return;
    let live = true;
    loadContent(need).then((x) => { if (live) setState({ key, c: x }); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
    // need is described fully by key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, c, attempt]);
  const retry = useCallback(() => { setFailed(false); setAttempt((n) => n + 1); }, []);
  return c ? { content: c, failed: false, retry } : { content: null, failed, retry };
}
