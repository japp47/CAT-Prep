import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { daysLeft, examLine, PhaseBar } from "../components/Countdown";
import { LinkButton, Page, Section, TextLink } from "../components/kit";
import { CAT_PATTERN, CHECKED_ON, EXAM_CONFIRMED, EXAM_NAME, PHASES, phaseOf } from "../data/exam";
import { UPDATES } from "../data/updates";
import { addDays, clamp, diffDays, longDate, mediumDate, shortDate, todayIso, weekStart } from "../lib/date";
import { useStore } from "../lib/store";
import { budgetFor, buildDay, doneMinutes } from "../planner/engine";
import { LIVE_SECTIONS } from "../sections";
import { rcOfDay } from "../practice/daily";
import { dueRedo } from "../practice/redo";
import { activityDays } from "../practice/streak";
import { GENRES } from "../practice/types";
import { DAILY_MIX } from "../practice/va/build";
import { StreakBadge } from "../components/StreakBadge";

const STATUS = { official: ["official", "text-success"], expected: ["expected", "text-warning"], tip: ["tip", "text-primary"] } as const;
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

type Leads = Record<string, [string, string]>;
let leadsLoaded: Leads | null = null;

/** The passages' opening paragraphs, loaded on demand so they stay out of the first download. */
function useLeads() {
  const [leads, setLeads] = useState(leadsLoaded);
  useEffect(() => {
    if (leads) return;
    let live = true;
    import("../practice/leads.gen").then((m) => { leadsLoaded = m.RC_LEADS; if (live) setLeads(m.RC_LEADS); }, () => { /* the sheet still has its title and button */ });
    return () => { live = false; };
  }, [leads]);
  return leads;
}

/**
 * Grey bars the size of the opening paragraph, while its text loads. It is set in the same type as the real paragraph,
 * with placeholder words of the same total length, so it wraps to about as many lines and nothing below it moves.
 */
function LeadPlaceholder({ chars }: { chars: number }) {
  const filler = "xxxxxxx ".repeat(Math.max(1, Math.round(chars / 8))).trim();
  return (
    <p className="measure text-reading" aria-hidden>
      <span className="animate-pulse rounded-sm bg-muted text-transparent [box-decoration-break:clone] [-webkit-box-decoration-break:clone] motion-reduce:animate-none">{filler}</span>
    </p>
  );
}

/**
 * Today's passage, opened on a sheet: reading a dense passage is what CAT prep looks like every day.
 * The opening paragraph's last sentence, where the passage turns, carries the highlighter. It changes daily.
 */
function TodaysPassage() {
  const { state } = useStore();
  const t = todayIso();
  const rc = rcOfDay(t);
  const leads = useLeads();
  const [body, turn] = leads?.[rc.id] ?? ["", ""];
  const tried = state.rcAttempts.filter((a) => a.set === rc.id && a.d === t).pop();
  const to = tried ? `/practice/rc/${rc.id}?review=${tried.id}` : `/practice/rc/${rc.id}`;
  return (
    <article aria-labelledby="todays-passage" className="flex min-w-0 flex-col gap-5 rounded-xl bg-card px-6 py-7 sm:px-9 sm:py-9">
      <h2 id="todays-passage" className="font-serif text-[clamp(1.5rem,1.25rem+0.9vw,2rem)] leading-tight font-semibold tracking-[-0.01em]">
        <Link to={to} className="hover:text-primary">{rc.title}</Link>
      </h2>
      {leads
        ? body && <p className="measure text-reading">{body}{turn && <> <mark className="hl text-inherit">{turn}</mark></>}</p>
        : <LeadPlaceholder chars={rc.lead} />}
      <p className="text-base text-muted-foreground">
        Today's RC: {GENRES[rc.genre].toLowerCase()}, {rc.difficulty}, {rc.words} words and {rc.questions} questions, about 7 minutes. The same passage for everyone today, and a new one tomorrow.
      </p>
      {tried && <p className="text-base text-success">Done today: {tried.c} of {rc.questions} correct.</p>}
      <div><LinkButton to={to} size="lg">{tried ? "Review your answers" : "Start the passage"}</LinkButton></div>
    </article>
  );
}

function Hero({ isNew }: { isNew: boolean }) {
  return (
    <header className="grid items-start gap-x-14 gap-y-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex max-w-[640px] flex-col gap-5 xl:pt-6">
        {/* No-break spaces keep "one day at a time" and the exam name whole, so the headline never breaks mid-phrase. */}
        <h1 className="text-[clamp(2rem,0.9rem+1.9vw,2.75rem)] leading-[1.05] font-bold tracking-[-0.035em]">Prepare for {EXAM_NAME.replace(/ /g, "\u00a0")}, {"one\u00a0day\u00a0at\u00a0a\u00a0time."}</h1>
        <p className="text-lg leading-relaxed text-foreground/80">A free study plan that fits the time you have, with original practice and plain guidance. No sign-up. Everything stays on your device.</p>
        <div className="flex flex-wrap gap-3"><LinkButton to="/today" size="lg" variant="secondary">Open today's plan</LinkButton></div>
        {isNew && <p className="text-base text-muted-foreground">New here? <TextLink to="/guides/start-here">Read the start guide</TextLink>, about 4 minutes.</p>}
      </div>
      <TodaysPassage />
    </header>
  );
}

/** Days to the exam and the phase you are in, as one line over the year's phases. */
function Countdown() {
  const left = Math.max(daysLeft(), 0);
  const t = todayIso();
  const ph = phaseOf(t);
  const phase = ph.kind === "phase"
    ? <>Phase {ph.phase.id} of {PHASES.length}, <b className="font-semibold text-foreground">{ph.phase.name}</b>, with {diffDays(t, ph.phase.end) + 1} days left in it, to {mediumDate(ph.phase.end)}.</>
    : ph.kind === "pre" ? <>The plan starts on {mediumDate(PHASES[0].start)}.</>
    : ph.kind === "exam" ? <>Exam day. All the best.</> : <>{EXAM_NAME} is over. Check results on iimcat.ac.in.</>;
  return (
    <section aria-label="Countdown" className="flex flex-col gap-3">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-heading font-semibold"><span className="tabular-nums">{left}</span> {left === 1 ? "day" : "days"} to {EXAM_NAME}</span>
        <span className="text-base text-muted-foreground">{examLine(EXAM_CONFIRMED)}.</span>
      </p>
      <PhaseBar />
      <p className="text-base text-muted-foreground">{phase}</p>
    </section>
  );
}

function TodayPanel() {
  const { state } = useStore();
  const t = todayIso();
  const planned = LIVE_SECTIONS.reduce((s, sec) => s + budgetFor(sec, state, t), 0);
  const done = doneMinutes(state, t);
  const core = LIVE_SECTIONS.map((sec) => buildDay(sec, state, t, budgetFor(sec, state, t), { today: t }).find((b) => b.pri === 1)).filter((b) => !!b);
  const doneMap = state.days[t]?.done ?? {};
  const active = activityDays(state);
  const mon = weekStart(t);
  const vaTry = state.vaAttempts.filter((a) => a.mode === "daily" && a.d === t).pop();
  const redo = dueRedo(state.redo, t).length;

  return (
    <Section title={<>Today<span className="font-normal text-muted-foreground">, {longDate(t)}</span></>} action={<StreakBadge />}>
      <div className="grid gap-px overflow-hidden rounded-lg lg:grid-cols-2">
        <div className="flex flex-col gap-3 bg-card p-5 sm:p-6">
          <p className="flex items-baseline gap-1.5"><span className="text-title font-bold tabular-nums">{done}</span><span className="text-base text-muted-foreground">of {planned} min done today</span></p>
          <Progress value={planned ? clamp(done / planned, 0, 1) * 100 : 0} aria-label="Minutes done today" className="h-2" />
          {core.length
            ? core.map((b) => <p key={b.key} className="text-base"><Badge variant="highlight" className="mr-1.5">Core</Badge>{b.name}, {b.mins} min{doneMap[b.key] && <span className="text-success">, done</span>}</p>)
            : <p className="text-base text-muted-foreground">Rest day. Nothing planned.</p>}
          <ol className="mt-1 grid grid-cols-7 gap-1 text-sm text-muted-foreground" aria-label="Days studied this week">
            {WEEK.map((w, i) => {
              const d = addDays(mon, i), on = active.has(d);
              return (
                <li key={d} className={cn("flex flex-col items-center gap-1.5", d === t && "font-semibold text-foreground")}>
                  <i className={cn("h-1.5 w-full max-w-7 rounded-full", on ? "bg-success" : "bg-secondary", d === t && "ring-2 ring-foreground/30 ring-offset-2 ring-offset-card")} aria-hidden />
                  <span aria-hidden>{w}</span>
                  <span className="sr-only">{longDate(d)}, {on ? "studied" : "not studied"}</span>
                </li>
              );
            })}
          </ol>
          <TextLink to="/today" className="mt-auto pt-2">Open the timetable</TextLink>
        </div>
        <div className="flex flex-col gap-3 bg-card p-5 sm:p-6">
          <h3 className="text-heading font-semibold"><Link to="/practice/va" className="hover:text-primary">Daily VA drill</Link></h3>
          <p className="text-base text-muted-foreground">{DAILY_MIX.length} questions, 2 each of para summary, sentence insertion, odd sentence out and para jumbles.</p>
          {vaTry && <p className="text-base text-success">Done today: {vaTry.items.filter((i) => i.ok).length} of {vaTry.items.length} correct.</p>}
          {redo > 0 && <Link to="/practice/redo" className="rounded-md bg-highlight-soft px-3 py-2 text-base hover:bg-highlight-soft/70"><b>{redo}</b> missed question{redo > 1 ? "s" : ""} due in your redo queue</Link>}
          <TextLink to="/practice/va" className="mt-auto pt-2">{vaTry ? "Review your answers" : "Start the drill"}</TextLink>
        </div>
      </div>
    </Section>
  );
}

export default function Home() {
  const { state } = useStore();
  const isNew = activityDays(state).size === 0;
  const total = CAT_PATTERN.reduce((a, s) => ({ q: a.q + s.questions, m: a.m + s.minutes }), { q: 0, m: 0 });

  return (
    <Page className="gap-14 lg:gap-16">
      <Hero isNew={isNew} />
      <Countdown />
      <TodayPanel />

      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
        <Section title="Latest updates" action={<TextLink to="/updates">All updates</TextLink>}>
          <ul className="-mx-3 flex flex-col gap-1">
            {UPDATES.slice(0, 4).map((u) => {
              const [label, cls] = STATUS[u.status];
              return (
                <li key={u.id}>
                  <Link to="/updates" className="group flex flex-col gap-1 rounded-md px-3 py-3 hover:bg-card">
                    <span className="text-base text-muted-foreground">{shortDate(u.date)}, {u.exam}, <span className={cn("font-medium", cls)}>{label}</span></span>
                    <span className="text-base font-semibold group-hover:text-primary">{u.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
        <Section title="The exam" action={<TextLink to="/exams">Pattern and marking</TextLink>}>
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

      <p className="measure text-base text-muted-foreground">Resources checked on {CHECKED_ON}. The {EXAM_NAME} date is an estimate until the conducting IIM announces it. Score benchmarks come from coaching institutes. Not affiliated with the IIMs or any coaching institute. Avoid pirated book PDFs; the papers and free mocks listed here are legitimately free.</p>
    </Page>
  );
}
