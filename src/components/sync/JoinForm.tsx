import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/kit";
import { downloadBackup, hasProgress } from "@/lib/backup";
import { useStore } from "@/lib/store";
import { formatCode, LINK_LEN, normalizeCode, RECOVERY_LEN } from "@/lib/sync/codes";
import { joinWith } from "@/lib/sync/runner";
import { cn } from "@/lib/utils";

const LinkScan = lazy(() => import("./LinkScan"));

/**
 * "I use 99ile on another device": a link code (typed or scanned) or a recovery code joins this browser to that
 * progress. When this browser has progress of its own, the student chooses to add it (merged, nothing overwritten)
 * or to start fresh here, with a backup offered first (docs/feature.md F47).
 */
export default function JoinForm({ initial = "", onDone, submitVariant = "secondary" }: { initial?: string; onDone?: () => void; submitVariant?: "default" | "secondary" }) {
  const { state } = useStore();
  const [kind, setKind] = useState<"link" | "recover">("link");
  const [code, setCode] = useState(initial);
  const [scan, setScan] = useState(false);
  const [keep, setKeep] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const len = kind === "link" ? LINK_LEN : RECOVERY_LEN;
  const valid = normalizeCode(code, len);
  const mine = hasProgress(state);

  const submit = async (value = code) => {
    const c = normalizeCode(value, len);
    if (!c) { setError(kind === "link" ? "A link code has 8 letters and numbers, like ABCD-EFGH." : "A recovery code has 16 letters and numbers, like ABCD-EFGH-JKMN-PQRS."); return; }
    setBusy(true); setError("");
    const out = await joinWith(kind, c, keep || !mine);
    setBusy(false);
    if (!out.ok) setError(out.message);
    else onDone?.();
  };

  if (scan) {
    return (
      <Suspense fallback={<p className="text-base">Opening the camera…</p>}>
        <LinkScan onClose={() => setScan(false)} onCode={(c) => { setScan(false); setCode(formatCode(c)); void submit(c); }} />
      </Suspense>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      {kind === "link" ? (
        <p className="text-base">On your other device, open Settings, then Sync between devices, and tap Link a device. Scan the code it shows, or type it here.</p>
      ) : (
        <p className="text-base">Type the recovery code you saved when you turned sync on.</p>
      )}
      <Field label={kind === "link" ? "Link code" : "Recovery code"}>
        <Input value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} placeholder={kind === "link" ? "ABCD-EFGH" : "ABCD-EFGH-JKMN-PQRS"}
          autoComplete="off" autoCapitalize="characters" spellCheck={false} className="text-lg tracking-wider" aria-invalid={!!error} />
      </Field>
      {mine && (
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1 text-base font-medium">This device has progress of its own</legend>
          {([[true, "Add it to the other device's progress", "Both are kept. Nothing is overwritten."], [false, "Start fresh on this device", "This device shows only the other device's progress."]] as const).map(([v, t, d]) => (
            <label key={String(v)} className={cn("flex cursor-pointer gap-3 rounded-md p-3", keep === v ? "bg-accent" : "bg-muted/60")}>
              <input type="radio" name="keep" checked={keep === v} onChange={() => setKeep(v)} className="mt-1 size-4 accent-primary" />
              <span className="flex flex-col"><span className="text-base font-medium">{t}</span><span className="text-sm text-muted-foreground">{d}</span></span>
            </label>
          ))}
          {!keep && <div><Button type="button" variant="link" onClick={() => downloadBackup(state)}>Download a backup of this device first</Button></div>}
        </fieldset>
      )}
      {error && <p className="text-base text-danger" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant={submitVariant} disabled={busy || !valid}>{busy ? "Linking…" : kind === "link" ? "Link this device" : "Get my progress back"}</Button>
        {kind === "link" && <Button type="button" variant="outline" onClick={() => setScan(true)} disabled={busy}>Scan the code</Button>}
      </div>
      <div>
        <Button type="button" variant="link" onClick={() => { setKind(kind === "link" ? "recover" : "link"); setCode(""); setError(""); }}>
          {kind === "link" ? "Use a recovery code instead" : "Use a link code instead"}
        </Button>
      </div>
    </form>
  );
}
