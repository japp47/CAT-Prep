import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/kit";
import { disable, enable, getStatus, makeRecoveryCode, subscribe, syncNow } from "@/lib/sync/runner";
import { Confirm } from "@/pages/practice/common";
import { ago } from "./sync/ago";

const JoinForm = lazy(() => import("./sync/JoinForm"));
const LinkPanel = lazy(() => import("./sync/LinkPanel"));
const DeviceList = lazy(() => import("./sync/DeviceList"));
const RecoveryPanel = lazy(() => import("./sync/RecoveryPanel"));

const Box = ({ children }: { children: React.ReactNode }) => <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">{children}</div>;
const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="text-heading font-semibold">{children}</h3>;

/**
 * Sync between devices (docs/feature.md F33, F47). Off: turn it on, or join another device's progress with a link
 * or recovery code. On: link a device (QR), the device list, a new recovery code, and turning it off here.
 */
export default function SyncCard({ onChange }: { onChange?: () => void }) {
  const s = useSyncExternalStore(subscribe, getStatus);
  // On only once this device has an identity: while turning on or linking, the server has not set its cookie yet.
  const on = s.phase !== "off" && !!s.identityId;
  const busy = s.phase === "syncing";
  const [view, setView] = useState<"none" | "join" | "link">("none");
  const [recovery, setRecovery] = useState("");
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState<"recovery" | "off" | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { onChange?.(); }, [on, onChange]);
  // Opened from search (/settings#sync): this card loads after the page, so it scrolls itself into view.
  useEffect(() => { if (location.hash === "#sync") document.getElementById("sync")?.scrollIntoView(); }, []);

  const turnOn = async () => {
    setNote("");
    const out = await enable();
    if (!out.ok) setNote(out.message);
    else if ("recoveryCode" in out && out.recoveryCode) setRecovery(out.recoveryCode);
  };
  const newRecovery = async () => {
    setAsk(null);
    const res = await makeRecoveryCode();
    if (res.ok && "data" in res) setRecovery(res.data.recoveryCode); else if (!res.ok) setNote(res.message);
  };

  return (
    <Section id="sync" className="scroll-mt-24" title="Sync between devices" description="Keeps your progress the same on your phone and laptop. No sign-up: a code links your devices. Your progress stays on each device either way.">
      <Suspense fallback={null}>
        {recovery && <RecoveryPanel code={recovery} onDone={() => setRecovery("")} />}
      </Suspense>
      <Box>
        {!on && view !== "join" && (
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" disabled={busy} onClick={turnOn}>{busy ? "Turning on…" : "Turn on sync"}</Button>
            <Button variant="outline" disabled={busy} onClick={() => setView("join")}>I use 99ile on another device</Button>
          </div>
        )}
        {!on && view === "join" && (
          <Suspense fallback={null}>
            <JoinForm onDone={() => { setView("none"); setNote("This device is linked. Your progress is syncing."); }} />
            <div><Button variant="ghost" onClick={() => setView("none")}>Cancel</Button></div>
          </Suspense>
        )}
        {on && (
          <>
            <p className="text-base" role="status">{busy ? s.message ?? "Syncing…" : s.phase === "error" ? s.message : ago(s.last)}</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={busy} onClick={() => { setNote(""); void syncNow(true)?.then(() => setRefresh((n) => n + 1)); }}>Sync now</Button>
              {view !== "link" && <Button variant="outline" onClick={() => setView("link")}>Link a device</Button>}
            </div>
            {view === "link" && <Suspense fallback={null}><LinkPanel onClose={() => { setView("none"); setRefresh((n) => n + 1); }} /></Suspense>}
          </>
        )}
        {note && <p className="text-base" role="status">{note}</p>}
      </Box>
      {on && (
        <Box>
          <Sub>Your devices</Sub>
          <Suspense fallback={null}><DeviceList refresh={refresh} /></Suspense>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={() => setAsk("recovery")}>Make a new recovery code</Button>
            <Button variant="ghost" onClick={() => setAsk("off")}>Turn off sync on this device</Button>
          </div>
        </Box>
      )}
      <Confirm open={ask === "recovery"} onOpenChange={(o) => !o && setAsk(null)} title="Make a new recovery code?" action="Make a new code" cancel="Cancel" onAction={newRecovery}>
        Your old recovery code stops working. Save the new one somewhere safe.
      </Confirm>
      <TurnOff open={ask === "off"} onClose={() => setAsk(null)} onDone={(text) => { setNote(text); setView("none"); }} />
    </Section>
  );
}

/** Turning sync off here: keep this device's copy (the usual choice) or clear it. Other devices keep everything. */
function TurnOff({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (note: string) => void }) {
  const [clear, setClear] = useState(false);
  return (
    <Confirm open={open} onOpenChange={(o) => !o && onClose()} title="Turn off sync on this device?" action="Turn off" cancel="Cancel" danger={clear}
      onAction={async () => { onClose(); await disable(clear); onDone(clear ? "Sync is off and this device is cleared. Your other devices keep everything." : "Sync is off on this device. Your progress is still here."); }}>
      <span className="flex flex-col gap-3">
        <span>Your other devices keep syncing and keep everything.</span>
        <label className="flex items-center gap-3"><input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} className="size-4 accent-primary" /> Also clear the progress on this device</label>
      </span>
    </Confirm>
  );
}
