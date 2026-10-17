import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { uid } from "../lib/date";
import { VA_KIND } from "../practice/va/build";
import type { Trap, TypeGuide as Guide } from "../sections/varc/guides";
import { Ext } from "./kit";

const LETTERS = "ABCD";

function TrapItem({ t }: { t: Trap }) {
  return typeof t === "string" ? <li>{t}</li> : <li><b className="font-semibold">{t[0]}:</b> {t[1]}</li>;
}

/** A numbered sentence or a lettered option in a worked example. */
function Line({ mark, children }: { mark: string | number; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3">
      <span className="grid size-7 place-items-center rounded-full bg-card font-sans text-sm font-semibold">{mark}</span>
      <span className="text-reading">{children}</span>
    </li>
  );
}

function Example({ g }: { g: Guide }) {
  const x = g.example;
  const [shown, setShown] = useState(false);
  return (
    <section aria-label="Worked example" className="flex flex-col gap-4 rounded-lg bg-muted p-5">
      <h4 className="text-base font-semibold">Worked example</h4>
      <p className="text-base">{x.ask}</p>
      {x.insert && <p className="rounded-md bg-highlight-soft px-4 py-3 text-reading">{x.insert}</p>}
      {x.passage && <p className="measure text-reading">{x.passage}</p>}
      {x.items && <ol className="flex flex-col gap-2.5">{x.items.map((s, i) => <Line key={i} mark={i + 1}>{s}</Line>)}</ol>}
      {x.question && <p className="text-lg leading-snug font-semibold">{x.question}</p>}
      {x.options && <ol className="flex flex-col gap-2.5">{x.options.map((s, i) => <Line key={i} mark={LETTERS[i]}>{s}</Line>)}</ol>}
      {!shown ? <Button variant="outline" className="self-start" onClick={() => setShown(true)}>Try it, then show the answer</Button> : (
        <div className="flex flex-col gap-3">
          <p className="rounded-md bg-success-soft px-4 py-2.5 text-base font-semibold text-success">Answer: {x.answer}</p>
          <ul className="measure flex list-disc flex-col gap-1.5 pl-5 text-base">{x.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

function Drill({ g }: { g: Guide }) {
  const navigate = useNavigate();
  if (!g.drill) return null;
  if (g.drill === "rc") return <Button asChild variant="secondary"><Link to="/practice">Practice RC on this site</Link></Button>;
  const kind = g.drill;
  return <Button variant="secondary" onClick={() => navigate(`/practice/va?type=${kind}&n=6&seed=${uid()}`)}>Drill 6 {VA_KIND[kind].label.toLowerCase()} questions here</Button>;
}

/** One question type's guide, folded on the VARC Learn tab. */
export function TypeGuide({ g, open, onOpenChange }: { g: Guide; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} id={"type-" + g.id} className="scroll-mt-24 rounded-lg bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:text-primary sm:px-6">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-heading font-semibold">{g.h}</span>
          <span className="text-sm text-muted-foreground">{g.tag}</span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-7 px-5 pt-1 pb-6 sm:px-6">
        <p className="measure text-base">{g.what}</p>
        {g.kinds && <ul className="grid gap-x-8 gap-y-2 text-base md:grid-cols-2">{g.kinds.map(([k, v]) => <li key={k}><b className="font-semibold">{k}:</b> {v}</li>)}</ul>}
        <div className="grid gap-7 lg:grid-cols-2 lg:gap-10">
          <section>
            <h4 className="pb-3 text-base font-semibold">Method</h4>
            <ol className="flex flex-col gap-3 text-base [counter-reset:step]">
              {g.method.map((m, i) => (
                <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{i + 1}</span><span className="pt-0.5">{m}</span>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h4 className="pb-3 text-base font-semibold">Common traps</h4>
            <ul className="flex flex-col gap-3 text-base [&>li]:relative [&>li]:pl-5 [&>li]:before:absolute [&>li]:before:top-[0.6em] [&>li]:before:left-0.5 [&>li]:before:size-2 [&>li]:before:rounded-sm [&>li]:before:bg-danger">
              {g.traps.map((t, i) => <TrapItem key={i} t={t} />)}
            </ul>
          </section>
        </div>
        <Example g={g} />
        <section>
          <h4 className="pb-3 text-base font-semibold">Read and watch</h4>
          <ul className="flex flex-col gap-4">
            {g.links.map((l) => (
              <li key={l.k} className="grid gap-x-4 gap-y-1 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
                <span className="text-sm font-medium text-muted-foreground">{l.k}</span>
                <span className="flex flex-col gap-0.5">
                  <Ext href={l.u} className="text-base font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{l.n}</Ext>
                  {l.note && <span className="text-base text-muted-foreground">{l.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
        {g.drill && <div><Drill g={g} /></div>}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Chips that open and jump to a guide. */
export function TypeIndex({ guides, onOpen }: { guides: Guide[]; onOpen: (id: string) => void }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Question type guides">
      {guides.map((g) => (
        <Button key={g.id} variant="secondary" size="sm" className="rounded-full" onClick={() => {
          onOpen(g.id);
          requestAnimationFrame(() => document.getElementById("type-" + g.id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }}>{g.h}</Button>
      ))}
    </nav>
  );
}
