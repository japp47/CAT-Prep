import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "../components/Layout";
import { Field, Page, PageHeader, Segmented, TextLink } from "../components/kit";
import { NativeSelect } from "../components/Select";
import { diffDays, todayIso } from "../lib/date";
import { BACKUP_DUE_DAYS, daysAgo, downloadBackup, hasProgress, holds } from "../lib/backup";
import { googleCalendarUrl, reminderIcs } from "../lib/ics";
import { MB, storedBytes, WARN_SIZE } from "../lib/keep";
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

/**
 * Settings and backup, redesigned 5 Nov 2026 (docs/design/info-pages.md). The backup is the page's job, so it comes
 * first as the one filled button, with what it holds in a sentence, when the last one was made (in the highlighter
 * once it is two weeks old) and how full this browser is. The settings sit as rows, a label on the left and its
 * control on the right: how the site looks and works beside what this device does. Start over is the last row.
 */
export default function Settings() {
  const { replace, transform, saved } = useStore();
  // Sync moved to the You page (D35). Old links, bookmarks and sign-ins that return here (?signin=) go on there.
  const loc = useLocation(), nav = useNavigate();
  useEffect(() => { if (API_ENABLED && loc.hash === "#sync") nav("/you" + loc.search + "#sync", { replace: true }); }, [loc, nav]);
  // While sync is on, restoring merges and deleting stays on this device (docs/architecture.md §6.3a).
  const syncOn = API_ENABLED && loadLedger().on;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ask, setAsk] = useState<"restore" | "wipe" | null>(null);
  const [everywhere, setEverywhere] = useState(false);
  const pending = useRef<unknown>(null);

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

  return (
    <Page>
      <PageHeader title="Settings and backup">
        {syncOn ? "Saved in this browser and synced to your other devices."
          : API_ENABLED ? "Saved in this browser. Nothing leaves it unless you turn on sync."
          : "Everything you enter is saved in this browser only. Nothing is sent to a server."}
      </PageHeader>
      {!saved && <p className="rounded-lg bg-warning-soft px-5 py-4 text-base">This browser is blocking storage, so changes will be lost when you close the tab. Turn off private browsing or allow site data.</p>}

      <div className="flex flex-col gap-3">
        <Backup syncOn={syncOn} msg={msg} onFile={importData} />
        <KeepHint />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="How it looks and works">
          <LooksRows />
        </Card>
        <Card title="On this device">
          <InstallRow />
          <ReminderRow />
        </Card>
      </div>

      <section aria-labelledby="start-over" className="flex flex-col gap-4 rounded-2xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-1">
          <h2 id="start-over" className="text-heading font-semibold">Start over</h2>
          <p className="measure text-base text-muted-foreground">Deletes your time settings, ticks, logs and words from this browser. Download a backup first if you might want them back.</p>
        </div>
        <Button variant="destructive" className="shrink-0 self-start sm:self-center" onClick={() => setAsk("wipe")}>Delete all my data</Button>
      </section>

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

/** The backup: what it holds, when the last one was made, download and restore; beside it, storage and sync. */
function Backup({ syncOn, msg, onFile }: { syncOn: boolean; msg: { ok: boolean; text: string } | null; onFile: (f: File) => void }) {
  const { state } = useStore();
  const [last, setLast] = usePref<string | null>("lastBackup", null);
  const file = useRef<HTMLInputElement>(null);
  const what = holds(state), progress = hasProgress(state);
  const ago = last ? diffDays(last, todayIso()) : null;
  // With sync on the server keeps a copy, so a backup file is extra safety, never overdue.
  const due = !syncOn && progress && (ago === null || ago > BACKUP_DUE_DAYS);
  const bytes = storedBytes(), full = Math.min(1, bytes / (5 * MB));
  return (
    <section aria-labelledby="backup" className="grid gap-x-10 gap-y-6 rounded-2xl bg-card p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 id="backup" className="text-heading font-semibold">Your backup</h2>
          <p className="measure text-read text-foreground/85">{what ? <>A backup holds {what}. Use it to move your progress to another device or browser, or to get it back.</> : "Nothing to back up yet. Once you practise or tick a block, a backup keeps it safe."}</p>
        </div>
        {progress && (syncOn
          ? <p className="w-fit rounded-lg bg-foreground/[0.05] px-3 py-1.5 text-base">Sync keeps a copy on the 99ile server{ago !== null ? <>; your last backup file was made <b className="font-semibold">{daysAgo(ago)}</b></> : ", so a backup file is only extra safety"}</p>
          : <p className={cn("w-fit rounded-lg px-3 py-1.5 text-base", due ? "bg-highlight-soft" : "bg-foreground/[0.05]")}>
            {ago === null ? <><b className="font-semibold">No backup yet</b> from this browser</> : <>Last backup <b className="font-semibold">{daysAgo(ago)}</b>{due ? ", time for a new one" : ""}</>}
          </p>)}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => { downloadBackup(state); setLast(todayIso()); }} disabled={!progress}>Download backup</Button>
          <Button variant="secondary" onClick={() => file.current?.click()}>Restore from backup</Button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </div>
        {msg && <p className={cn("text-base", msg.ok ? "text-success" : "text-danger")} role="status">{msg.text}</p>}
      </div>
      <div className="flex flex-col gap-5 lg:pt-1">
        <div className="flex flex-col gap-2">
          <span className="text-base font-semibold">Space in this browser</span>
          <span className="h-2 overflow-hidden rounded-full bg-foreground/[0.08]" aria-hidden>
            <span className={cn("block h-full rounded-full", bytes >= WARN_SIZE ? "bg-danger" : "bg-primary")} style={{ width: `${Math.max(2, full * 100)}%` }} />
          </span>
          <span className="text-sm text-muted-foreground">{bytes < MB / 10 ? "Under 0.1" : (bytes / MB).toFixed(1)} MB of the 5 MB a browser allows</span>
          {bytes >= WARN_SIZE && <p className="rounded-lg bg-warning-soft px-4 py-3 text-base">Nearly full. Download a backup now: once it is full, new progress cannot be saved.</p>}
        </div>
        {API_ENABLED && (
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-base font-semibold"><span className={cn("size-2 rounded-full", syncOn ? "bg-success" : "bg-muted-foreground/50")} aria-hidden />{syncOn ? "Sync is on" : "Sync is off"}</span>
            <span className="text-base text-muted-foreground">{syncOn ? "Your progress is also kept on the 99ile server. " : "Keep your progress on your phone and laptop. "}<TextLink to="/you#sync">{syncOn ? "Devices and account" : "Turn on sync"}</TextLink></span>
          </div>
        )}
      </div>
    </section>
  );
}

/** A group of setting rows on one tone card. */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-6 rounded-2xl bg-card p-5 sm:p-7">
      <h2 className="text-heading font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** One setting: what it is and what it does on the left, its control on the right (below on a phone). */
function Row({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {hint && <div className="text-base text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function LooksRows() {
  const [theme, setTheme] = useTheme();
  const [notSure, setNotSure] = usePref("notSure", true);
  return (
    <>
      <Row title="Theme" hint="Match device follows your phone or laptop.">
        <Segmented label="Theme" value={theme} onChange={setTheme} options={(["auto", "light", "dark"] as Theme[]).map((t) => [t, t === "auto" ? "Match device" : t[0].toUpperCase() + t.slice(1)] as [Theme, string])} />
      </Row>
      <Row title="The “Not sure” button" hint="A right answer you mark “Not sure” was a lucky guess, so it comes back once in your redo queue.">
        <Segmented label="Show the Not sure button" value={notSure ? "on" : "off"} onChange={(v) => setNotSure(v === "on")} options={[["on", "Show"], ["off", "Hide"]]} />
      </Row>
    </>
  );
}

function InstallRow() {
  const { installed, canPrompt, ios, browser, prompt } = useInstall();
  const hint = installed ? "You are using the installed app." : "Opens from your home screen like any app, and works without internet after your first visit.";
  if (ios && !installed) return <div id="install" className="scroll-mt-24"><Row title="Install as an app" hint={<IosSteps browser={browser} />}>{null}</Row></div>;
  return (
    <div id="install" className="scroll-mt-24">
      <Row title="Install as an app" hint={canPrompt || installed ? hint : <>{hint} In Chrome or Edge, use the install icon in the address bar; on Android, open the menu and tap <b className="font-semibold text-foreground">Add to Home screen</b>.</>}>
        {installed ? <span className="text-base font-semibold text-success">Installed</span> : canPrompt ? <Button variant="secondary" onClick={prompt}>Install 99ile</Button> : null}
      </Row>
    </div>
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
      <p>{API_ENABLED
        ? <>Each browser and the Home Screen app keep their own copy of your progress. To bring it into the app, turn on sync on the You page, then link the app with a code.</>
        : <>Stay in {name}: each browser keeps its own copy of your progress. The Home Screen app may also start empty, so download a backup above first, and if it opens empty, restore it in the app&rsquo;s Settings.</>}</p>
    </div>
  );
}

function ReminderRow() {
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
    <div className="flex flex-col gap-4">
      <Row title="Daily study reminder" hint="A repeating event in your calendar, so your phone reminds you every day. It links back to Today. Nothing is sent to us.">{null}</Row>
      <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
        <Field label="Time"><Input type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} /></Field>
        <Field label="Length"><NativeSelect value={mins} onChange={(e) => setMins(+e.target.value)}>{[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</NativeSelect></Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary"><a href={googleCalendarUrl(r)} target="_blank" rel="noopener noreferrer">Add to Google Calendar<span className="sr-only"> (opens in a new tab)</span></a></Button>
        <Button variant="secondary" onClick={download}>Apple or Outlook (.ics)</Button>
      </div>
    </div>
  );
}
