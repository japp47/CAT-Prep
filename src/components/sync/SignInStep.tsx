import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadBackup, hasProgress } from "@/lib/backup";
import { useStore } from "@/lib/store";
import type { TicketInfo } from "@/lib/sync/client";
import { signInTicket, signInComplete, startSignIn } from "@/lib/sync/runner";
import { cn } from "@/lib/utils";

/**
 * The question after Google sends the student back with a ticket (docs/architecture.md §5.2): add this device's
 * progress to the account, or start from the account's progress, with a backup offered first. A device signed in to
 * another account is never merged into this one.
 */
export default function SignInStep({ ticket, onDone }: { ticket: string; onDone: (note: string) => void }) {
  const { state } = useStore();
  const [info, setInfo] = useState<TicketInfo | null>(null);
  const [error, setError] = useState("");
  const [keep, setKeep] = useState(true);
  const [busy, setBusy] = useState(false);
  const mine = hasProgress(state);

  useEffect(() => {
    let live = true;
    void signInTicket(ticket).then((res) => {
      if (!live) return;
      if (res.ok && "data" in res) setInfo(res.data); else if (!res.ok) setError(res.message);
    });
    return () => { live = false; };
  }, [ticket]);

  const other = info?.device === "other_account";
  const merge = keep && mine && !other;
  const finish = async () => {
    if (!info) return;
    setBusy(true); setError("");
    const out = await signInComplete(ticket, merge);
    setBusy(false);
    if (out.ok) onDone(`Signed in as ${info.email}. ${merge ? "This device's progress is being added to your account." : "Your account's progress is coming to this device."}`);
    else setError(out.message);
  };

  if (error && !info) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg bg-muted p-4 sm:p-5" role="alert">
        <p className="text-base">{error}</p>
        <Button variant="secondary" onClick={() => startSignIn()}>Sign in with Google again</Button>
      </div>
    );
  }
  if (!info) return <div className="flex flex-col gap-3" role="status"><span className="sr-only">Checking your sign-in…</span><Skeleton className="h-6 w-2/3" /><Skeleton className="h-20" /></div>;

  const question = other
    ? `This device is signed in to another account. Signing in as ${info.email} replaces it here; the other account keeps its progress.`
    : info.account === "existing" && info.accountHasProgress
      ? "Your account already has progress from another device."
      : "Your account is ready.";
  const choices: [boolean, string, string][] = info.account === "existing" && info.accountHasProgress
    ? [[true, "Add this device's progress to your account", "Both are kept. Nothing is overwritten."], [false, "Use only your account's progress here", "This device shows what your account has."]]
    : [[true, "Save this device's progress to your account", "It is then on every device you sign in on."], [false, "Start fresh", "Your account starts empty; this device is cleared."]];

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted p-4 sm:p-5">
      <p className="text-base"><span className="font-semibold">Signing in as {info.email}.</span> {question}</p>
      {mine && !other && (
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1 text-base font-medium">This device has progress</legend>
          {choices.map(([v, t, d]) => (
            <label key={String(v)} className={cn("flex cursor-pointer gap-3 rounded-md p-3", keep === v ? "bg-accent" : "bg-card")}>
              <input type="radio" name="signin-keep" checked={keep === v} onChange={() => setKeep(v)} className="mt-1 size-4 accent-primary" />
              <span className="flex flex-col"><span className="text-base font-medium">{t}</span><span className="text-sm text-muted-foreground">{d}</span></span>
            </label>
          ))}
        </fieldset>
      )}
      {mine && (!keep || other) && <div><Button type="button" variant="link" className="px-0" onClick={() => downloadBackup(state)}>Download a backup of this device first</Button></div>}
      {error && <p className="text-base text-danger" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={busy} onClick={finish}>{busy ? "Signing in…" : other ? "Switch to this account" : "Continue"}</Button>
        <Button variant="ghost" disabled={busy} onClick={() => onDone("Sign-in was not finished. Nothing changed on this device.")}>Cancel</Button>
      </div>
    </div>
  );
}
