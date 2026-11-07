import { useCallback, useEffect, useState } from "react";
import { API_ENABLED } from "./api";
import { browserZone, loadReminders, pushHere, saveReminders, turnOffPush, turnOnPush, type ReminderPrefs } from "./notify";
import { loadLedger } from "./sync/ledger";

/**
 * The student's reminder choices, shared by the Settings card and the bell panel (F65). The choices live on the
 * server, which sends the reminders; reminders need sync, so the server knows when the student has practised.
 * `enabled` is false until the bell panel is opened, so a closed panel costs no request.
 */
export type ReminderPhase = "no-sync" | "loading" | "unavailable" | "ready";

export function useReminderPrefs(enabled = true) {
  const syncOn = API_ENABLED && loadLedger().on;
  const [phase, setPhase] = useState<ReminderPhase>(enabled && !syncOn ? "no-sync" : "loading");
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!syncOn) { setPhase("no-sync"); return; }
    let live = true;
    void loadReminders().then((r) => {
      if (!live) return;
      if (r.ok) { setPrefs(r.data); setPhase("ready"); } else { setMsg(r.message); setPhase("unavailable"); }
    });
    return () => { live = false; };
  }, [enabled, syncOn]);

  const save = useCallback(async (next: ReminderPrefs) => {
    setPrefs(next);
    setMsg(null);
    const r = await saveReminders({ ...next, timeZone: browserZone() });
    if (r.ok) setPrefs(r.data);
    else {
      setMsg(r.message);
      const back = await loadReminders();
      if (back.ok) setPrefs(back.data);
    }
    return r.ok;
  }, []);

  /**
   * Reminders on or off. A tap is the only moment a browser lets us ask for notifications, so turning them on asks
   * here; a refusal still leaves reminders on, with email or another device to fall back on.
   */
  const setOn = useCallback(async (on: boolean) => {
    if (!prefs) return;
    let note: string | null = null;
    if (on && !prefs.thisDevice && pushHere(prefs) === "yes") {
      const p = await turnOnPush();
      if (!p.ok) note = p.message;
    }
    const fresh = on ? await loadReminders() : null;
    await save({ ...(fresh?.ok ? fresh.data : prefs), on });
    if (note) setMsg(note);
  }, [prefs, save]);

  /** Notifications in this browser: the permission prompt and the subscription the server sends to. */
  const setPush = useCallback(async (on: boolean) => {
    setBusy(true);
    setMsg(null);
    if (on) { const p = await turnOnPush(); if (!p.ok) setMsg(p.message); } else await turnOffPush();
    const fresh = await loadReminders();
    if (fresh.ok) setPrefs(fresh.data);
    setBusy(false);
  }, []);

  return { phase, prefs, save, setOn, setPush, busy, msg, setMsg, setPrefs };
}

export type Reminders = ReturnType<typeof useReminderPrefs>;
