import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "../components/Layout";
import { Field, Meta, Page, PageHeader, Section, Segmented, Stat } from "../components/kit";
import { NativeSelect } from "../components/Select";
import { todayIso } from "../lib/date";
import { downloadBackup } from "../lib/backup";
import { googleCalendarUrl, reminderIcs } from "../lib/ics";
import { MB, SHOW_SIZE, storedBytes, WARN_SIZE } from "../lib/keep";
import KeepHint from "../components/KeepHint";
import { usePref } from "../lib/prefs";
import { useInstall, type IosBrowser } from "../lib/pwa";
import { useStore } from "../lib/store";
import { blankState, normalize } from "../lib/state";
import { Confirm } from "./practice/common";
import { API_ENABLED } from "../lib/api";
import { loadLedger, saveLedger, timeOf } from "../lib/sync/ledger";
import { mergeBackup } from "../lib/sync/records";
import { deleteAll, disable } from "../lib/sync/runner";

// Sync is only in builds with the API on; the card and its code are never loaded otherwise, and every use of the
// ledger below sits behind API_ENABLED, so production builds drop it.
const SyncCard = API_ENABLED ? lazy(() => import("../components/SyncCard")) : null;

const Panel = ({ children }: { children: React.ReactNode }) => <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">{children}</div>;

export default function Settings() {
  const { state, replace, transform, saved } = useStore();
  const [, rerender] = useState(0);
  const refresh = useCallback(() => rerender((n) => n + 1), []);
  // While sync is on, restoring merges and deleting stays on this device (docs/architecture.md §6.3a).
  const syncOn = API_ENABLED && loadLedger().on;
  const [theme, setTheme] = useTheme();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ask, setAsk] = useState<"restore" | "wipe" | null>(null);
  const [everywhere, setEverywhere] = useState(false);
  const pending = useRef<unknown>(null);
  const file = useRef<HTMLInputElement>(null);

  const exportData = () => downloadBackup(state);
  const bytes = storedBytes();
  const importData = async (f: File) => {
    try {
      const raw = JSON.parse(await f.text());
      if (!raw || typeof raw !== "object" || !("settings" in raw || "days" in raw || "mocks" in raw)) throw new Error("not a backup");
      pending.current = raw;
      setAsk("restore");
    } catch {
      setMsg({ ok: false, text: "That file is not a 99ile backup." });
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
    <Page width="read">
      <PageHeader title="Settings and backup">{syncOn ? "Saved in this browser and synced to your other devices." : "Everything you enter is saved in this browser only. Nothing is sent to a server."}</PageHeader>
      {!saved && <p className="rounded-lg bg-warning-soft px-5 py-4 text-base">This browser is blocking storage, so changes will be lost when you close the tab. Turn off private browsing or allow site data.</p>}

      <Section title="Appearance">
        <Segmented label="Theme" value={theme} onChange={setTheme} options={(["auto", "light", "dark"] as Theme[]).map((t) => [t, t === "auto" ? "Match device" : t[0].toUpperCase() + t.slice(1)] as [Theme, string])} />
      </Section>

      <PracticeCard />

      <InstallCard />
      <ReminderCard />

      <Section title="Your data" description="Download a backup now and then, and use it to move your plan to another device or browser.">
        <Panel>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">{counts.map(([k, v]) => <Stat key={k} value={v} label={k} />)}</div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={exportData}>Download backup</Button>
            <Button variant="secondary" onClick={() => file.current?.click()}>Restore from backup</Button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ""; }} />
          </div>
          {msg && <p className={cn("text-base", msg.ok ? "text-success" : "text-danger")} role="status">{msg.text}</p>}
          {bytes >= WARN_SIZE
            ? <p className="rounded-lg bg-warning-soft px-5 py-4 text-base">Your progress uses {(bytes / MB).toFixed(1)} MB, close to the 5 MB this browser allows. Download a backup now: once it is full, new progress cannot be saved.</p>
            : bytes >= SHOW_SIZE && <Meta>Your progress uses {(bytes / MB).toFixed(1)} MB of the 5 MB this browser allows.</Meta>}
        </Panel>
        <KeepHint />
      </Section>

      {SyncCard && <Suspense fallback={null}><SyncCard onChange={refresh} /></Suspense>}

      <Section title="Start over" description="Deletes your time settings, ticks, logs and words from this browser. Download a backup first if you might want them back.">
        <div><Button variant="destructive" onClick={() => setAsk("wipe")}>Delete all my data</Button></div>
      </Section>

      {syncOn ? (
        <Confirm open={ask === "restore"} onOpenChange={(o) => !o && setAsk(null)} title="Add this backup to your progress?" action="Add to my progress" cancel="Cancel"
          onAction={() => { const raw = pending.current; transform((prev) => mergeBackup(prev, raw, timeOf(loadLedger()))); setMsg({ ok: true, text: "Backup added. Nothing was removed, and it syncs to your other devices." }); setAsk(null); }}>
          Sync is on, so the backup is added to what you have instead of replacing it. Nothing is removed on any device.
        </Confirm>
      ) : (
        <Confirm open={ask === "restore"} onOpenChange={(o) => !o && setAsk(null)} title="Restore this backup?" action="Replace my data" cancel="Cancel"
          onAction={() => { replace(normalize(pending.current)); setMsg({ ok: true, text: "Backup restored." }); setAsk(null); }}>
          Everything in this browser is replaced with the backup.
        </Confirm>
      )}
      <Confirm open={ask === "wipe"} onOpenChange={(o) => { if (!o) { setAsk(null); setEverywhere(false); } }} title="Delete all your data?" action={everywhere ? "Delete everywhere" : syncOn ? "Delete from this device" : "Delete everything"} cancel="Cancel" danger
        onAction={async () => {
          setAsk(null);
          if (syncOn && everywhere) {
            // The server first: this device is cleared only once the server has deleted its copy.
            const out = await deleteAll();
            setEverywhere(false);
            setMsg(out.ok ? { ok: true, text: "Deleted from the 99ile server and this device. Your other devices stop syncing and keep what they had; delete there too if you want." } : { ok: false, text: out.message });
            return;
          }
          // Sync turns off first, so the wipe is never pushed as deletions to the other devices.
          if (syncOn) { saveLedger({ ...loadLedger(), on: false }); void disable(); }
          replace(blankState());
          setMsg({ ok: true, text: syncOn ? "All data cleared on this device. Sync is off here; your other devices keep everything." : "All data cleared." });
        }}>
        {syncOn ? (
          <span className="flex flex-col gap-2">
            {([[false, "Only this device", "Sync turns off here. Your other devices and the server keep everything."], [true, "Everywhere", "Deletes your progress from the 99ile server and this device. Cannot be undone."]] as const).map(([v, t, d]) => (
              <label key={String(v)} className={cn("flex cursor-pointer gap-3 rounded-md p-3 text-left", everywhere === v ? "bg-accent" : "bg-muted/60")}>
                <input type="radio" name="where" checked={everywhere === v} onChange={() => setEverywhere(v)} className="mt-1 size-4 accent-primary" />
                <span className="flex flex-col"><span className="text-base font-medium text-foreground">{t}</span><span className="text-sm">{d}</span></span>
              </label>
            ))}
          </span>
        ) : "This removes everything from this browser and cannot be undone."}
      </Confirm>
    </Page>
  );
}

/** Practice options that change what the players show. */
function PracticeCard() {
  const [notSure, setNotSure] = usePref("notSure", true);
  return (
    <Section title="Practice" description="A right answer you marked “Not sure” was a lucky guess, so it comes back once in your redo queue.">
      <Segmented label="Show the Not sure button" value={notSure ? "on" : "off"} onChange={(v) => setNotSure(v === "on")} options={[["on", "Show “Not sure”"], ["off", "Hide it"]]} />
    </Section>
  );
}

function InstallCard() {
  const { installed, canPrompt, ios, browser, prompt } = useInstall();
  return (
    <Section id="install" className="scroll-mt-24" title="Install as an app" description="The installed app opens from your home screen like any other app. After your first visit the site also works without internet, because your plan and logs are stored on this device.">
      {installed ? <p className="text-base text-success">You are using the installed app.</p>
        : canPrompt ? <div><Button onClick={prompt}>Install 99ile</Button></div>
        : ios ? <IosSteps browser={browser} />
        : <p className="measure text-base">In Chrome or Edge, use the install icon at the right of the address bar, or the browser menu and then <b className="font-semibold">Install</b>. On Android, open the menu and tap <b className="font-semibold">Add to Home screen</b>.</p>}
    </Section>
  );
}

/**
 * Add to Home Screen steps for the browser in use. Each iPhone browser keeps its own copy of the progress, so the
 * steps never send the student to another browser, and the Home Screen app may start empty (docs/research/step-3.md, 16).
 */
function IosSteps({ browser }: { browser: IosBrowser | null }) {
  const name = browser === "chrome" ? "Chrome" : browser === "edge" ? "Edge" : browser === "firefox" ? "Firefox" : browser === "other" ? "this browser" : "Safari";
  const where = browser === "safari" || browser === null
    ? <>tap the Share button (on iPad it is at the top right; if you don&rsquo;t see it, tap <b className="font-semibold">⋯</b> first)</>
    : browser === "chrome" ? <>tap the Share button to the right of the address bar</>
    : <>open the menu and tap Share</>;
  return (
    <div className="measure flex flex-col gap-2 text-base">
      <p>{browser === "other" ? "In this browser" : `In ${name}`} on iPhone or iPad: {where}, then <b className="font-semibold">Add to Home Screen</b>.</p>
      <p>Stay in {name}: each browser keeps its own copy of your progress. The Home Screen app may also start empty, so download a backup below first, and if it opens empty, restore it in the app&rsquo;s Settings.</p>
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
    a.download = "99ile-reminder.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <Section title="Daily study reminder" description="Adds a repeating event to your calendar, so your phone reminds you every day. It links back to Today. Nothing is sent to us.">
      <Panel>
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <Field label="Time"><Input type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} /></Field>
          <Field label="Length"><NativeSelect value={mins} onChange={(e) => setMins(+e.target.value)}>{[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</NativeSelect></Field>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary"><a href={googleCalendarUrl(r)} target="_blank" rel="noopener noreferrer">Add to Google Calendar<span className="sr-only"> (opens in a new tab)</span></a></Button>
          <Button variant="secondary" onClick={download}>Download for Apple or Outlook</Button>
        </div>
        <Meta>The download is an .ics calendar file.</Meta>
      </Panel>
    </Section>
  );
}
