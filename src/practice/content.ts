import { useCallback, useEffect, useState } from "react";
import type { RcSet, VaPara } from "./types";

/** The full practice content. Lists and rotations use catalog.gen.ts instead, which is small. */
export interface Content {
  rcSets: RcSet[];
  rcById: (id: string) => RcSet | undefined;
  vaParas: VaPara[];
}

let loaded: Content | null = null;
let pending: Promise<Content> | null = null;

/** Loads the content chunk once. Later calls share the same promise; a failed load can be tried again. */
export function loadContent(): Promise<Content> {
  pending ??= import("./bank").then(
    (m) => (loaded = m.CONTENT),
    (e) => { pending = null; throw e; },
  );
  return pending;
}

export type ContentState = { content: Content; failed: false } | { content: null; failed: boolean };

/** The content once loaded (instantly after the first time), or null while it loads or after a failure. */
export function useContent(): ContentState & { retry: () => void } {
  const [c, setC] = useState<Content | null>(loaded);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (c) return;
    let live = true;
    loadContent().then((x) => { if (live) setC(x); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [c, attempt]);
  const retry = useCallback(() => { setFailed(false); setAttempt((n) => n + 1); }, []);
  return c ? { content: c, failed: false, retry } : { content: null, failed, retry };
}
