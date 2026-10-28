import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CategoryBlock } from "../components/Resources";
import { Empty, Ext, LinkButton, Page, PageHeader, Section as Block, TextLink } from "../components/kit";
import { GuideExplorer } from "../components/GuideExplorer";
import { LrGuideBody } from "../components/LrGuide";
import { LrThumb } from "../components/LrThumb";
import { TypeGuideBody } from "../components/TypeGuide";
import { LR_GUIDES } from "../sections/dilr/guides";
import { BENCHMARKS, PASSAGE_SOURCES, TOPPERS } from "../data/stories";
import { dow, todayIso } from "../lib/date";
import { usePref } from "../lib/prefs";
import { LR_CATALOG, RC_CATALOG } from "../practice/catalog.gen";
import { useStore } from "../lib/store";
import { SECTION_BY_ID } from "../sections";
import type { SectionDef, SectionId } from "../sections/types";
import { TYPE_GUIDES } from "../sections/varc/guides";
import * as VARC_LEARN from "../sections/varc/learn";
import { VA_MIX, type Topic as TopicData } from "../sections/varc/learn";
import * as DILR_LEARN from "../sections/dilr/learn";
import { useResources } from "../sections/useResources";
import { ROTATION } from "../sections/varc/links";
import NotFound from "./NotFound";

const TR = "border-t align-top"; // taste-skill-ignore: rows of a real table

/** What each section's page shows besides its resource list: tabs, notes under them, the format and the guides. */
interface PageData { tabs: { id: string; label: string }[]; notes: Record<string, string[]>; format: [string, string][]; topics: TopicData[] }
const PAGES: Partial<Record<SectionId, PageData>> = {
  varc: { tabs: VARC_LEARN.VTABS, notes: VARC_LEARN.TAB_NOTES, format: VARC_LEARN.FORMAT, topics: VARC_LEARN.TOPICS },
  dilr: { tabs: DILR_LEARN.TABS, notes: DILR_LEARN.TAB_NOTES, format: DILR_LEARN.FORMAT, topics: DILR_LEARN.TOPICS },
};

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
        <tbody>{rows.map((r, k) => <tr key={k} className={TR}>{r.map((c, i) => <td key={i} className={cn("px-4 py-3", num.includes(i) && "text-right")}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Topic({ t }: { t: TopicData }) {
  const [open, setOpen] = useState(!!t.open);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg bg-card">
      <h2>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:text-primary sm:px-6">
          <span className="text-heading font-semibold">{t.h}</span>
          <ChevronDown className={cn("size-5 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="measure flex flex-col gap-3 px-5 pb-6 text-reading sm:px-6">
        {t.p?.map((p, i) => <p key={i}>{p}</p>)}
        {t.ol && <ol className="flex list-decimal flex-col gap-2 pl-6">{t.ol.map((x, i) => <li key={i}>{x}</li>)}</ol>}
        {t.ul && <ul className="flex list-disc flex-col gap-2 pl-6">{t.ul.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Learn({ id, page, focus }: { id: SectionId; page: PageData; focus: string | null }) {
  return (
    <div className="flex flex-col gap-12">
      <Block title="The section">
        <dl className="grid gap-x-8 gap-y-5 rounded-lg bg-card p-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:p-6">
          {page.format.map(([k, v]) => <div key={k} className="contents"><dt className="text-base font-semibold">{k}</dt><dd className="measure text-base text-foreground/85">{v}</dd></div>)}
        </dl>
      </Block>
      {id === "varc" && (
        <Block title="VA questions per slot, by year" description="From IMS, Cracku and Careers360 slot analyses. A few slot reports differ by one question.">
          <Table head={["Year", "Para summary", "Sentence insertion", "Odd sentence out", "Para jumble", "Note"]} num={[1, 2, 3, 4]}
            rows={VA_MIX.map((r) => [r.year, r.ps || "–", r.si || "–", r.oso || "–", r.pj || "–", <span key="n" className="whitespace-nowrap text-muted-foreground">{r.note ?? ""}</span>])} />
        </Block>
      )}
      {id === "dilr" && <>
        <Block title="Logical reasoning set types" description="What each type looks like, and what to draw before you solve. CAT dresses the same types in new stories: trains, ratings, trade, chairs.">
          <Table head={["Type", "Looks like", "Draw"]} rows={DILR_LEARN.SET_TYPES.map(([t, l, d]) => [<b key="t" className="font-semibold">{t}</b>, l, d])} />
        </Block>
        <Block title="How often each topic came, 2017 to 2022" description="Percent of DILR topics per year, from InsideIIM's mix of coaching analyses. Pure DI is shrinking; mixed and number-based LR sets are growing.">
          <Table head={["Topic", ...DILR_LEARN.TOPIC_YEARS]} num={[1, 2, 3, 4, 5, 6]} rows={DILR_LEARN.TOPIC_SHARE.map((r) => [r.topic, ...r.y.map((v) => (v ? v + "%" : "–"))])} />
        </Block>
      </>}
      <div className="flex flex-col gap-3">{page.topics.map((t) => <Topic key={t.h} t={t} />)}</div>
      {id === "varc" && (
        <Block title="A guide for each question type" description="Method, common traps, a worked example to try, and three links: a written guide, a video and a free question bank.">
          <GuideExplorer label="VARC question types" prefKey="guide:varc" focus={focus}
            items={TYPE_GUIDES.map((g) => ({ id: g.id, h: g.h, tag: g.tag, body: () => <TypeGuideBody g={g} /> }))} />
        </Block>
      )}
      {id === "dilr" && (
        <Block title="A guide for each set type" description="What to draw, where to start, the method and the traps, then one of our own sets as the worked example, with its solution drawn step by step.">
          <GuideExplorer label="LR set types" prefKey="guide:dilr" focus={focus}
            items={LR_GUIDES.map((g) => ({ id: g.id, h: g.h, tag: g.tag, icon: <LrThumb type={g.id} className="size-9" />, body: () => <LrGuideBody g={g} /> }))} />
        </Block>
      )}
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
      <Block title="Score benchmarks" description="Scaled VARC scores. Each figure is the average of the tables that Cracku, IMS and iQuanta built from the results. The three differ by up to 2 marks at a given percentile, and the figure shifts each year.">
        <Table head={["Year", "99 percentile", "99.9 percentile", "Source"]} num={[1, 2]} rows={BENCHMARKS.map((b) => [b.year, b.p99, b.p999, b.src])} />
      </Block>
      <Block title="Where CAT passages come from" description="In 2025, Slot 1 was rated moderate to difficult and Slots 2 and 3 easy to moderate. Every slot had 2 each of para jumbles, para summary, sentence insertion and odd sentence out.">
        <Table head={["Year", "Topics and sources"]} rows={PASSAGE_SOURCES.map((p) => [p.year, p.text])} />
      </Block>
    </div>
  );
}

function Live({ sec, page }: { sec: SectionDef; page: PageData }) {
  const { state } = useStore();
  const [vtab, setVtab] = usePref("vtab", "learn");
  // ?guide=<type> opens the Learn tab on that guide (from a set's review, the practice list, search).
  const [sp] = useSearchParams();
  const focus = sp.get("guide");
  useEffect(() => { if (focus) setVtab("learn"); }, [focus, setVtab]);
  const [pri, setPri] = usePref<"all" | "must">("pri", "all");
  const [hideDone, setHideDone] = usePref("hideDone", false);
  const [q, setQ] = usePref("q:" + sec.id, "");
  const res = useResources(sec);
  const all = res?.resources ?? [], cats = res?.categories ?? [];
  // Filtering waits for typing to pause, so the field stays quick on a slow phone.
  const query = useDeferredValue(q).trim().toLowerCase();
  const mustAll = all.filter((r) => r.p === "must");
  const doneAll = all.filter((r) => state.ticks[r.id]).length;
  const mustDone = mustAll.filter((r) => state.ticks[r.id]).length;

  const filter = (catId: string, withQuery: boolean) => all.filter((x) =>
    x.c === catId && (pri !== "must" || x.p === "must") && !(hideDone && state.ticks[x.id]) &&
    (!withQuery || (x.n + " " + x.w + " " + x.t).toLowerCase().includes(query)));
  const list = (tab: string | null, emptyMsg: string) => {
    if (!res) return <div className="flex flex-col gap-3" role="status"><span className="sr-only">Loading resources…</span><Skeleton className="h-7 w-1/3" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
    const blocks = cats.filter((c) => tab === null || c.tab === tab).map((c) => ({ c, items: filter(c.id, tab === null) })).filter((x) => x.items.length);
    return blocks.length ? blocks.map(({ c, items }) => <CategoryBlock key={c.id} cat={c} items={items} all={all} />) : <Empty>{emptyMsg}</Empty>;
  };
  const tabValid = page.tabs.some((t) => t.id === vtab) ? vtab : "learn";

  const extra = (id: string) => (
    <>
      {id === "practice" && sec.id === "dilr" && (
        <div className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
          <h3 className="text-heading font-semibold">Practice on this site</h3>
          <p className="measure text-base text-foreground/85">{LR_CATALOG.length} original logical reasoning sets, each with a timer, a scratch pad, a step-by-step solution drawn as you go, and a two-minute post-mortem. More set types follow, then short drills on reading clues and choosing where to start.</p>
          <div className="flex flex-wrap gap-3"><LinkButton to="/dilr/practice">Open DILR practice</LinkButton></div>
        </div>
      )}
      {id === "practice" && sec.id === "varc" && (
        <div className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
          <h3 className="text-heading font-semibold">Practice on this site</h3>
          <p className="measure text-base text-foreground/85">{RC_CATALOG.length} original RC sets with an explanation for every option, a daily VA drill, custom drills by type, a timed sectional, a redo queue for mistakes and a reading speed test. Your scores go straight into Progress.</p>
          <div className="flex flex-wrap gap-3"><LinkButton to="/varc/practice">Open VARC practice</LinkButton><LinkButton to="/practice/va" variant="secondary">Today's VA drill</LinkButton></div>
        </div>
      )}
      {id === "read" && <Rotation />}
      {id === "toppers" && sec.id === "varc" && <Toppers />}
      {page.notes[id] && (
        <div className="measure flex flex-col gap-3 text-base text-foreground/85">
          {page.notes[id].map((p, i) => <p key={i}>{p}</p>)}
          {id === "vocab" && <p><TextLink to="/words">Open your flashcards</TextLink></p>}
        </div>
      )}
    </>
  );

  return (
    <Page>
      <PageHeader title={sec.short}>{sec.name}. You have done {doneAll} of {all.length} resources, and {mustDone} of {mustAll.length} must-dos.</PageHeader>
      {sec.status === "open" && (
        <p className="measure rounded-lg bg-card px-5 py-4 text-base">{sec.tagline} The first logical reasoning sets are under Practice; {sec.short} joins your timetable once there are enough of them.</p>
      )}

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
        <div className="flex flex-col gap-10">{list(null, `Nothing matches “${q}”. Try a site name or a question type.`)}</div>
      ) : (
        <Tabs value={tabValid} onValueChange={setVtab} className="gap-8">
          <div className="bleed-gutter overflow-x-auto px-gutter sm:mx-0 sm:px-0">
            <TabsList className="bg-secondary">{page.tabs.map((t) => <TabsTrigger key={t.id} value={t.id} className="px-3.5">{t.label}</TabsTrigger>)}</TabsList>
          </div>
          {page.tabs.map((t) => (
            <TabsContent key={t.id} value={t.id} className="flex flex-col gap-12">
              {t.id === "learn" && <Learn id={sec.id} page={page} focus={focus} />}
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
  const page = PAGES[sec.id];
  return sec.status !== "soon" && page ? <Live sec={sec} page={page} /> : <Soon sec={sec} />;
}
