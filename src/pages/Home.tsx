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
import { LIVE_SECTIONS, SECTIONS } from "../sections";
import { rcOfDay } from "../practice/daily";
import { dueRedo } from "../practice/redo";
import { activityDays } from "../practice/streak";
import { GENRES } from "../practice/types";
import { DAILY_MIX } from "../practice/va/build";
import { StreakBadge } from "./practice/common";

/** The site map below the fold: each row is a page and why you would open it. */
const INDEX: { h: string; rows: { to: string; n: string; w: string; soon?: boolean }[] }[] = [
  { h: "Study", rows: [
    { to: "/today", n: "Today", w: "A plan that fits the time you have, from 30 minutes to 3 hours." },
    { to: "/plan", n: "Plan and time", w: "Five phases to the exam, and your usual time per day." },
    { to: "/practice", n: "Practice", w: "Original RC sets, VA drills, a timed sectional and a redo queue." },
  ] },
  { h: "Sections", rows: SECTIONS.map((s) => ({ to: "/" + s.id, n: s.short, w: s.name + (s.status === "live" ? ". Guides, question banks, reading lists." : "."), soon: s.status !== "live" })) },
  { h: "Track", rows: [
    { to: "/progress", n: "Progress", w: "Accuracy by question type and your mock scores." },
    { to: "/errors", n: "Error log", w: "Every mistake, with the trap that caught you." },
    { to: "/words", n: "Words", w: "Flashcards from the words you save while reading." },
  ] },
  { h: "Explore", rows: [
    { to: "/guides", n: "Guides", w: "Starting out, studying while working, mock analysis." },
    { to: "/updates", n: "Updates", w: "Exam dates and changes, marked official or expected." },
    { to: "/exams", n: "CAT and other exams", w: "Pattern, marking and the other MBA tests." },
    { to: "/stories", n: "Topper stories", w: "What 99+ percentile scorers actually did." },
  ] },
];

const STATUS = { official: ["official", "text-success"], expected: ["expected", "text-warning"], tip: ["tip", "text-primary"] } as const;
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

function Hero({ isNew }: { isNew: boolean }) {
  const left = Math.max(daysLeft(), 0);
  const t = todayIso();
  const ph = phaseOf(t);
  const caption = ph.kind === "phase"
    ? <>Phase {ph.phase.id} of {PHASES.length}, <b className="font-semibold text-foreground">{ph.phase.name}</b>. {diffDays(t, ph.phase.end) + 1} days left in this phase, to {mediumDate(ph.phase.end)}.</>
    : ph.kind === "pre" ? <>The plan starts on {mediumDate(PHASES[0].start)}.</>
    : ph.kind === "exam" ? <>Exam day. All the best.</> : <>{EXAM_NAME} is over. Check results on iimcat.ac.in.</>;
  return (
    <header className="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex max-w-[660px] flex-col gap-5">
        <h1 className="text-[clamp(2.25rem,1.6rem+2.6vw,3.5rem)] leading-[1.03] font-bold tracking-[-0.035em]">Prepare for {EXAM_NAME}, one day at a time.</h1>
        <p className="measure text-lg leading-relaxed text-foreground/80">A free study plan that fits the time you have, with original practice, hand-picked resources and plain guidance. No sign-up. Everything stays on your device.</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <LinkButton to="/today" size="lg">Open today's plan</LinkButton>
          <LinkButton to="/practice" size="lg" variant="secondary">Practice now</LinkButton>
        </div>
        {isNew && <p className="text-base text-muted-foreground">New here? <TextLink to="/guides/start-here">Read the start guide</TextLink>, about 4 minutes.</p>}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 self-end lg:flex-col lg:items-end lg:text-right">
        <span className="text-display font-bold tabular-nums">{left}</span>
        <span className="text-heading font-semibold">{left === 1 ? "day" : "days"} to {EXAM_NAME}</span>
        <span className="basis-full text-sm text-muted-foreground lg:basis-auto">{examLine(EXAM_CONFIRMED)}</span>
      </div>
      <div className="flex flex-col gap-3 lg:col-span-2">
        <PhaseBar />
        <p className="text-base text-muted-foreground">{caption}</p>
      </div>
    </header>
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
  const rc = rcOfDay(t);
  const rcTry = state.rcAttempts.filter((a) => a.set === rc.id && a.d === t).pop();
  const vaTry = state.vaAttempts.filter((a) => a.mode === "daily" && a.d === t).pop();
  const redo = dueRedo(state.redo, t).length;

  return (
    <Section title={<>Today <span className="font-normal text-muted-foreground">· {longDate(t)}</span></>} action={<StreakBadge />}>
      <div className="grid gap-px overflow-hidden rounded-lg lg:grid-cols-3">
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
          <h3 className="text-base font-semibold">RC of the day</h3>
          <Link to={`/practice/rc/${rc.id}`} className="text-heading font-semibold hover:text-primary"><span className="hl">{rc.title}</span></Link>
          <p className="text-base text-muted-foreground">{GENRES[rc.genre]}, {rc.words} words, {rc.questions} questions, every option explained.</p>
          {rcTry && <p className="text-base text-success">Done today: {rcTry.c} of {rc.questions} correct.</p>}
          <TextLink to={rcTry ? `/practice/rc/${rc.id}?review=${rcTry.id}` : `/practice/rc/${rc.id}`} className="mt-auto pt-2">{rcTry ? "Review your answers" : "Start the passage"}</TextLink>
        </div>
        <div className="flex flex-col gap-3 bg-card p-5 sm:p-6">
          <h3 className="text-base font-semibold">Daily VA drill</h3>
          <Link to="/practice/va" className="text-heading font-semibold hover:text-primary">{DAILY_MIX.length} questions, all four types</Link>
          <p className="text-base text-muted-foreground">Para summary, sentence insertion, odd sentence out and para jumbles.</p>
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
    <Page className="gap-14 lg:gap-20">
      <Hero isNew={isNew} />
      <TodayPanel />

      <Section title="On this site">
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
          {INDEX.map((g) => (
            <div key={g.h} className="flex flex-col gap-1">
              <h3 className="pb-1 text-sm font-medium text-muted-foreground">{g.h}</h3>
              <ul className="-mx-3 flex flex-col">
                {g.rows.map((r) => (
                  <li key={r.to}>
                    <Link to={r.to} className="group flex flex-col gap-0.5 rounded-md px-3 py-2.5 hover:bg-card">
                      <span className="flex items-center gap-2 text-base font-semibold group-hover:text-primary">{r.n}{r.soon && <span className="text-sm font-normal text-muted-foreground">Soon</span>}</span>
                      <span className="text-base text-muted-foreground">{r.w}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

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
              <div key={s.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-3 rounded-md px-3 py-2.5">
                <b className="text-base font-semibold">{s.id.toUpperCase()}</b>
                <span className="text-base text-muted-foreground max-sm:invisible">{s.name}</span>
                <span className="text-base font-medium whitespace-nowrap tabular-nums">{s.questions} Qs in {s.minutes} min</span>
              </div>
            ))}
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-3 rounded-md bg-muted px-3 py-2.5">
              <b className="text-base font-semibold">Total</b>
              <span className="text-sm text-muted-foreground max-sm:invisible">+3 right, −1 wrong MCQ, no penalty on TITA.</span>
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
