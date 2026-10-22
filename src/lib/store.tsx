import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { whenIdle } from "./idle";
import { loadState, normalize, saveState, STORAGE_KEY, type AppState } from "./state";

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
  const [state, setState] = useState<AppState>(loadState);
  const [saved, setSaved] = useState(true);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) { fromOtherTab.current = false; return; }
    const ok = saveState(state);
    setSaved(ok);
    if (ok) afterSave(state);
  }, [state]);

  // Keep two open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try { fromOtherTab.current = true; setState(normalize(JSON.parse(e.newValue))); } catch { /* ignore */ }
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
