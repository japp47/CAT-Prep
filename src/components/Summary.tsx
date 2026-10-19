import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { markPhrases, SUMMARY_CHECKS, summaryScore } from "../practice/summary";
import { SUMMARY_MAX_WORDS, TONES, words, type RcSummary } from "../practice/types";

// Summary writing (docs/plan.md, step 2e). Used after RC sets and, later, on Today's reading block and the journal.
// Only pages that load on demand import this file, so it stays out of the main script.

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The summary box, its word count and the tone chips. */
export function WriteCard({ text, onText, tone, onTone, autoFocus }: { text: string; onText: (t: string) => void; tone: string; onTone: (t: string) => void; autoFocus?: boolean }) {
  const countId = useId();
  const n = words(text);
  const over = n > SUMMARY_MAX_WORDS;
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold">Your summary</span>
        {/* 16px text, so phones do not zoom in when the box takes focus. */}
        <Textarea value={text} onChange={(e) => onText(e.target.value)} rows={4} autoFocus={autoFocus} aria-describedby={countId}
          className="min-h-32 bg-card text-base leading-relaxed" placeholder="What does the author claim, and how strongly?" />
        <span id={countId} aria-live="polite" className={cn("text-sm", over ? "font-medium text-warning" : "text-muted-foreground")}>
          {over ? `${n} words. Cut ${n - SUMMARY_MAX_WORDS} to reach ${SUMMARY_MAX_WORDS}.` : `${n} of ${SUMMARY_MAX_WORDS} words`}
        </span>
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold" id={countId + "t"}>The author's tone</span>
        <ToggleGroup type="single" value={tone} onValueChange={onTone} aria-labelledby={countId + "t"} className="flex flex-wrap justify-start gap-2">
          {TONES.map((t) => (
            <ToggleGroupItem key={t} value={t} className="min-h-11 flex-none rounded-md bg-secondary px-3.5 text-base data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/40">
              {cap(t)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

/** The model summary, with its claim and qualifier under the highlighter. */
export function ModelSummary({ s }: { s: RcSummary }) {
  return (
    <p className="text-base leading-relaxed">
      {markPhrases(s.model, [s.claim, s.qualifier]).map((p, i) => (p.hl ? <mark key={i} className="hl text-foreground">{p.t}</mark> : <span key={i}>{p.t}</span>))}
    </p>
  );
}

/** Yours above the model, each with its tone. */
export function SummaryPair({ text, tone, model }: { text: string; tone: string; model: RcSummary }) {
  const same = tone && tone === model.tone;
  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-1.5 rounded-lg bg-secondary p-4" aria-label="Your summary">
        <h3 className="text-sm font-medium text-muted-foreground">Yours</h3>
        <p className="text-base leading-relaxed">{text}</p>
        <p className="text-sm text-muted-foreground">Tone: {tone ? cap(tone) : "not chosen"}</p>
      </section>
      <section className="flex flex-col gap-1.5 rounded-lg bg-card p-4 ring-1 ring-inset ring-border" aria-label="Model summary">
        <h3 className="text-sm font-medium text-muted-foreground">Model</h3>
        <ModelSummary s={model} />
        <p className="text-sm text-muted-foreground">Tone: {cap(model.tone)}{tone && <span className={same ? "text-success" : ""}>{same ? ", the same as yours" : `, you chose ${tone}`}</span>}</p>
      </section>
    </div>
  );
}

/** The four self-checks. With a model, the claim and qualifier rows show the model's words to compare against. */
export function Checklist({ checks, onChange, model }: { checks: boolean[]; onChange: (c: boolean[]) => void; model?: RcSummary }) {
  const hint = (id: string, base: string) => (model && id === "claim" ? `Model: “${model.claim}”` : model && id === "qualifier" ? `Model: “${model.qualifier}”` : base);
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 text-base font-semibold">Check yours <span className="font-normal text-muted-foreground">({summaryScore(checks)} of {SUMMARY_CHECKS.length})</span></legend>
      {SUMMARY_CHECKS.map((c, i) => (
        <label key={c.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 hover:bg-muted/60">
          <Checkbox checked={checks[i]} onCheckedChange={(v) => onChange(checks.map((x, j) => (j === i ? v === true : x)))} className="mt-0.5" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-base">{c.label}</span>
            <span className="text-sm text-muted-foreground">{hint(c.id, c.hint)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
