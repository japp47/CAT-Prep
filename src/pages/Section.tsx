import { useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { CategoryBlock } from "../components/Resources";
import { Empty, Ext, LinkButton, Page, PageHeader, Section as Block, TextLink } from "../components/kit";
import { TypeGuide, TypeIndex } from "../components/TypeGuide";
import { BENCHMARKS, PASSAGE_SOURCES, TOPPERS } from "../data/stories";
import { dow, todayIso } from "../lib/date";
import { usePref } from "../lib/prefs";
import { RC_CATALOG } from "../practice/catalog.gen";
import { useStore } from "../lib/store";
import { SECTION_BY_ID } from "../sections";
import type { SectionDef, SectionId } from "../sections/types";
import { TYPE_GUIDES } from "../sections/varc/guides";
import { FORMAT, TAB_NOTES, TOPICS, VA_MIX, VTABS } from "../sections/varc/learn";
import { ROTATION } from "../sections/varc/resources";
import NotFound from "./NotFound";

const TR = "border-t align-top"; // taste-skill-ignore: rows of a real table

function Soon({ sec }: { sec: SectionDef }) {
  return (
    <Page width="read">
      <PageHeader title={sec.short} aside={<span className="rounded-md bg-secondary px-2 py-1 text-sm font-medium text-muted-foreground">Coming soon</span>}>{sec.name}. {sec.tagline}</PageHeader>
      <div className="flex flex-col gap-4 rounded-lg bg-card p-6">
        <p className="text-base">This section will get the same treatment as VARC: concepts, question banks, past papers, videos and its own phase plan with time settings.</p>
        <p className="text-base text-muted-foreground">You can already log {sec.short} mock scores in <TextLink to="/progress">Progress</TextLink> and {sec.short} mistakes in the <TextLink to="/errors">Error log</TextLink>.</p>
        <div className="flex flex-wrap gap-3"><LinkButton to="/varc">Go to VARC</LinkButton><LinkButton to="/roadmap" variant="secondary">See what's coming</LinkButton></div>
      </div>
    </Page>
  );
}

/** A plain data table: the one place lines are allowed. */
function Table({ head, rows, num = [] }: { head: string[]; rows: ReactNode[][]; num?: number[] }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-card">
      <table className="w-full text-left text-base">
        <thead><tr>{head.map((h, i) => <th key={h} className={cn("px-4 pt-4 pb-2 text-sm font-medium whitespace-nowrap text-muted-foreground", num.includes(i) && "text-right")}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, k) => <tr key={k} className={TR}>{r.map((c, i) => <td key={i} className={cn("px-4 py-3", num.includes(i) && "text-right tabular-nums")}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Topic({ t }: { t: (typeof TOPICS)[number] }) {
  const [open, setOpen] = useState(!!t.open);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:text-primary sm:px-6">
        <span className="text-heading font-semibold">{t.h}</span>
        <ChevronDown className={cn("size-5 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="measure flex flex-col gap-3 px-5 pb-6 text-reading sm:px-6">
        {t.p?.map((p, i) => <p key={i}>{p}</p>)}
        {t.ol && <ol className="flex list-decimal flex-col gap-2 pl-6">{t.ol.map((x, i) => <li key={i}>{x}</li>)}</ol>}
        {t.ul && <ul className="flex list-disc flex-col gap-2 pl-6">{t.ul.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Learn() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div className="flex flex-col gap-12">
      <Block title="The section">
        <dl className="grid gap-x-8 gap-y-5 rounded-lg bg-card p-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:p-6">
          {FORMAT.map(([k, v]) => <div key={k} className="contents"><dt className="text-base font-semibold">{k}</dt><dd className="measure text-base text-foreground/85">{v}</dd></div>)}
        </dl>
      </Block>
      <Block title="VA questions per slot, by year" description="From IMS, Cracku and Careers360 slot analyses. A few slot reports differ by one question.">
        <Table head={["Year", "Para summary", "Sentence insertion", "Odd sentence out", "Para jumble", "Note"]} num={[1, 2, 3, 4]}
          rows={VA_MIX.map((r) => [r.year, r.ps || "–", r.si || "–", r.oso || "–", r.pj || "–", <span key="n" className="whitespace-nowrap text-muted-foreground">{r.note ?? ""}</span>])} />
      </Block>
      <div className="flex flex-col gap-3">{TOPICS.map((t) => <Topic key={t.h} t={t} />)}</div>
      <Block title="A guide for each question type" description="Method, common traps, a worked example to try, and three links: a written guide, a video and a free question bank.">
        <TypeIndex guides={TYPE_GUIDES} onOpen={(id) => setOpen((o) => ({ ...o, [id]: true }))} />
        <div className="flex flex-col gap-3">
          {TYPE_GUIDES.map((g) => <TypeGuide key={g.id} g={g} open={!!open[g.id]} onOpenChange={(v) => setOpen((o) => ({ ...o, [g.id]: v }))} />)}
        </div>
      </Block>
    </div>
  );
}

function Rotation() {
  const today = dow(todayIso());
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <Block title="Weekly reading rotation" description="Today's row also appears in your timetable. Bharath's Reading List works on any day.">
      <div className="overflow-x-auto rounded-lg bg-card">
        <table className="w-full text-left text-base">
          <thead><tr>{["Day", "Sources", "Genre", "Write down"].map((h) => <th key={h} className="px-4 pt-4 pb-2 text-sm font-medium text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {order.map((g) => {
              const x = ROTATION[g];
              return (
                <tr key={g} className={cn(TR, g === today && "bg-highlight-soft")}>
                  <td className="px-4 py-3 font-semibold">{x.d}{g === today && <span className="block text-sm font-normal">Today</span>}</td>
                  <td className="px-4 py-3">{x.src.map(([n, u], i) => <span key={u}>{i > 0 && ", "}<Ext href={u} className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{n}</Ext></span>)}</td>
                  <td className="px-4 py-3">{x.genre}</td><td className="px-4 py-3">{x.out}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Block>
  );
}

function Toppers() {
  return (
    <div className="flex flex-col gap-12">
      <Block title="How 99+ scorers prepared">
        <Table head={["Name", "Result", "What they did"]} rows={TOPPERS.map((t) => [t.link ? <Ext key="l" href={t.link} className="font-semibold text-primary underline decoration-primary/30 underline-offset-4">{t.name}</Ext> : <b key="b">{t.name}</b>, t.result, t.what])} />
      </Block>
      <Block title="Score benchmarks" description="Scaled VARC scores from coaching institutes. They differ by 1 to 2 marks and shift each year.">
        <Table head={["Year", "99 percentile", "99.9 percentile", "Source"]} num={[1, 2]} rows={BENCHMARKS.map((b) => [b.year, b.p99, b.p999, b.src])} />
      </Block>
      <Block title="Where CAT passages come from" description="In 2025, Slot 1 was rated moderate to difficult and Slots 2 and 3 easy to moderate. Every slot had 2 each of para jumbles, para summary, sentence insertion and odd sentence out.">
        <Table head={["Year", "Topics and sources"]} rows={PASSAGE_SOURCES.map((p) => [p.year, p.text])} />
      </Block>
    </div>
  );
}

function Live({ sec }: { sec: SectionDef }) {
  const { state } = useStore();
  const [vtab, setVtab] = usePref("vtab", "learn");
  const [pri, setPri] = usePref<"all" | "must">("pri", "all");
  const [hideDone, setHideDone] = usePref("hideDone", false);
  const [q, setQ] = usePref("q:" + sec.id, "");
  const all = sec.resources ?? [], cats = sec.categories ?? [];
  const query = q.trim().toLowerCase();
  const mustAll = all.filter((r) => r.p === "must");
  const doneAll = all.filter((r) => state.ticks[r.id]).length;
  const mustDone = mustAll.filter((r) => state.ticks[r.id]).length;

  const filter = (catId: string, withQuery: boolean) => all.filter((x) =>
    x.c === catId && (pri !== "must" || x.p === "must") && !(hideDone && state.ticks[x.id]) &&
    (!withQuery || (x.n + " " + x.w + " " + x.t).toLowerCase().includes(query)));
  const list = (tab: string | null, emptyMsg: string) => {
    const blocks = cats.filter((c) => tab === null || c.tab === tab).map((c) => ({ c, items: filter(c.id, tab === null) })).filter((x) => x.items.length);
    return blocks.length ? blocks.map(({ c, items }) => <CategoryBlock key={c.id} cat={c} items={items} all={all} />) : <Empty>{emptyMsg}</Empty>;
  };
  const tabValid = VTABS.some((t) => t.id === vtab) ? vtab : "learn";

  const extra = (id: string) => (
    <>
      {id === "practice" && (
        <div className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
          <h3 className="text-heading font-semibold">Practice on this site</h3>
          <p className="measure text-base text-foreground/85">{RC_CATALOG.length} original RC sets with an explanation for every option, a daily VA drill, custom drills by type, a timed sectional, a redo queue for mistakes and a reading speed test. Your scores go straight into Progress.</p>
          <div className="flex flex-wrap gap-3"><LinkButton to="/practice">Open Practice</LinkButton><LinkButton to="/practice/va" variant="secondary">Today's VA drill</LinkButton></div>
        </div>
      )}
      {id === "read" && <Rotation />}
      {id === "toppers" && <Toppers />}
      {TAB_NOTES[id] && (
        <div className="measure flex flex-col gap-3 text-base text-foreground/85">
          {TAB_NOTES[id].map((p, i) => <p key={i}>{p}</p>)}
          {id === "vocab" && <p><TextLink to="/words">Open your flashcards</TextLink></p>}
        </div>
      )}
    </>
  );

  return (
    <Page>
      <PageHeader title={sec.short}>{sec.name}. You have done {doneAll} of {all.length} resources, and {mustDone} of {mustAll.length} must-dos.</PageHeader>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" placeholder={"Search all " + sec.short + " resources"} aria-label={"Search all " + sec.short + " resources"} autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} className="bg-card pl-10" />
        </div>
        <ToggleGroup type="single" value={pri} onValueChange={(v) => v && setPri(v as "all" | "must")} className="rounded-lg bg-secondary p-1" aria-label="Priority filter">
          <ToggleGroupItem value="all" className="h-9 rounded-md px-3.5 text-base data-[state=on]:bg-card data-[state=on]:font-semibold">All</ToggleGroupItem>
          <ToggleGroupItem value="must" className="h-9 rounded-md px-3.5 text-base data-[state=on]:bg-card data-[state=on]:font-semibold">Must-do only</ToggleGroupItem>
        </ToggleGroup>
        <label className="inline-flex items-center gap-2.5 text-base"><Checkbox checked={hideDone} onCheckedChange={(v) => setHideDone(v === true)} />Hide done</label>
      </div>

      {query ? (
        <div className="flex flex-col gap-10">{list(null, `Nothing matches "${q}". Try a site name or a question type.`)}</div>
      ) : (
        <Tabs value={tabValid} onValueChange={setVtab} className="gap-8">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-secondary">{VTABS.map((t) => <TabsTrigger key={t.id} value={t.id} className="px-3.5">{t.label}</TabsTrigger>)}</TabsList>
          </div>
          {VTABS.map((t) => (
            <TabsContent key={t.id} value={t.id} className="flex flex-col gap-12">
              {t.id === "learn" && <Learn />}
              {extra(t.id)}
              <div className="flex flex-col gap-10">{list(t.id, "Everything here is ticked or filtered out. Switch off Hide done or Must-do only.")}</div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </Page>
  );
}

export default function Section() {
  const { id } = useParams();
  const sec = SECTION_BY_ID[id as SectionId];
  if (!sec) return <NotFound />;
  return sec.status === "live" ? <Live sec={sec} /> : <Soon sec={sec} />;
}
