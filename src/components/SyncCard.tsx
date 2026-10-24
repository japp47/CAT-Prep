import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/kit";
import { refreshAccount, disable, enable, exportServer, getStatus, makeRecoveryCode, startSignIn, subscribe, syncNow } from "@/lib/sync/runner";
import type { Account } from "@/lib/sync/client";
import { SIGNIN_ENABLED } from "@/lib/api";
import { SIGNIN_WORDS } from "@/lib/sync/words";
import { botToken } from "@/lib/turnstile";
import { Confirm } from "@/pages/practice/common";
import { ago } from "./sync/ago";

const JoinForm = lazy(() => import("./sync/JoinForm"));
const LinkPanel = lazy(() => import("./sync/LinkPanel"));
const DeviceList = lazy(() => import("./sync/DeviceList"));
const RecoveryPanel = lazy(() => import("./sync/RecoveryPanel"));
const SignInStep = lazy(() => import("./sync/SignInStep"));



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
  const [acct, setAcct] = useState<Account | null>(null);
  const [ticket, setTicket] = useState("");
  // Back from Google (?signin=): a word says how it went; a ticket means a question about this device's progress.
  const [sp, setSp] = useSearchParams();
  const signin = sp.get("signin");
  useEffect(() => {
    if (!signin) return;
    if (signin in SIGNIN_WORDS) { setNote(SIGNIN_WORDS[signin]); if (signin === "done") setRefresh((n) => n + 1); }
    else setTicket(signin);
    const next = new URLSearchParams(sp);
    next.delete("signin");
    setSp(next, { replace: true });
  }, [signin, sp, setSp]);
  useEffect(() => {
    if (!on || !SIGNIN_ENABLED) { setAcct(null); return; }
    let live = true;
    void refreshAccount().then((a) => { if (live) setAcct(a); });
    return () => { live = false; };
  }, [on, refresh, s.identityId]);
  useEffect(() => { onChange?.(); }, [on, onChange]);
  // Opened from search (/settings#sync): this card loads after the page, so it scrolls itself into view.
  useEffect(() => { if (location.hash === "#sync") document.getElementById("sync")?.scrollIntoView(); }, []);

  const bot = useRef<HTMLDivElement>(null);
  const [checking, setChecking] = useState(false);
  const turnOn = async () => {
    setNote("");
    setChecking(true);
    const token = await botToken(bot.current!).catch(() => null);
    setChecking(false);
    if (token === null) { setNote("The quick check did not load. Check your connection and try again."); return; }
    const out = await enable(token);
    if (!out.ok) setNote(out.message);
    else if ("recoveryCode" in out && out.recoveryCode) setRecovery(out.recoveryCode);
  };
  const download = async () => {
    setNote("");
    const res = await exportServer();
    if (!res.ok) { setNote(res.message); return; }
    if (!("data" in res)) return;
    const { exportToBackup, downloadJSON } = await import("@/lib/sync/exportFile");
    downloadJSON("99ile-server-copy.json", exportToBackup(res.data));
    setNote("Downloaded. It is also a backup: Restore from backup reads it.");
  };
  const newRecovery = async () => {
    setAsk(null);
    const res = await makeRecoveryCode();
    if (res.ok && "data" in res) setRecovery(res.data.recoveryCode); else if (!res.ok) setNote(res.message);
  };

  return (
    <Section id="sync" className="scroll-mt-24" title="Sync between devices" description={<>Keeps your progress the same on your phone and laptop. {SIGNIN_ENABLED ? "Sign in with Google, or link your devices with a code and no account." : "No sign-up: a code links your devices."} <Link to="/privacy" className="underline underline-offset-4">What sync stores</Link></>}>
      <Suspense fallback={null}>
        {recovery && <RecoveryPanel code={recovery} onDone={() => setRecovery("")} />}
      </Suspense>
      <Box>
        {ticket && (
          <Suspense fallback={null}>
            <SignInStep ticket={ticket} onDone={(text) => { setTicket(""); setNote(text); setRefresh((n) => n + 1); }} />
          </Suspense>
        )}
        {!on && !ticket && view !== "join" && (
          <>
          <p className="text-sm text-muted-foreground">Sync is for people 18 and over. Turning it on copies your progress to the 99ile server, as the <Link to="/privacy" className="underline underline-offset-4">privacy notice</Link> describes.</p>
          {SIGNIN_ENABLED && <p className="text-base">Sign in with Google to have your progress on every device, and back on a new phone without a code.</p>}
          <div className="flex flex-wrap gap-3">
            {SIGNIN_ENABLED && <Button variant="secondary" disabled={busy || checking} onClick={() => startSignIn()}>Sign in with Google</Button>}
            <Button variant={SIGNIN_ENABLED ? "outline" : "secondary"} disabled={busy || checking} onClick={turnOn}>{busy || checking ? "Turning on…" : SIGNIN_ENABLED ? "Sync without an account" : "Turn on sync"}</Button>
            <Button variant="outline" disabled={busy} onClick={() => setView("join")}>I use 99ile on another device</Button>
          </div>
          </>
        )}
        {!on && view === "join" && (
          <Suspense fallback={null}>
            <JoinForm onDone={() => { setView("none"); setNote("This device is linked. Your progress is syncing."); }} />
            <div><Button variant="ghost" onClick={() => setView("none")}>Cancel</Button></div>
          </Suspense>
        )}
        {on && (
          <>
            {acct && <p className="text-base">Signed in as <span className="font-semibold">{acct.email}</span></p>}
            <p className="text-base" role="status">{busy ? s.message ?? "Syncing…" : s.phase === "error" ? s.message : ago(s.last)}</p>
            {SIGNIN_ENABLED && !acct && !ticket && (
              <p className="text-base">Not signed in. <button type="button" className="cursor-pointer font-medium text-primary underline underline-offset-4" onClick={() => startSignIn()}>Sign in with Google</button> so a lost phone never means lost progress.</p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={busy} onClick={() => { setNote(""); void syncNow(true)?.then(() => setRefresh((n) => n + 1)); }}>Sync now</Button>
              {view !== "link" && <Button variant="outline" onClick={() => setView("link")}>Link a device</Button>}
            </div>
            {view === "link" && <Suspense fallback={null}><LinkPanel onClose={() => { setView("none"); setRefresh((n) => n + 1); }} /></Suspense>}
          </>
        )}
        <div ref={bot} />
        {note && <p className="text-base" role="status">{note}</p>}
      </Box>
      {on && (
        <Box>
          <Sub>Your devices</Sub>
          <Suspense fallback={null}><DeviceList refresh={refresh} /></Suspense>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={download}>Download what the server has</Button>
            <Button variant="outline" onClick={() => setAsk("recovery")}>Make a new recovery code</Button>
            <Button variant="ghost" onClick={() => setAsk("off")}>{acct ? "Sign out of this device" : "Turn off sync on this device"}</Button>
          </div>
        </Box>
      )}
      <Confirm open={ask === "recovery"} onOpenChange={(o) => !o && setAsk(null)} title="Make a new recovery code?" action="Make a new code" cancel="Cancel" onAction={newRecovery}>
        Your old recovery code stops working. Save the new one somewhere safe.
      </Confirm>
      <TurnOff open={ask === "off"} signedIn={!!acct} onClose={() => setAsk(null)} onDone={(text) => { setNote(text); setView("none"); }} />
    </Section>
  );
}

/** Turning sync off here: keep this device's copy (the usual choice) or clear it. Other devices keep everything. */
function TurnOff({ open, signedIn, onClose, onDone }: { open: boolean; signedIn: boolean; onClose: () => void; onDone: (note: string) => void }) {
  const [clear, setClear] = useState(false);
  return (
    <Confirm open={open} onOpenChange={(o) => !o && onClose()} title={signedIn ? "Sign out of this device?" : "Turn off sync on this device?"} action={signedIn ? "Sign out" : "Turn off"} cancel="Cancel" danger={clear}
      onAction={async () => { onClose(); await disable(clear); onDone(clear ? (signedIn ? "Signed out, and this device is cleared. Your account keeps everything." : "Sync is off and this device is cleared. Your other devices keep everything.") : (signedIn ? "Signed out of this device. Your progress is still here." : "Sync is off on this device. Your progress is still here.")); }}>
      <span className="flex flex-col gap-3">
        <span>{signedIn ? "Your account and your other devices keep everything. Sign in again any time." : "Your other devices keep syncing and keep everything."}</span>
        <label className="flex items-center gap-3"><input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} className="size-4 accent-primary" /> Also clear the progress on this device</label>
      </span>
    </Confirm>
  );
}
