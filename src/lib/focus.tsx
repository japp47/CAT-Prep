import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { SectionId } from "../sections/types";
import { markBlockDone } from "../planner/engine";
import { useStore } from "./store";

/** One running focus session, tied to a timetable block. Times are epoch milliseconds. */
export interface FocusRun {
  key: string;
  name: string;
  sec: SectionId;
  d: string;
  /** Planned minutes for the block */
  target: number;
  /** The block has a score form, so finishing the timer saves the time but leaves the tick to the form */
  log: boolean;
  carryFrom?: string;
  /** Time banked before the current stretch */
  acc: number;
  /** Start of the current stretch, or null while paused */
  since: number | null;
  /** Break reminders already answered, counted in BREAK_EVERY steps */
  breaks: number;
}

/** A break reminder comes up after this many minutes of focus. */
export const BREAK_EVERY = 25;
const KEY = "cat-prep-focus";

export const focusMs = (r: FocusRun, now = Date.now()) => r.acc + (r.since ? now - r.since : 0);

function load(): FocusRun | null {
  try {
    const raw = localStorage.getItem(KEY);
    const r = raw ? (JSON.parse(raw) as FocusRun) : null;
    return r && typeof r.key === "string" && typeof r.acc === "number" ? r : null;
  } catch {
    return null;
  }
}
function save(r: FocusRun | null) {
  try { if (r) localStorage.setItem(KEY, JSON.stringify(r)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
}

interface Focus {
  run: FocusRun | null;
  start: (r: Omit<FocusRun, "acc" | "since" | "breaks">) => void;
  pause: () => void;
  resume: () => void;
  ackBreak: (takeIt: boolean) => void;
  /** Saves the minutes to the day's record and stops. Returns the minutes saved. */
  finish: () => number;
  cancel: () => void;
}

const FocusCtx = createContext<Focus | null>(null);

/**
 * The focus timer lives above the pages so it keeps running while the student moves
 * from Today to a practice set and back. It survives a reload through localStorage.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const { update } = useStore();
  const [run, setRunState] = useState<FocusRun | null>(load);
  const setRun = useCallback((r: FocusRun | null) => { save(r); setRunState(r); }, []);

  const start: Focus["start"] = (r) => setRun({ ...r, acc: 0, since: Date.now(), breaks: 0 });
  const pause = () => { if (run?.since) setRun({ ...run, acc: focusMs(run), since: null }); };
  const resume = () => { if (run && !run.since) setRun({ ...run, since: Date.now() }); };
  const ackBreak = (takeIt: boolean) => {
    if (!run) return;
    const breaks = Math.floor(focusMs(run) / 60000 / BREAK_EVERY);
    setRun(takeIt ? { ...run, breaks, acc: focusMs(run), since: null } : { ...run, breaks });
  };
  const finish = () => {
    if (!run) return 0;
    const m = Math.max(1, Math.round(focusMs(run) / 60000));
    const r = run;
    update((st) => {
      const rec = (st.days[r.d] ??= {});
      (rec.spent ??= {})[r.key] = (rec.spent[r.key] ?? 0) + m;
      if (!r.log) markBlockDone(st, r.d, r.sec, r.key, r.target, r.carryFrom);
    });
    setRun(null);
    return m;
  };
  const cancel = () => setRun(null);

  return <FocusCtx.Provider value={{ run, start, pause, resume, ackBreak, finish, cancel }}>{children}</FocusCtx.Provider>;
}

export function useFocus(): Focus {
  const f = useContext(FocusCtx);
  if (!f) throw new Error("useFocus outside FocusProvider");
  return f;
}
