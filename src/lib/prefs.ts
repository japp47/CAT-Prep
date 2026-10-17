import { useCallback, useEffect, useState } from "react";

const EVENT = "cat-prep-pref";
const read = <T,>(full: string, initial: T): T => {
  try {
    const raw = localStorage.getItem(full);
    return raw == null ? initial : (JSON.parse(raw) as T);
  } catch {
    return initial;
  }
};

/**
 * Per-browser UI conveniences such as the open tab, a filter or the theme. Safe when storage is blocked.
 * Every hook using the same key stays in step, so changing the theme in Settings reaches the whole app at once.
 */
export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const full = "cat-prep-pref:" + key;
  const [v, setV] = useState<T>(() => read(full, initial));
  useEffect(() => {
    const on = (e: Event) => { if ((e as CustomEvent<string>).detail === full) setV(read(full, initial)); };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
    // initial is only a fallback for a missing value; it does not need to re-subscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);
  const set = useCallback((nv: T) => {
    setV(nv);
    try { localStorage.setItem(full, JSON.stringify(nv)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: full }));
  }, [full]);
  return [v, set];
}
