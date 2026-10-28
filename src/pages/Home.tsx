import { lazy, Suspense, useRef, useState } from "react";
import SyncPrompt from "../components/SyncPrompt";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { daysLeft } from "../components/Countdown";
import { ArrowLink, LinkButton, Page, Section } from "../components/kit";
import { CAT_PATTERN, CHECKED_ON, EXAM_NAME, PHASES, phaseOf } from "../data/exam";
import { UPDATES } from "../data/updates";
import { shortDate, todayIso } from "../lib/date";
import { calm } from "../lib/motion";
import { useStore } from "../lib/store";
import { activityDays } from "../practice/streak";
import { SECTIONS } from "../sections";
import { curveColumns, Z99 } from "./home/curve";
import { Head } from "./home/Head";

// The 3D field brings three.js, and everything below the hero loads after it: neither is in the first download (D41, D42).
const PercentileField = lazy(() => import("./home/PercentileField"));
const Road = lazy(() => import("./home/Road").then((m) => ({ default: m.Road })));
const TodayLine = lazy(() => import("./home/TodayLine").then((m) => ({ default: m.TodayLine })));
const Showcase = lazy(() => import("./home/More").then((m) => ({ default: m.Showcase })));
const Numbers = lazy(() => import("./home/More").then((m) => ({ default: m.Numbers })));
const Statement = lazy(() => import("./home/More").then((m) => ({ default: m.Statement })));
const Closing = lazy(() => import("./home/More").then((m) => ({ default: m.Closing })));

const STATUS = { official: ["Official", "success"], expected: ["Expected", "warning"], tip: ["Tip", "secondary"] } as const;

/** Data Saver, 2G or no WebGL: the flat drawing of the curve stays and three.js is never fetched. */
function canDraw3d(): boolean {
  const net = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (net?.saveData || /2g/.test(net?.effectiveType ?? "")) return false;
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

/** The curve as flat dots: what the hero shows before the 3D field arrives, and instead of it when that cannot load. */
function CurveDrawing({ className }: { className?: string }) {
  const cols = curveColumns(41, 15);
  return (
    <svg viewBox="0 0 410 170" preserveAspectRatio="xMidYMax meet" className={className} aria-hidden>
      {cols.flatMap(({ z, n }, c) => Array.from({ length: n }, (_, r) => (
        <circle key={`${c}-${r}`} cx={c * 10 + 5} cy={165 - r * 10} r={3.4} fill={z >= Z99 ? "var(--highlight)" : "var(--primary)"} fillOpacity={z >= Z99 ? 1 : 0.42} />
      )))}
    </svg>
  );
}

/** Days left and the phase, in one line under the hero's button. The full road is its own section below. */
function StatusLine() {
  const left = Math.max(daysLeft(), 0);
  const ph = phaseOf(todayIso());
  return (
    <p className="flex items-center gap-2.5 text-base text-muted-foreground">
      <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden />
      <span><b className="font-semibold text-foreground tabular-nums">{left} days</b> to {EXAM_NAME}{ph.kind === "phase" ? <>. Phase {ph.phase.id} of {PHASES.length}, {ph.phase.name}.</> : "."}</span>
    </p>
  );
}

function Hero({ isNew }: { isNew: boolean }) {
  const box = useRef<HTMLElement>(null);
  const [want3d] = useState(canDraw3d);
  const [live, setLive] = useState(false);
  const [still] = useState(calm);
  const [fine] = useState(() => matchMedia("(pointer: fine)").matches);
  return (
    <header ref={box} className="grid items-center gap-x-6 gap-y-6 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <div className="relative z-10 flex min-w-0 flex-col gap-7">
        {/* Keep the exam name together; let the rest of the headline wrap naturally. */}
        <h1 className="max-w-[11ch] text-[clamp(3rem,1rem+5.6vw,7.25rem)] leading-[0.92] font-extrabold tracking-[-0.055em]">Prepare for {EXAM_NAME.replace(/ /g, "\u00a0")}, one day at a time.</h1>
        <p className="max-w-[42ch] text-lg leading-relaxed text-foreground/80">A free CAT coach: a plan that fits your day, original practice, and a reason for every option. No sign-up; your progress stays on this device.</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {isNew
            ? <><LinkButton to="/guides/start-here" size="lg" className="min-w-44">Start here</LinkButton><ArrowLink to="/today">Open today's plan</ArrowLink></>
            : <><LinkButton to="/today" size="lg" className="min-w-48">Open today's plan</LinkButton><ArrowLink to="/guides/start-here">Start here</ArrowLink></>}
        </div>
        <StatusLine />
      </div>
      {/* The field runs to the screen's edge on a wide screen, with its caption laid over its foot. */}
      <figure className="relative flex min-w-0 flex-col gap-3 lg:-mr-[var(--gutter)] lg:-ml-[10%]">
        <div className="relative aspect-[5/4] w-full lg:aspect-auto lg:h-[min(88vh,58rem)]">
          <CurveDrawing className={cn("absolute inset-x-0 bottom-[16%] h-[58%] w-full transition-opacity duration-700 motion-reduce:transition-none", live && "opacity-0")} />
          {want3d && <Suspense fallback={null}><PercentileField track={box} onReady={() => setLive(true)} onFail={() => setLive(false)} /></Suspense>}
        </div>
        {/* A legend in the picture's own colours, left-aligned where the dots begin, then what the student can do with it. */}
        <figcaption className="flex max-w-[80ch] flex-col gap-1.5 text-sm text-muted-foreground lg:absolute lg:bottom-5 lg:left-0">
          <span className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-primary/45" aria-hidden />Each dot, a group of CAT takers</span>
            <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-highlight" aria-hidden />The 99th percentile, one in a hundred</span>
            {live && <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-primary" aria-hidden />You</span>}
          </span>
          {live && !still && <span>Scroll, and you climb.{fine && " Drag to turn the hill; click to send a ripple."}</span>}
        </figcaption>
      </figure>
    </header>
  );
}

const STATUS_LABEL = { live: ["Ready", "highlight"], open: ["Open", "success"], soon: ["Coming soon", "secondary"] } as const;

/** The three sections as wide rows: the name large, what it covers, and where it stands. */
function SectionOverview() {
  return (
    <section aria-labelledby="secs-h" className="flex flex-col gap-10">
      <Head id="secs-h" lead="Three sections, one plan." rest="VARC is ready with its timetable. DILR has its guides and logic sets. Quant opens in January." />
      <ul className="flex flex-col gap-px overflow-hidden rounded-xl bg-background">
        {SECTIONS.map((sec) => {
          const [label, variant] = STATUS_LABEL[sec.status];
          return (
            <li key={sec.id} className="grid gap-x-10 gap-y-4 bg-card px-6 py-6 sm:px-8 lg:grid-cols-[13rem_minmax(0,1fr)_auto] lg:items-center">
              <div className="flex flex-col gap-1">
                <h3 className="text-[clamp(2rem,1.6rem+1.2vw,2.75rem)] leading-none font-bold tracking-[-0.03em]">{sec.short}</h3>
                <p className="text-sm text-muted-foreground">{sec.name}</p>
              </div>
              <div className="flex flex-col gap-3">
                <p className="measure text-base text-foreground/80">{sec.tagline}</p>
                <ul className="flex flex-wrap gap-2" aria-label={`${sec.short} practice types`}>
                  {sec.practiceTypes.slice(0, 4).map((type) => <li key={type} className="rounded-full bg-background px-2.5 py-1 text-sm text-muted-foreground">{type}</li>)}
                </ul>
              </div>
              <div className="flex items-center gap-4 lg:flex-col lg:items-end">
                <Badge variant={variant}>{label}</Badge>
                <ArrowLink to={`/${sec.id}`}>{sec.status === "soon" ? `See the ${sec.short} roadmap` : `Open ${sec.short}`}</ArrowLink>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LatestUpdates() {
  const latest = [...UPDATES].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const [featured, ...rest] = latest;
  if (!featured) return null;
  const [featuredLabel, featuredVariant] = STATUS[featured.status];
  return (
    <Section title="Latest updates" action={<ArrowLink to="/updates">All updates</ArrowLink>}>
      <div className="flex flex-col gap-2">
        <article className="flex flex-col gap-3 rounded-xl bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{featured.exam}</Badge>
            <Badge variant={featuredVariant}>{featuredLabel}</Badge>
            <span className="text-sm text-muted-foreground">{shortDate(featured.date)}</span>
          </div>
          <h3 className="text-heading font-semibold leading-snug">{featured.title}</h3>
          <p className="line-clamp-2 text-base leading-relaxed text-muted-foreground">{featured.body}</p>
          <ArrowLink to="/updates" className="pt-1">Read the update</ArrowLink>
        </article>
        {rest.length > 0 && <ul className="flex flex-col gap-1" aria-label="More recent updates">
          {rest.map((u) => {
            const [label, variant] = STATUS[u.status];
            return <li key={u.id}>
              <Link to="/updates" className="group flex flex-col gap-2 rounded-lg px-3 py-3 transition-colors hover:bg-card sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="min-w-0 text-base font-semibold leading-snug group-hover:text-primary">{u.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground"><Badge variant={variant}>{label}</Badge>{shortDate(u.date)}</span>
              </Link>
            </li>;
          })}
        </ul>}
      </div>
    </Section>
  );
}

export default function Home() {
  const { state } = useStore();
  const isNew = activityDays(state).size === 0;
  const total = CAT_PATTERN.reduce((a, s) => ({ q: a.q + s.questions, m: a.m + s.minutes }), { q: 0, m: 0 });
  const today = <Suspense fallback={<div className="min-h-[32rem]" />}><TodayLine /></Suspense>;

  return (
    <Page className="max-w-[1440px] gap-24 lg:gap-36">
      <Hero isNew={isNew} />
      <SyncPrompt />
      {!isNew && today}
      <Suspense fallback={<div className="min-h-[28rem]" />}><Road /></Suspense>
      <Suspense fallback={<div className="min-h-[48rem]" />}><Showcase /></Suspense>
      <Suspense fallback={<div className="min-h-[20rem]" />}><Numbers /></Suspense>
      <SectionOverview />
      {isNew && today}

      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
        <LatestUpdates />
        <Section title="The exam" action={<ArrowLink to="/exams">Pattern and marking</ArrowLink>}>
          <div className="flex flex-col gap-1 rounded-lg bg-card p-2">
            {CAT_PATTERN.map((s) => (
              <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 rounded-md px-3 py-2.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
                <b className="text-base font-semibold">{s.id.toUpperCase()}</b>
                <span className="hidden text-base text-muted-foreground sm:block">{s.name}</span>
                <span className="text-base font-medium whitespace-nowrap tabular-nums">{s.questions} Qs in {s.minutes} min</span>
              </div>
            ))}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 rounded-md bg-muted px-3 py-2.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
              <b className="text-base font-semibold">Total</b>
              <span className="hidden text-sm text-muted-foreground sm:block">+3 right, −1 wrong MCQ, no penalty on TITA.</span>
              <span className="text-base font-semibold whitespace-nowrap tabular-nums">{total.q} Qs in {total.m} min</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground sm:hidden">+3 for a right answer, −1 for a wrong MCQ, no penalty on TITA.</p>
        </Section>
      </div>

      <Suspense fallback={<div className="min-h-[30rem]" />}><Statement /></Suspense>
      <p className="-mt-12 w-full max-w-none text-sm leading-relaxed text-muted-foreground lg:-mt-24">Resources checked on {CHECKED_ON}. The {EXAM_NAME} date is an estimate until the conducting IIM announces it. Score benchmarks come from coaching institutes. Not affiliated with the IIMs or any coaching institute. Avoid pirated book PDFs; the papers and free mocks listed here are legitimately free.</p>
      <Suspense fallback={<div className="min-h-[40rem]" />}>
        <Closing to={isNew ? "/guides/start-here" : "/today"} label={isNew ? "Start here" : "Open today's plan"} />
      </Suspense>
    </Page>
  );
}
