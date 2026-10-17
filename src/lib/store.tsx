import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { loadState, normalize, saveState, STORAGE_KEY, type AppState } from "./state";

interface Store {
  state: AppState;
  /** Mutate a copy of the state. The copy is saved to this browser. */
  update: (fn: (draft: AppState) => void) => void;
  replace: (next: AppState) => void;
  saved: boolean;
}

const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [saved, setSaved] = useState(true);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) { fromOtherTab.current = false; return; }
    setSaved(saveState(state));
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

  return <StoreCtx.Provider value={{ state, update, replace, saved }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
