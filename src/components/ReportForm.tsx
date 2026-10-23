import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { reportUrl } from "../data/site";
import { api } from "../lib/api";

/** What can be wrong with a question; the keys are what the server stores (support.feedback.kind). */
const KINDS = { answer_key: "Wrong answer key", unclear: "Unclear question or option", typo: "Typo", other: "Something else" } as const;
type Kind = keyof typeof KINDS;
const NOTE_MAX = 1000;

/**
 * "Report a problem" sent to the 99ile inbox (docs/feature.md F39): what is wrong and an optional note. No name or
 * email is asked. If the server cannot be reached, the GitHub issue link is offered instead. Loaded on first open.
 */
export default function ReportForm({ what, item, onClose }: { what: string; item: string; onClose: () => void }) {
  const [kind, setKind] = useState<Kind | "">("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [msg, setMsg] = useState("");

  const send = async () => {
    if (!kind) { setMsg("Pick what is wrong first."); return; }
    setState("sending");
    setMsg("");
    const res = await api("/feedback", { page: location.pathname, itemId: item, kind, note: note.trim() });
    if (res.ok) { setState("sent"); return; }
    setState("failed");
    setMsg(res.message);
  };

  if (state === "sent") {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg bg-card p-4 sm:p-5" role="status">
        <p className="text-base">Thanks. We read every report and fix the question if it is wrong.</p>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-card p-4 sm:p-5">
      <p className="text-base font-semibold">What is wrong with this question?</p>
      <ToggleGroup type="single" value={kind} onValueChange={(v) => { setKind(v as Kind | ""); setMsg(""); }} aria-label="What is wrong" className="flex flex-wrap justify-start gap-2">
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <ToggleGroupItem key={k} value={k} className="min-h-11 flex-none rounded-md bg-secondary px-3.5 text-base data-[state=on]:bg-background data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/40">
            {KINDS[k]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <label className="flex flex-col gap-2 text-base">
        <span>Tell us more <span className="text-muted-foreground">(optional)</span></span>
        <Textarea value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="Option B also fits, because paragraph 2 says…" />
      </label>
      <p className="text-sm text-muted-foreground">Please do not add your name or email. With sync on, the report is linked to your progress, not to you.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" disabled={state === "sending"} onClick={send}>{state === "sending" ? "Sending…" : "Send report"}</Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
      {msg && (
        <p className="text-base" role="alert">
          {msg}{state === "failed" && <> You can also <a className="underline underline-offset-4" href={reportUrl(what, location.href)} target="_blank" rel="noopener noreferrer">report it on GitHub</a>.</>}
        </p>
      )}
    </div>
  );
}
