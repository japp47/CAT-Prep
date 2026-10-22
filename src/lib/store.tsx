import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { whenIdle } from "./idle";
import { STORAGE_KEY, type AppState } from "./state";
import { commit, fromOtherTab, loadTracked, merge3 } from "./tabs";

interface Store {
  state: AppState;
  /** Mutate a copy of the state. The copy is saved to this browser. */
  update: (fn: (draft: AppState) => void) => void;
  replace: (next: AppState) => void;
  /** Computes the next state from the latest one, after any edit still waiting to be applied (sync merges use it). */
  transform: (fn: (prev: AppState) => AppState) => void;
  saved: boolean;
}

const StoreCtx = createContext<Store | null>(null);

/** The sync ledger and the keep-data request load when the browser is idle, never with the first page. */
let background: Promise<typeof import("./sync/background")> | null = null;
function afterSave(st: AppState) {
  background ??= new Promise((done) => whenIdle(() => done(import("./sync/background"))));
  void background.then((m) => m.onSaved(st)).catch(() => { /* chunk failed to load offline: try on the next save */ background = null; });
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadTracked);
  const [saved, setSaved] = useState(true);
  // The state object known to be in storage already: never saved twice. See lib/tabs.ts for how two tabs save.
  const stored = useRef<AppState>(state);

  useEffect(() => {
    if (state === stored.current) return;
    const res = commit(state);
    setSaved(res.ok);
    const final = res.merged ?? state;
    stored.current = final;
    // Another tab saved first: show the merged state, keeping any edit made here since (rebased onto it).
    if (res.merged) setState((prev) => (prev === state ? res.merged! : merge3(state, prev, res.merged!)));
    if (res.ok) afterSave(final);
  }, [state]);

  // Keep two open tabs in step: take the other tab's save, merged with anything not yet saved here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const raw = e.newValue;
      try {
        setState((prev) => {
          const r = fromOtherTab(prev, raw);
          if (!r.needsSave) stored.current = r.st;
          return r.st;
        });
      } catch { /* ignore a value we cannot read */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (draft: AppState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);
  const replace = useCallback((next: AppState) => setState(next), []);
  const transform = useCallback((fn: (prev: AppState) => AppState) => setState(fn), []);

  return <StoreCtx.Provider value={{ state, update, replace, transform, saved }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Store {
  const s = use(StoreCtx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
