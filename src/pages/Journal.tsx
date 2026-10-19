import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleSummarySheet } from "../components/ArticleSummary";
import { Empty, Ext, LinkButton, Meta, Page, PageHeader, Segmented, useDeleteWithUndo } from "../components/kit";
import { SummaryPair } from "../components/Summary";
import { shortDate, todayIso } from "../lib/date";
import { usePref } from "../lib/prefs";
import type { SummaryEntry } from "../lib/state";
import { useStore } from "../lib/store";
import { RC_CATALOG } from "../practice/catalog.gen";
import { useContent } from "../practice/content";
import { summaryScore } from "../practice/summary";

type Filter = "all" | "article" | "rc";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Every summary the student has written, newest first: notes to reread in the last weeks before CAT (step 2e, place 3). */
export default function Journal() {
  const { state } = useStore();
  const [filter, setFilter] = usePref<Filter>("journalFilter", "all");
  const [adding, setAdding] = useState(false);
  const all = [...state.summaries].sort((a, b) => (a.d === b.d ? b.updatedAt - a.updatedAt : a.d < b.d ? 1 : -1));
  const shown = all.filter((s) => filter === "all" || s.src === filter);
  const avg = all.length ? (all.reduce((t, s) => t + summaryScore(s.checks), 0) / all.length).toFixed(1) : null;

  return (
    <Page width="read">
      <PageHeader title="Reading journal" aside={<Button variant="secondary" onClick={() => setAdding(true)}>Add an article summary</Button>}>
        Every summary you write, after an RC set or after the day's reading. Reread them in the last weeks before CAT.
      </PageHeader>

      {all.length > 0 ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <Segmented label="Show" value={filter} onChange={setFilter} options={[["all", "All"], ["article", "Articles"], ["rc", "RC sets"]]} />
            <Meta>{all.length} {all.length === 1 ? "summary" : "summaries"}, {avg} of 4 checks on average</Meta>
          </div>
          {shown.length
            ? <ul className="flex flex-col gap-3">{shown.map((s) => <Entry key={s.id} s={s} />)}</ul>
            : <Empty>Nothing here yet for this filter.</Empty>}
        </div>
      ) : (
        <Empty action={<LinkButton to="/practice">Go to Practice</LinkButton>}>
          No summaries yet. Write one after any RC set in Practice, or after the reading block on Today, and it appears here.
        </Empty>
      )}

      <ArticleSummarySheet open={adding} onOpenChange={setAdding} d={todayIso()} sources={[]} saveLabel="Save summary" />
    </Page>
  );
}

function Entry({ s }: { s: SummaryEntry }) {
  const remove = useDeleteWithUndo();
  const rc = s.src === "rc" ? RC_CATALOG.find((x) => x.id === s.set) : undefined;
  const source = s.src === "rc"
    ? <>RC set: {rc ? <Link to={`/practice/rc/${rc.id}`} className="underline underline-offset-4 hover:text-foreground">{rc.title}</Link> : "a set no longer in the library"}</>
    : <>{s.from || "Article"}{s.title ? `: ${s.title}` : ""}{s.url && <>. <Ext href={s.url} className="underline underline-offset-4 hover:text-foreground">Open the article</Ext></>}</>;
  return (
    <li className="flex flex-col gap-3 rounded-lg bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <Meta className="min-w-0">{shortDate(s.d)}, {source}</Meta>
        <Button variant="ghost" size="sm" className="-mt-1.5 -mr-2 shrink-0 text-muted-foreground hover:text-danger" aria-label={"Delete the summary from " + shortDate(s.d)} onClick={() => remove("summaries", s.id, "Summary")}>Delete</Button>
      </div>
      <p className="text-base leading-relaxed">{s.text}</p>
      <Meta>{s.tone ? cap(s.tone) + " tone, " : ""}{summaryScore(s.checks)} of 4 checks</Meta>
      {rc && <ModelToggle s={s} />}
    </li>
  );
}

/** The model needs the passages, which load on demand, so it is fetched only when opened. */
function ModelToggle({ s }: { s: SummaryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group">
      <CollapsibleTrigger className="flex min-h-11 items-center gap-1.5 text-base font-medium text-primary">
        {open ? "Hide the model" : "Compare with the model"}
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">{open && <Model s={s} />}</CollapsibleContent>
    </Collapsible>
  );
}

function Model({ s }: { s: SummaryEntry }) {
  const { content, failed } = useContent();
  if (failed) return <Meta>The model could not load. Check your connection and try again.</Meta>;
  if (!content) return <div role="status"><span className="sr-only">Loading…</span><Skeleton className="h-24" /></div>;
  const model = content.rcById(s.set ?? "")?.summary;
  return model ? <SummaryPair text={s.text} tone={s.tone} model={model} /> : <Meta>This set has no model summary.</Meta>;
}
