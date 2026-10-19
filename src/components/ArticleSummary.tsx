import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { uid } from "../lib/date";
import { readDraft, writeDraft } from "../lib/draft";
import type { AppState } from "../lib/state";
import { useStore } from "../lib/store";
import { recordArticleSummary, splitRef } from "../practice/summary";
import { SUMMARY_MAX_WORDS, words } from "../practice/types";
import { TYPE_GUIDES } from "../sections/varc/guides";
import { Field } from "./kit";
import { Checklist, WriteCard } from "./Summary";

// A summary of an article read outside the site (docs/plan.md, step 2e, place 2). There is no model to compare
// with, so the checklist is a self-check; step 3b lets the AI fill it in. Only on-demand pages import this file.

/** Laptops get a side sheet, so the article tab stays in view; phones get a sheet from the bottom. */
function useWide() {
  const q = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => typeof matchMedia === "function" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

const CHIP = "min-h-11 flex-none rounded-md bg-secondary px-3.5 text-base data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/40";
const METHOD = TYPE_GUIDES.find((g) => g.id === "summary-writing")?.method ?? [];

interface Draft { from: string; ref: string; text: string; tone: string }

export function ArticleSummarySheet({ open, onOpenChange, d, sources, saveLabel, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; d: string; sources: string[]; saveLabel: string;
  /** Runs inside the same update as the save, e.g. to tick the reading block. */
  onSave?: (st: AppState) => void;
}) {
  const wide = useWide();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={wide ? "right" : "bottom"} aria-describedby="article-sum-desc"
        className={cn("gap-0 overflow-y-auto overscroll-contain p-0", wide ? "w-full sm:max-w-lg" : "h-[92dvh] rounded-t-xl")}>
        {/* The body mounts when the sheet opens, so it reads the latest draft each time. */}
        {open && <Body d={d} sources={sources} saveLabel={saveLabel} onSave={onSave} close={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({ d, sources, saveLabel, onSave, close }: { d: string; sources: string[]; saveLabel: string; onSave?: (st: AppState) => void; close: () => void }) {
  const { update } = useStore();
  const navigate = useNavigate();
  const key = "art:" + d;
  const [saved] = useState(() => readDraft<Draft>(key));
  const [from, setFrom] = useState(saved?.from ?? "");
  const [ref, setRef] = useState(saved?.ref ?? "");
  const [text, setText] = useState(saved?.text ?? "");
  const [tone, setTone] = useState(saved?.tone ?? "");
  const [checks, setChecks] = useState([false, false, false, false]);
  const [id] = useState(uid);
  useEffect(() => { writeDraft(key, text.trim() || ref.trim() ? ({ from, ref, text, tone } satisfies Draft) : null); }, [key, from, ref, text, tone]);
  const n = words(text);
  const save = () => {
    update((st) => { if (!st.summaries.some((s) => s.id === id)) { recordArticleSummary(st, id, { text, tone, checks, from: from || undefined, ...splitRef(ref) }, d, Date.now()); onSave?.(st); } });
    writeDraft(key, null);
    close();
    toast("Saved to your reading journal.", { action: { label: "Open", onClick: () => navigate("/journal") } });
  };

  return (
    <>
      <div className="flex flex-col gap-6 px-5 pt-6 pb-6 sm:px-6">
        <div className="flex flex-col gap-1.5 pr-10">
          <SheetTitle className="text-heading font-semibold">Sum up the article</SheetTitle>
          <SheetDescription id="article-sum-desc" className="text-base text-muted-foreground">
            In {SUMMARY_MAX_WORDS} words or fewer, then check it yourself. It goes into your reading journal.
          </SheetDescription>
        </div>

        {sources.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-base font-semibold" id="art-from">Where from</span>
            <ToggleGroup type="single" value={from} onValueChange={setFrom} aria-labelledby="art-from" className="flex flex-wrap justify-start gap-2">
              {[...sources, "Somewhere else"].map((s) => <ToggleGroupItem key={s} value={s} className={CHIP}>{s}</ToggleGroupItem>)}
            </ToggleGroup>
          </div>
        )}
        <Field label="Title or link, if you like">
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="The article's title, or paste its link" autoComplete="off" className="text-base" />
        </Field>

        <WriteCard text={text} onText={setText} tone={tone} onTone={setTone} />

        {METHOD.length > 0 && (
          <Collapsible className="group rounded-lg bg-muted">
            <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-base font-medium">
              How to write one
              <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ol className="flex list-decimal flex-col gap-1.5 pr-4 pb-4 pl-9 text-base">{METHOD.map((m) => <li key={m}>{m}</li>)}</ol>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* The self-check appears once there is something to check. */}
        {n >= 5 && <Checklist checks={checks} onChange={setChecks} />}
        {saved?.text && <p className="text-sm text-muted-foreground">Your summary from earlier is back.</p>}
      </div>

      {/* Stays in view at the bottom of the sheet, above a phone's keyboard and home bar. */}
      <div className="sticky bottom-0 mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 bg-sidebar px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        <Button disabled={n < 5} onClick={save}>{saveLabel}</Button>
        {n < 5 && <span className="text-sm text-muted-foreground">Write at least 5 words.</span>}
      </div>
    </>
  );
}
