import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Empty, LinkButton, Page, PageHeader, Section, Segmented, TextLink } from "../components/kit";
import { todayIso } from "../lib/date";
import { useGsap } from "../lib/motion";
import { usePref } from "../lib/prefs";
import { useStore } from "../lib/store";
import { SECTIONS, sectionByLabel } from "../sections";
import { arenaTrend } from "../practice/arena";
import { useContent } from "../practice/content";
import { readiness, tracked, trend } from "../practice/recs";
import { JUDGE_AT, skillMap, startHere, STATE_LABEL, stateCounts, weeklyAccuracy, type Skill, type SkillFamily, type SkillState } from "../practice/skills";
import type { RcSet } from "../practice/types";
import { Log } from "./tracker/Log";
import { Mocks } from "./tracker/Mocks";
import { Report, WhereToFocus } from "./tracker/Report";
import { Fixing } from "./tracker/Fixing";

type Tab = "report" | "mocks" | "log";
const TAB = "h-auto min-h-10 flex-auto whitespace-normal px-2.5 leading-tight sm:px-3.5";

/**
 * Progress, version 2 (D63, docs/design/progress-v2.md): the three answers with one chart, the skill map (F89) and
 * where to focus; every list behind them under "All the numbers", one tap away.
 */
export default function Progress() {
  const [sp] = useSearchParams();
  // A link such as /progress?sec=DILR (from an LR drill) opens on that section.
  const [sec, setSec] = useState(() => SECTIONS.find((s) => s.short === sp.get("sec"))?.short ?? "VARC");
  const [tab, setTab] = usePref<Tab>("progTab", "report");
  const [numbers, setNumbers] = usePref("progNumbers", false);
  // A link such as /progress?tab=log (from History) opens that tab once, and the numbers with it.
  const asked = sp.get("tab");
  useEffect(() => { if (asked === "report" || asked === "mocks" || asked === "log") { setTab(asked); setNumbers(true); } }, [asked, setTab, setNumbers]);
  const def = sectionByLabel(sec);
  const mapped = def.short === "VARC" || def.short === "DILR";

  return (
    <Page>
      <PageHeader title="Progress" aside={<Segmented label="Section" value={sec} onChange={setSec} options={SECTIONS.map((s) => s.short)} />}>
        Where you stand, skill by skill, and what to do next.
      </PageHeader>

      <Answers key={"a" + sec} sec={def.short} />
      {mapped ? <MapSection key={"m" + sec} sec={def.short as "VARC" | "DILR"} /> : (
        <Empty action={<LinkButton to="/plan" variant="secondary">See the plan</LinkButton>}>Quant practice arrives in January, and its skills join the map then. You can already log Quant results by hand under All the numbers.</Empty>
      )}
      {def.short === "VARC" && <WhereToFocus sec="VARC" />}
      {def.short === "VARC" && <Fixing />}

      <section className="flex flex-col gap-6" aria-labelledby="numbers">
        <button type="button" id="numbers" onClick={() => setNumbers(!numbers)} aria-expanded={numbers} aria-controls="numbers-body"
          className="group flex w-full items-center justify-between gap-4 rounded-lg bg-card px-5 py-4 text-left hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-6">
          <span className="flex flex-col">
            <span className="text-heading font-semibold">All the numbers</span>
            <span className="text-base text-muted-foreground">Accuracy lists, mocks and target, and the log where you add results by hand.</span>
          </span>
          <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none", numbers && "rotate-180")} aria-hidden />
        </button>
        {numbers && (
          <Tabs id="numbers-body" value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-8">
            {/* Full width on a phone, each tab as wide as its label; a label wraps only on the narrowest screens. */}
            <TabsList className="flex w-full bg-secondary sm:w-fit">
              <TabsTrigger value="report" className={TAB}>Report card</TabsTrigger>
              <TabsTrigger value="mocks" className={TAB}>Mocks and target</TabsTrigger>
              <TabsTrigger value="log" className={TAB}>Log</TabsTrigger>
            </TabsList>
            <TabsContent value="report"><Report sec={def.short} /></TabsContent>
            <TabsContent value="mocks"><Mocks sec={def.short} /></TabsContent>
            <TabsContent value="log"><Log sec={def.short} /></TabsContent>
          </Tabs>
        )}
      </section>
    </Page>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The three answers (F44)

interface Answer { q: string; big?: string; a: string; link?: [string, string]; chart?: boolean }

function Answers({ sec }: { sec: string }) {
  const { state } = useStore();
  const today = todayIso();
  const t = trend(state, today, sec);
  const weeks = weeklyAccuracy(state.practice, sec, today);
  const fixing = tracked(state);
  const counts = { fixed: 0, better: 0, early: 0, notyet: 0 };
  fixing.forEach((m) => { if (m.state in counts) counts[m.state as keyof typeof counts]++; });
  const parts = [counts.fixed && `${counts.fixed} fixed`, counts.better && `${counts.better} getting better`, counts.notyet && `${counts.notyet} not yet`, counts.early && `${counts.early} too early to tell`].filter(Boolean);
  const r = readiness(state, sec);
  const arena = sec === "DILR" ? arenaTrend(state.arenaRounds, state.lrAttempts) : undefined;

  const improving: Answer = {
    q: "Are you improving?", chart: true,
    big: t.now != null ? `${t.now}%` : undefined,
    a: t.now != null && t.before != null
      ? `Accuracy over the last two weeks, ${t.now === t.before ? "the same as" : `${Math.abs(t.now - t.before)} points ${t.now > t.before ? "up on" : "down on"}`} the two weeks before.`
      : `A trend needs 20 questions in each of two fortnights. You have ${t.n} in the last two weeks.`,
    link: t.now == null ? [sec === "DILR" ? "/dilr/practice" : "/practice", "Practise"] : undefined,
  };
  const second: Answer = arena
    ? { q: "Are you picking well?", big: `${arena.pct}%`, a: `Over ${arena.rounds} Arena rounds, your earlier picks earned at least as much a minute as your later ones.`, link: ["/practice/arena", "Play a round"] }
    : sec === "DILR"
      ? { q: "Are you picking well?", a: "Three rounds of the Set Selection Arena show how well you choose which sets to do first.", link: ["/practice/arena", "Play a round"] }
      : { q: "Are your weak spots getting fixed?", big: parts.length ? String(counts.fixed + counts.better) : undefined, a: parts.length ? parts.join(", ") + "." : "Nothing picked yet. A mock review or the weekly review picks a weak spot to work on.", link: parts.length ? ["#fixing", "See them"] : ["/review", "Weekly review"] };
  const ready: Answer = {
    q: "Are you exam ready?",
    big: r ? String(r.avg) : undefined,
    // Only VARC has a target band so far (the percentile tables are VARC's); other sections show the average alone.
    a: r ? `Right answers on average in your last ${r.count === 1 ? "result" : `${r.count} results`}${sec === "VARC" ? `; your target needs ${r.band[0]} to ${r.band[1]}` : ""}.` : "Take a timed section or log a mock to see how practice holds up under time.",
    link: r ? undefined : [sec === "VARC" ? "/practice/sectional" : "/progress?tab=mocks", sec === "VARC" ? "Take a sectional" : "Log a mock"],
  };

  return (
    <ul className="grid gap-px overflow-hidden rounded-lg bg-background md:grid-cols-3">
      {[improving, second, ready].map((c) => (
        <li key={c.q} className="flex flex-col gap-3 bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">{c.q}</h2>
          {c.big && <p className="text-[2.5rem] leading-none font-bold tracking-tight tabular-nums">{c.big}</p>}
          {c.chart && <WeekBars weeks={weeks} />}
          <p className="text-base text-foreground/85">{c.a}</p>
          {c.link && (c.link[0].startsWith("#")
            ? <a href={c.link[0]} className="mt-auto w-fit pt-1 font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">{c.link[1]}</a>
            : <TextLink to={c.link[0]} className="mt-auto w-fit pt-1">{c.link[1]}</TextLink>)}
        </li>
      ))}
    </ul>
  );
}

/** Six weeks of accuracy as six bars; a week with too few questions is a short empty stub, said so in its label. The bars rise once. */
function WeekBars({ weeks }: { weeks: ReturnType<typeof weeklyAccuracy> }) {
  const box = useRef<HTMLDivElement>(null);
  useGsap(box, (gsap, el) => { gsap.from(el.querySelectorAll("[data-bar]"), { scaleY: 0, transformOrigin: "bottom", duration: 0.6, stagger: 0.07, ease: "power3.out" }); }, []);
  return (
    <div className="flex flex-col gap-1.5">
      <div ref={box} className="flex h-16 items-end gap-1.5" role="img" aria-label={"Weekly accuracy, oldest first: " + weeks.map((w) => (w.pct == null ? "too few questions" : w.pct + "%")).join(", ")}>
        {weeks.map((w, i) => (
          <span key={w.from} data-bar title={w.pct == null ? `${w.a} questions, too few to judge` : `${w.pct}% of ${w.a}`}
            className={cn("flex-1 rounded-sm", w.pct == null ? "bg-secondary" : i === weeks.length - 1 ? "bg-primary" : "bg-primary/45")}
            style={{ height: w.pct == null ? "12%" : `${Math.max(8, w.pct)}%` }} />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">Each week's accuracy, last six weeks</span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The skill map (F89)

/** VARC's RC kinds need the passages of the sets tried, and only those; everything else is ready at once. */
function MapSection({ sec }: { sec: "VARC" | "DILR" }) {
  const { state } = useStore();
  if (sec === "VARC" && state.rcAttempts.length) return <MapWithPassages />;
  return <SkillMap sec={sec} rcById={null} />;
}

function MapWithPassages() {
  const { state } = useStore();
  const ids = useMemo(() => [...new Set(state.rcAttempts.map((a) => a.set))], [state.rcAttempts]);
  const { content } = useContent({ rc: ids });
  return <SkillMap sec="VARC" rcById={content ? content.rcById : null} />;
}

const TONE: Record<SkillState, string> = {
  new: "bg-card text-muted-foreground hover:bg-accent",
  learning: "bg-card hover:bg-accent",
  weak: "bg-danger-soft hover:bg-danger-soft/70",
  steady: "bg-accent hover:bg-accent/70",
  strong: "bg-success-soft hover:bg-success-soft/70",
};
const WORD: Record<SkillState, string> = { new: "", learning: "", weak: "text-danger", steady: "text-primary", strong: "text-success" };

function SkillMap({ sec, rcById }: { sec: "VARC" | "DILR"; rcById: ((id: string) => RcSet | undefined) | null }) {
  const { state } = useStore();
  const fams = useMemo(() => skillMap(state, sec, todayIso(), rcById), [state, sec, rcById]);
  const n = stateCounts(fams);
  const start = startHere(fams);
  const box = useRef<HTMLDivElement>(null);
  // The tiles settle row by row once, after the week bars (one arrival sequence for the page).
  useGsap(box, (gsap, el) => { gsap.from(el.querySelectorAll("[data-tile]"), { opacity: 0, y: 10, duration: 0.4, stagger: 0.025, delay: 0.35, ease: "power2.out" }); }, [fams.length]);
  const summary = (["strong", "steady", "weak", "learning"] as const).filter((k) => n[k]).map((k) => `${n[k]} ${STATE_LABEL[k].toLowerCase()}`).join(", ");

  return (
    <Section title="Your skill map" description={(summary ? summary + ". " : "") + `A skill gets a verdict after ${JUDGE_AT} answers; strong means 80% or more, with no old miss still waiting in your redo queue.`}>
      <div ref={box} className="flex flex-col gap-6">
        {fams.map((f) => <Family key={f.id} f={f} />)}
        {sec === "VARC" && !rcById && state.rcAttempts.length > 0 && <p className="text-base text-muted-foreground" role="status">Loading your RC question kinds…</p>}
      </div>
      {start ? (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="measure text-base"><b className="font-semibold">Start here: {start.label}.</b> {start.c} of {start.a} right ({start.pct}%), your weakest skill with enough answers to judge.</p>
          <LinkButton to={start.to}>Work on {start.label}</LinkButton>
        </div>
      ) : (
        <p className="measure text-base text-muted-foreground">No skill has {JUDGE_AT} answers yet, so none is judged. Keep practising and the weakest one will be named here.</p>
      )}
    </Section>
  );
}

function Family({ f }: { f: SkillFamily }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">{f.title}</h3>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {f.skills.map((s) => <li key={s.key} data-tile><Tile s={s} /></li>)}
      </ul>
    </div>
  );
}

function Tile({ s }: { s: Skill }) {
  const detail = s.state === "new" ? "Not started"
    : s.state === "learning" ? `${s.a} of ${JUDGE_AT} answers to judge`
    : `${s.pct}%, ${s.a} answers${s.state === "steady" && s.waiting && s.pct! >= 80 ? ". An old miss waits in redo" : ""}`;
  return (
    <Link to={s.to} aria-label={`${s.label}: ${s.state === "new" || s.state === "learning" ? detail : `${STATE_LABEL[s.state]}, ${detail}`}`}
      className={cn("flex h-full min-h-24 flex-col justify-between gap-2 rounded-lg p-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none", TONE[s.state])}>
      <span className="text-base leading-snug font-semibold">{s.label}</span>
      <span className="flex flex-col gap-1">
        {s.state !== "new" && s.state !== "learning" && <span className={cn("text-sm font-semibold", WORD[s.state])}>{STATE_LABEL[s.state]}</span>}
        <span className="text-sm text-muted-foreground">{detail}</span>
        {s.state === "learning" && (
          <span className="flex gap-0.5" aria-hidden>
            {Array.from({ length: JUDGE_AT }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < s.a ? "bg-primary" : "bg-secondary")} />)}
          </span>
        )}
      </span>
    </Link>
  );
}
