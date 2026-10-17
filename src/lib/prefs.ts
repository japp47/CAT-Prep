import { useCallback, useState } from "react";

/** Per-browser UI conveniences such as the open tab or a filter. Safe when storage is blocked. */
export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const full = "cat-prep-pref:" + key;
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(full);
      return raw == null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = useCallback((nv: T) => {
    setV(nv);
    try { localStorage.setItem(full, JSON.stringify(nv)); } catch { /* ignore */ }
  }, [full]);
  return [v, set];
}
