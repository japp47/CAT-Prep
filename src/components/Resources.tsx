import { ArrowUpRight, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useStore } from "../lib/store";
import type { Category, Resource } from "../sections/types";
import { Ext } from "./kit";

/** One link: tick it when done. Must-do links carry the highlighter; optional ones say so quietly. */
function Row({ x }: { x: Resource }) {
  const { state, update } = useStore();
  const done = !!state.ticks[x.id];
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3.5 gap-y-1 rounded-md px-3 py-3.5 hover:bg-muted/60 sm:px-4">
      <Checkbox checked={done} aria-label={"Done: " + x.n} className="mt-1"
        onCheckedChange={(v) => update((st) => { if (v === true) st.ticks[x.id] = 1; else delete st.ticks[x.id]; })} />
      <div className={cn("flex min-w-0 flex-col gap-1", done && "opacity-55")}>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <Ext href={x.u} className="group text-base font-semibold hover:text-primary">
            <span className={cn(x.p === "must" && !done && "hl")}>{x.n}</span>
            {x.find ? <Search className="ml-1 inline size-3.5 align-[-1px] text-muted-foreground" aria-label="opens a search" /> : <ArrowUpRight className="ml-0.5 inline size-4 align-[-2px] text-muted-foreground group-hover:text-primary" aria-hidden />}
          </Ext>
          {x.p === "must" && <span className="text-sm font-medium text-highlight-foreground dark:text-highlight">Must-do</span>}
          {x.p === "opt" && <span className="text-sm text-muted-foreground">Optional</span>}
        </div>
        <p className="measure text-base text-foreground/80">{x.w}</p>
        <p className="text-sm text-muted-foreground">{x.t}{x.alt && <> · <Ext href={x.alt.u} className="underline underline-offset-4 hover:text-foreground">{x.alt.l}</Ext></>}</p>
        {x.flag && <p className="text-sm text-danger">This link was not opened during research. Check it once.</p>}
      </div>
    </li>
  );
}

export function CategoryBlock({ cat, items, all }: { cat: Category; items: Resource[]; all: Resource[] }) {
  const { state } = useStore();
  const inCat = all.filter((r) => r.c === cat.id);
  const done = inCat.filter((r) => state.ticks[r.id]).length;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="text-heading font-semibold">{cat.n}</h3>
        <span className="text-sm text-muted-foreground tabular-nums">{done} of {inCat.length} done</span>
      </div>
      {cat.note && <p className="measure -mt-1 text-base text-muted-foreground">{cat.note}</p>}
      <ul className="flex flex-col rounded-lg bg-card p-1.5">{items.map((x) => <Row key={x.id} x={x} />)}</ul>
    </section>
  );
}
