import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Meta, Section } from "@/components/kit";
import { disable, enable, getStatus, joinIdentity, subscribe, syncNow } from "@/lib/sync/runner";

/** "Synced 3 minutes ago", from a time in ms. */
export function ago(t: number | undefined, now = Date.now()) {
  if (!t) return "Not synced yet";
  const m = Math.floor((now - t) / 60_000);
  if (m < 1) return "Synced just now";
  if (m < 60) return `Synced ${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `Synced ${h} hour${h === 1 ? "" : "s"} ago` : `Synced on ${new Date(t).toLocaleDateString()}`;
}

/**
 * Sync between devices, for testing (B2): only in builds with the API on. Turning it on copies RC attempts to the
 * server; joining by id (development only, replaced by a link code in B4) brings them to a second browser.
 */
export default function SyncCard() {
  const s = useSyncExternalStore(subscribe, getStatus);
  const [joinId, setJoinId] = useState("");
  const [note, setNote] = useState("");
  const busy = s.phase === "syncing";
  const run = async (f: () => Promise<{ ok: boolean; message?: string }> | null) => {
    setNote("");
    const out = await f();
    if (out && !out.ok) setNote(out.message ?? "That did not work. Try again.");
  };

  return (
    <Section title="Sync between devices" description="Testing only. Copies your RC attempts to the 99ile server so another browser can get them. Your progress stays on this device either way.">
      <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">
        {s.phase === "off" ? (
          <div><Button variant="secondary" disabled={busy} onClick={() => run(enable)}>Turn on sync</Button></div>
        ) : (
          <>
            <p className="text-base" role="status">{busy ? "Syncing…" : s.phase === "error" ? s.message : ago(s.last)}</p>
            {s.identityId && <Meta>Progress id: <span className="select-all break-all">{s.identityId}</span></Meta>}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={busy} onClick={() => run(() => syncNow(true))}>Sync now</Button>
              <Button variant="ghost" disabled={busy} onClick={() => { disable(); setNote("Sync is off on this device. Your progress is still here."); }}>Turn off on this device</Button>
            </div>
          </>
        )}
        {import.meta.env.DEV && (
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (joinId.trim()) void run(() => joinIdentity(joinId)); }}>
            <Field label="Join another browser's progress" hint="Paste the progress id shown in the other browser. Development only.">
              <Input value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="0192f…" autoComplete="off" spellCheck={false} />
            </Field>
            <div><Button type="submit" variant="outline" disabled={busy || !joinId.trim()}>Join</Button></div>
          </form>
        )}
        {note && <p className="text-base" role="status">{note}</p>}
      </div>
    </Section>
  );
}
