import { useRef, useState } from "react";
import { useTheme, type Theme } from "../components/Layout";
import { todayIso } from "../lib/date";
import { googleCalendarUrl, reminderIcs } from "../lib/ics";
import { usePref } from "../lib/prefs";
import { useInstall } from "../lib/pwa";
import { useStore } from "../lib/store";
import { blankState, normalize } from "../lib/state";

export default function Settings() {
  const { state, replace, saved } = useStore();
  const [theme, setTheme] = useTheme();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cat-prep-backup-" + todayIso() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importData = async (f: File) => {
    try {
      const raw = JSON.parse(await f.text());
      if (!raw || typeof raw !== "object" || !("settings" in raw || "days" in raw || "mocks" in raw)) throw new Error("not a backup");
      if (!confirm("Replace everything in this browser with the backup?")) return;
      replace(normalize(raw));
      setMsg({ ok: true, text: "Backup restored." });
    } catch {
      setMsg({ ok: false, text: "That file is not a CAT Prep Hub backup." });
    }
  };
  const counts = [
    ["Days with activity", Object.keys(state.days).length],
    ["Practice sets", state.practice.length],
    ["Papers and mocks", state.mocks.length],
    ["VARC sectionals", state.sectionals.length],
    ["Error log entries", state.errors.length],
    ["Words", state.vocab.length],
    ["Resources ticked", Object.keys(state.ticks).length],
    ["Questions to redo", state.redo.filter((r) => !r.cleared).length],
  ] as const;

  return (
    <div className="page">
      <div className="view-head">
        <h1>Settings and backup</h1>
        <p>Everything you enter is saved in this browser only. Nothing is sent to a server.</p>
      </div>
      {!saved && <div className="notice">This browser is blocking storage, so changes will be lost when you close the tab. Turn off private browsing or allow site data.</div>}
      <div className="card stack">
        <h3>Appearance</h3>
        <div className="seg" role="group" aria-label="Theme" style={{ alignSelf: "flex-start" }}>
          {(["auto", "light", "dark"] as Theme[]).map((t) => <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>{t === "auto" ? "Match device" : t[0].toUpperCase() + t.slice(1)}</button>)}
        </div>
      </div>
      <InstallCard />
      <ReminderCard />
      <div className="card stack">
        <h3>Your data</h3>
        <p className="summary">{counts.map(([k, v]) => <span key={k}>{k} <b>{v}</b></span>)}</p>
        <p className="muted small">Download a backup now and then, and use it to move your plan to another device or browser.</p>
        <div className="row">
          <button type="button" className="btn" onClick={exportData}>Download backup</button>
          <button type="button" className="btn ghost" onClick={() => file.current?.click()}>Restore from backup</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ""; }} />
        </div>
        {msg && <p className={msg.ok ? "ok" : "err"} role="status">{msg.text}</p>}
      </div>
      <div className="card stack">
        <h3>Start over</h3>
        <p className="muted small">Deletes your time settings, ticks, logs and words from this browser. Download a backup first if you might want them back.</p>
        <button type="button" className="btn danger" style={{ alignSelf: "flex-start" }} onClick={() => {
          if (confirm("Delete all your data from this browser? This cannot be undone.")) { replace(blankState()); setMsg({ ok: true, text: "All data cleared." }); }
        }}>Delete all my data</button>
      </div>
    </div>
  );
}

function InstallCard() {
  const { installed, canPrompt, ios, prompt } = useInstall();
  return (
    <div className="card stack">
      <h3>Install as an app</h3>
      <p className="muted small">The installed app opens from your home screen like any other app. After your first visit the site also works without internet, because your plan and logs are stored on this device.</p>
      {installed ? <p className="ok">You are using the installed app.</p>
        : canPrompt ? <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={prompt}>Install CAT Prep Hub</button>
        : ios ? <p className="small">On iPhone or iPad: open this site in Safari, tap the Share button, then <b>Add to Home Screen</b>.</p>
        : <p className="small">In Chrome or Edge, use the install icon at the right of the address bar, or the browser menu and then <b>Install</b>. On Android, open the menu and tap <b>Add to Home screen</b>.</p>}
    </div>
  );
}

function ReminderCard() {
  const [time, setTime] = usePref("reminderTime", "19:00");
  const [mins, setMins] = usePref("reminderMins", 60);
  const r = { date: todayIso(), time, minutes: mins, url: window.location.origin + import.meta.env.BASE_URL + "today" };
  const download = () => {
    const blob = new Blob([reminderIcs(r)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cat-prep-reminder.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="card stack">
      <h3>Daily study reminder</h3>
      <p className="muted small">Adds a repeating event to your calendar, so your phone reminds you every day. It links back to Today's timetable. Nothing is sent to us.</p>
      <div className="form">
        <label className="f">Time<input type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} /></label>
        <label className="f">Length
          <select value={mins} onChange={(e) => setMins(+e.target.value)}>{[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
        </label>
      </div>
      <div className="row">
        <a className="btn" href={googleCalendarUrl(r)} target="_blank" rel="noopener noreferrer">Add to Google Calendar ↗</a>
        <button type="button" className="btn ghost" onClick={download}>Download for Apple or Outlook (.ics)</button>
      </div>
    </div>
  );
}
