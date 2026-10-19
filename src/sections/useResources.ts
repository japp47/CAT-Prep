import { useEffect, useState } from "react";
import type { SectionDef, SectionResources } from "./types";

const cache = new Map<string, SectionResources>();
const pending = new Map<string, Promise<SectionResources>>();
const NONE: SectionResources = { categories: [], resources: [] };

/** Starts loading a section's resource list, once. Safe to call early, before a page needs it. */
export function loadResources(sec: SectionDef): Promise<SectionResources> {
  const hit = cache.get(sec.id);
  if (hit) return Promise.resolve(hit);
  if (!sec.resources) return Promise.resolve(NONE);
  let p = pending.get(sec.id);
  if (!p) {
    p = sec.resources().then((r) => { cache.set(sec.id, r); return r; }, (e) => { pending.delete(sec.id); throw e; });
    pending.set(sec.id, p);
  }
  return p;
}

/** A section's resources, or null while they load. A section without a list gets an empty one at once. */
export function useResources(sec: SectionDef): SectionResources | null {
  const [r, setR] = useState<SectionResources | null>(() => (sec.resources ? cache.get(sec.id) ?? null : NONE));
  useEffect(() => {
    if (r) return;
    let live = true;
    loadResources(sec).then((x) => { if (live) setR(x); }, () => { /* the page still works; the list shows on the next visit */ });
    return () => { live = false; };
  }, [sec, r]);
  return r;
}
