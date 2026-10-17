import { useRef, useState } from "react";
import { useTheme, type Theme } from "../components/Layout";
import { todayIso } from "../lib/date";
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
    ["Error log entries", state.errors.length],
    ["Words", state.vocab.length],
    ["Resources ticked", Object.keys(state.ticks).length],
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
