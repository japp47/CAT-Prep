import { useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "../components/Layout";
import { Field, Meta, NativeSelect, Page, PageHeader, Section, Segmented, Stat } from "../components/kit";
import { todayIso } from "../lib/date";
import { googleCalendarUrl, reminderIcs } from "../lib/ics";
import { usePref } from "../lib/prefs";
import { useInstall } from "../lib/pwa";
import { useStore } from "../lib/store";
import { blankState, normalize } from "../lib/state";
import { Confirm } from "./practice/common";

const Panel = ({ children }: { children: React.ReactNode }) => <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">{children}</div>;

export default function Settings() {
  const { state, replace, saved } = useStore();
  const [theme, setTheme] = useTheme();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ask, setAsk] = useState<"restore" | "wipe" | null>(null);
  const pending = useRef<unknown>(null);
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
      pending.current = raw;
      setAsk("restore");
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
    <Page width="read">
      <PageHeader title="Settings and backup">Everything you enter is saved in this browser only. Nothing is sent to a server.</PageHeader>
      {!saved && <p className="rounded-lg bg-warning-soft px-5 py-4 text-base">This browser is blocking storage, so changes will be lost when you close the tab. Turn off private browsing or allow site data.</p>}

      <Section title="Appearance">
        <Segmented label="Theme" value={theme} onChange={setTheme} options={(["auto", "light", "dark"] as Theme[]).map((t) => [t, t === "auto" ? "Match device" : t[0].toUpperCase() + t.slice(1)] as [Theme, string])} />
      </Section>

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
        </Panel>
      </Section>

      <Section title="Start over" description="Deletes your time settings, ticks, logs and words from this browser. Download a backup first if you might want them back.">
        <div><Button variant="destructive" onClick={() => setAsk("wipe")}>Delete all my data</Button></div>
      </Section>

      <Confirm open={ask === "restore"} onOpenChange={(o) => !o && setAsk(null)} title="Restore this backup?" action="Replace my data" cancel="Cancel"
        onAction={() => { replace(normalize(pending.current)); setMsg({ ok: true, text: "Backup restored." }); setAsk(null); }}>
        Everything in this browser is replaced with the backup.
      </Confirm>
      <Confirm open={ask === "wipe"} onOpenChange={(o) => !o && setAsk(null)} title="Delete all your data?" action="Delete everything" cancel="Cancel" danger
        onAction={() => { replace(blankState()); setMsg({ ok: true, text: "All data cleared." }); setAsk(null); }}>
        This removes everything from this browser and cannot be undone.
      </Confirm>
    </Page>
  );
}

function InstallCard() {
  const { installed, canPrompt, ios, prompt } = useInstall();
  return (
    <Section title="Install as an app" description="The installed app opens from your home screen like any other app. After your first visit the site also works without internet, because your plan and logs are stored on this device.">
      {installed ? <p className="text-base text-success">You are using the installed app.</p>
        : canPrompt ? <div><Button onClick={prompt}>Install CAT Prep Hub</Button></div>
        : ios ? <p className="measure text-base">On iPhone or iPad: open this site in Safari, tap the Share button, then <b className="font-semibold">Add to Home Screen</b>.</p>
        : <p className="measure text-base">In Chrome or Edge, use the install icon at the right of the address bar, or the browser menu and then <b className="font-semibold">Install</b>. On Android, open the menu and tap <b className="font-semibold">Add to Home screen</b>.</p>}
    </Section>
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
    <Section title="Daily study reminder" description="Adds a repeating event to your calendar, so your phone reminds you every day. It links back to Today. Nothing is sent to us.">
      <Panel>
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <Field label="Time"><Input type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} /></Field>
          <Field label="Length"><NativeSelect value={mins} onChange={(e) => setMins(+e.target.value)}>{[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</NativeSelect></Field>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild><a href={googleCalendarUrl(r)} target="_blank" rel="noopener noreferrer">Add to Google Calendar<ArrowUpRight aria-hidden /></a></Button>
          <Button variant="secondary" onClick={download}>Download for Apple or Outlook</Button>
        </div>
        <Meta>The download is an .ics calendar file.</Meta>
      </Panel>
    </Section>
  );
}
