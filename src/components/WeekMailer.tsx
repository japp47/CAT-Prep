import { useEffect, useRef } from "react";
import { todayIso } from "../lib/date";
import { loadLedger } from "../lib/sync/ledger";
import { useStore } from "../lib/store";
import { sendWeek, WEEKMAIL_SENT as SENT, weekMail } from "../lib/weekmail";

/** Waits this long after a change, so a set of answers sends one update, not one per answer. */
const SETTLE_MS = 5000;

/**
 * Keeps the server's copy of this week's figures current while the weekly review is on (D97). Mounted by the layout
 * only then, and loaded on idle, so it costs nothing otherwise. It sends after practice settles and once on load,
 * only when the figures changed since the last send from this browser.
 */
export default function WeekMailer() {
  const { state } = useStore();
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!loadLedger().on) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const w = weekMail(state, todayIso());
      const body = JSON.stringify(w);
      let last: string | null = null;
      try { last = localStorage.getItem(SENT); } catch { /* private mode: send anyway */ }
      if (body === last) return;
      void sendWeek(w).then((r) => {
        if (!r.ok) return;
        try { localStorage.setItem(SENT, body); } catch { /* ignore */ }
      });
    }, SETTLE_MS);
    return () => window.clearTimeout(timer.current);
  }, [state]);
  return null;
}
