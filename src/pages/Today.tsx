import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, PenLine, Timer as TimerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ArticleSummarySheet } from "../components/ArticleSummary";
import { ErrorText, Ext, Field, LinkButton, LinkButtons, Meta, Page, TextLink } from "../components/kit";
import SyncPrompt from "../components/SyncPrompt";
import { NativeSelect } from "../components/Select";
import { StreakBadge } from "../components/StreakBadge";
import { PHASES, phaseOf } from "../data/exam";
import { addDays, clamp, DOW, dow, isWeekend, longDate, mediumDate, shortDate, todayIso, uid, weekStart } from "../lib/date";
import { useFocus } from "../lib/focus";
import { useGsap } from "../lib/motion";
import type { AppState } from "../lib/state";
import { useStore } from "../lib/store";
import { buildDay, budgetFor, carryInfo, defaultMin, doneMinutes, markBlockDone, missedDays, skipCarry, type PlacedBlock } from "../planner/engine";
import { goFor } from "../planner/go";
import { siteWork } from "../planner/auto";
import { daySummary, historyDays } from "../practice/history";
import { nextSteps } from "../practice/next";
import { loadDraft, secsLeft } from "../practice/sectional";
import { FOCUS_DAYS, focusToday, reviewOf, reviewWeek } from "../practice/week";
import { LIVE_SECTIONS } from "../sections";
import type { SectionDef } from "../sections/types";
import { useResources } from "../sections/useResources";

/**
 * Today (D55, docs/design/today-v2.md): the day as a path. A ring shows how much of today is done, with the week
 * beside it; "Up next" is the one thing to do now, with the page's only filled button; the rest of the day is one
 * list of blocks across sections that open in place, done blocks folded under them. GSAP runs one entrance, the ring,
 * the tick and the finished-day sweep; nothing moves under reduced motion.
 */

const POP = "flex w-[min(92vw,22rem)] flex-col gap-4 rounded-lg border-0 bg-popover p-4 shadow-xl"; // taste-skill-ignore: a popover floats
const CHIP_MINS = [0, 30, 45, 60, 90, 120, 150, 180];

function useToday() {
  const [t, setT] = useState(todayIso);
  useEffect(() => {
    const on = () => { if (!document.hidden) setT(todayIso()); };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return t;
}

/** A block placed on the day, with its section. */
interface DayBlock { sec: SectionDef; b: PlacedBlock }

function markDone(st: AppState, d: string, b: PlacedBlock, sec: SectionDef) {
  markBlockDone(st, d, sec.id, b.key, b.mins, b.carryFrom);
}

/** Every live section's blocks for a day, in section order, and the minutes planned. */
function dayPlan(st: AppState, d: string, today: string): { blocks: DayBlock[]; planned: number } {
  const blocks = LIVE_SECTIONS.flatMap((sec) => buildDay(sec, st, d, budgetFor(sec, st, d), { today }).map((b) => ({ sec, b })));
  return { blocks, planned: blocks.reduce((s, x) => s + x.b.mins, 0) };
}

function LogForm({ sec, b, d }: { sec: SectionDef; b: PlacedBlock; d: string }) {
  const { update } = useStore();
  const [err, setErr] = useState("");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (b.kind === "practice") {
      const a = parseInt(String(fd.get("a")), 10), c = parseInt(String(fd.get("c")), 10);
      if (isNaN(a) || isNaN(c) || a < 1 || c < 0 || c > a) { setErr("Correct must be between 0 and the number attempted."); return; }
      update((st) => { st.practice.push({ id: uid(), d, sec: sec.short, t: String(fd.get("t")), a, c, src: b.name }); markDone(st, d, b, sec); });
    } else {
      const n = String(fd.get("n") ?? "").trim(), c = parseInt(String(fd.get("c")), 10), w = parseInt(String(fd.get("w")), 10);
      if (!n || isNaN(c) || isNaN(w) || c < 0 || w < 0 || c + w > sec.maxQ) { setErr("Add a name. Correct plus wrong cannot be more than " + sec.maxQ + "."); return; }
      update((st) => { st.mocks.push({ id: uid(), d, sec: sec.short, n, k: b.pkind || "Past paper", c, w }); markDone(st, d, b, sec); });
    }
  };
  return (
    <form className="flex flex-col gap-2 rounded-lg bg-muted p-3" onSubmit={submit}>
      <p className="text-sm text-muted-foreground">Did it somewhere else? Log it here and the block is done.</p>
      <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        {b.kind === "practice" ? (
          <>
            <Field label="Type" className="col-span-2 sm:col-span-1"><NativeSelect name="t" defaultValue={b.ptype}>{sec.practiceTypes.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
            <Field label="Attempted"><Input name="a" type="number" inputMode="numeric" min={1} max={200} required /></Field>
            <Field label="Correct"><Input name="c" type="number" inputMode="numeric" min={0} max={200} required /></Field>
          </>
        ) : (
          <>
            <Field label="Paper or mock" className="col-span-2 sm:col-span-1"><Input name="n" defaultValue={b.paper || ""} placeholder="Cracku mock 3" required /></Field>
            <Field label="Correct"><Input name="c" type="number" inputMode="numeric" min={0} max={sec.maxQ} required /></Field>
            <Field label="Wrong MCQ"><Input name="w" type="number" inputMode="numeric" min={0} max={sec.maxQ} required /></Field>
          </>
        )}
        <Button type="submit" variant="secondary" className="col-span-2 sm:col-span-1">Log and finish</Button>
      </div>
      <ErrorText>{err}</ErrorText>
    </form>
  );
}

/** "VARC 60 min" with the day's time choices folded into a popover. */
function TimeControl({ sec, d }: { sec: SectionDef; d: string }) {
  const { state, update } = useStore();
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const rec = state.days[d];
  const has = typeof rec?.min?.[sec.id] === "number";
  const budget = budgetFor(sec, state, d), def = defaultMin(sec, state, d);
  const setMin = (m: number | null) => update((st) => {
    const r = (st.days[d] ??= {});
    r.min ??= {};
    if (m === null || m === defaultMin(sec, st, d)) delete r.min[sec.id]; else r.min[sec.id] = m;
  });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5"><span className="font-semibold">{sec.short}</span>{budget === 0 ? "rest" : `${budget} min`}<ChevronDown className="size-4" aria-hidden /></Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={POP}>
        <p className="text-base font-semibold">{sec.short} time for {shortDate(d)}</p>
        <ToggleGroup type="single" value={String(budget)} onValueChange={(v) => v && setMin(+v)} className="grid w-full grid-cols-4 gap-1.5" aria-label="Minutes">
          {CHIP_MINS.map((m) => (
            <ToggleGroupItem key={m} value={String(m)} className="h-auto min-h-11 flex-col gap-0 rounded-md bg-secondary px-1 py-1 text-sm leading-tight font-semibold data-[state=on]:bg-foreground data-[state=on]:text-background">
              {m === 0 ? "Rest" : m}{m === def && <span className="text-sm leading-tight font-normal opacity-75">usual</span>}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <form className="flex items-end gap-2" onSubmit={(e) => {
          e.preventDefault();
          const v = parseInt(custom, 10);
          if (isNaN(v) || v < 0 || v > 600) { setNote("Enter a number of minutes from 0 to 600."); return; }
          setNote(""); setCustom(""); setMin(Math.round(v));
        }}>
          <Field label="Other, in minutes" className="flex-1"><Input type="number" inputMode="numeric" min={0} max={600} step={5} value={custom} onChange={(e) => setCustom(e.target.value)} /></Field>
          <Button type="submit" variant="secondary">Set</Button>
        </form>
        <p className="text-sm text-muted-foreground">{note || (has
          ? `Set to ${budget} min for this day. Your usual ${isWeekend(d) ? "weekend" : "weekday"} time is ${def} min.`
          : `Your usual ${DOW[dow(d)]} time is ${def} min. Change usual times in Plan.`)}</p>
        {has && <Button variant="link" size="sm" className="self-start" onClick={() => setMin(null)}>Use my usual time</Button>}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The ring and the week

/**
 * Minutes done out of minutes planned, as a ring whose arc eases to its new share whenever a block is ticked, with the
 * number in the middle. Under it, the week: one small ring per day; tap a day to open it.
 */
function DayRing({ done, planned, d, today, onPick }: { done: number; planned: number; d: string; today: string; onPick: (d: string) => void }) {
  const { state } = useStore();
  const box = useRef<HTMLDivElement>(null);
  const share = planned ? clamp(done / planned, 0, 1) : 0;
  const was = useRef(0);
  const C = 2 * Math.PI * 52;
  useGsap(box, (gsap, el) => {
    const arc = el.querySelector("[data-arc]");
    if (arc) gsap.fromTo(arc, { strokeDashoffset: C * (1 - was.current) }, { strokeDashoffset: C * (1 - share), duration: 0.9, ease: "power3.out" });
    was.current = share;
  }, [share]);
  const ws = weekStart(d);
  return (
    // On a phone the ring sits beside the week in one short row; from a wide screen it stands above it.
    <div ref={box} className="flex items-center gap-4 rounded-2xl bg-card p-4 sm:p-5 lg:flex-col lg:gap-5 lg:p-6">
      <div className="relative size-24 shrink-0 lg:size-44" role="img" aria-label={`${done} of ${planned} minutes done`}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="52" className="fill-none stroke-secondary" strokeWidth="10" />
          <circle data-arc cx="60" cy="60" r="52" className={cn("fill-none", share >= 1 ? "stroke-success" : "stroke-primary")} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - share)} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[1.75rem] leading-none font-extrabold tracking-[-0.04em] tabular-nums lg:text-[2.75rem]">{done}</span>
          <span className="text-sm text-muted-foreground tabular-nums">of {planned} min</span>
        </div>
      </div>
      <ol className="grid min-w-0 flex-1 grid-cols-7 gap-0.5 lg:w-full lg:flex-none lg:gap-1" aria-label="This week">
        {Array.from({ length: 7 }, (_, i) => {
          const x = addDays(ws, i);
          const p = phaseOf(x).kind !== "phase" ? 0 : LIVE_SECTIONS.reduce((s, sec) => s + budgetFor(sec, state, x), 0);
          const dn = doneMinutes(state, x), f = p ? clamp(dn / p, 0, 1) : dn > 0 ? 1 : 0;
          const c = 2 * Math.PI * 9;
          return (
            <li key={x}>
              <button type="button" onClick={() => onPick(x)} aria-label={`${longDate(x)}, ${p ? p + " minutes planned" : "rest"}, ${dn} done`} aria-current={x === d ? "date" : undefined}
                className={cn("flex w-full flex-col items-center gap-1 rounded-lg py-1.5 text-sm transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", x === d && "bg-secondary")}>
                <span className={cn(x === today ? "font-bold text-foreground" : "text-muted-foreground")}>{DOW[dow(x)].slice(0, 1)}</span>
                <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
                  <circle cx="12" cy="12" r="9" className="fill-none stroke-secondary" strokeWidth="4" />
                  {f > 0 && <circle cx="12" cy="12" r="9" className={cn("fill-none", f >= 1 ? "stroke-success" : "stroke-primary")} strokeWidth="4" strokeDasharray={c} strokeDashoffset={c * (1 - f)} strokeLinecap="round" />}
                </svg>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Up next

/**
 * The one thing to do now (F41's rules, with each plan block's own practice, D56): big, with the page's only filled
 * button and "Something else". The week's focus, when there is one, sits under it as a quiet line.
 */
function UpNext({ today }: { today: string }) {
  const { state, update } = useStore();
  const [skip, setSkip] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const [sectionalMinsLeft] = useState(() => { const d = loadDraft(); const left = d ? secsLeft(d, Date.now()) : 0; return left > 0 ? Math.ceil(left / 60) : null; });
  const steps = nextSteps(state, today, { sectionalMinsLeft });
  const s = steps[skip % steps.length];
  const focus = focusToday(state, today);
  useGsap(box, (gsap, el) => { if (skip) gsap.from(el.querySelectorAll("[data-swap]"), { opacity: 0, y: 8, duration: 0.35, stagger: 0.05, ease: "power2.out" }); }, [skip]);
  const markFocus = () => update((st) => {
    const r = st.weekReviews.find((x) => x.id === focus?.review.id);
    if (r) { r.days = r.days.includes(today) ? r.days.filter((x) => x !== today) : [...r.days, today]; r.updatedAt = Date.now(); }
  });
  const finished = s.key === "done";
  return (
    <div ref={box} className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl bg-card p-5 sm:gap-6 sm:p-8" aria-live="polite">
      <div className="flex flex-col gap-2">
        <p data-swap className="text-base text-muted-foreground">{finished ? "Everything planned is done" : `Up next, about ${s.mins} min`}</p>
        <h2 data-swap className="max-w-[24ch] text-[clamp(1.5rem,1.1rem+1.8vw,2.6rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">{s.title}</h2>
        <p data-swap className="measure text-base text-foreground/80">{s.why}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {s.to.startsWith("#") ? <Button asChild size="lg"><a href={s.to}>Start</a></Button> : <LinkButton to={s.to} size="lg">{finished ? "Open the library" : "Start"}</LinkButton>}
        {steps.length > 1 && <Button variant="ghost" onClick={() => setSkip((k) => k + 1)}>Something else</Button>}
      </div>
      {focus && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-secondary/60 px-4 py-3">
          <p className="min-w-0 text-base"><span className="text-muted-foreground">Focus of the week{focus.left ? `, ${focus.left} of ${FOCUS_DAYS} days left` : ""}: </span>{focus.rec.text}</p>
          <Button size="sm" variant="ghost" onClick={markFocus}>{focus.doneToday ? "Undo" : "Done for today"}</Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The day's blocks

/** A round tick that draws its check when the block is done. */
function Tick({ done, onClick, label }: { done: boolean; onClick?: () => void; label: string }) {
  const box = useRef<HTMLButtonElement>(null);
  const first = useRef(true);
  useGsap(box, (gsap, el) => {
    if (first.current) { first.current = false; return; }
    if (done) {
      gsap.fromTo(el.querySelector("path"), { strokeDasharray: 24, strokeDashoffset: 24 }, { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" });
      gsap.fromTo(el, { scale: 0.8 }, { scale: 1, duration: 0.45, ease: "back.out(3)" });
    }
  }, [done]);
  const look = cn("flex size-7 shrink-0 items-center justify-center rounded-full transition-colors", done ? "bg-success text-white dark:text-black" : "bg-secondary text-transparent hover:text-muted-foreground");
  const check = <svg viewBox="0 0 16 16" className="size-4" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (!onClick) return <span className={look} aria-hidden>{check}</span>;
  return (
    <button ref={box} type="button" role="checkbox" aria-checked={done} aria-label={label} onClick={onClick}
      className={cn(look, "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-90")}>{check}</button>
  );
}

function BlockRow({ x, d, today, open, onOpen, onSummary }: { x: DayBlock; d: string; today: string; open: boolean; onOpen: () => void; onSummary: () => void }) {
  const { state, update } = useStore();
  const focus = useFocus();
  const { sec, b } = x;
  const rec = state.days[d];
  const done = !!rec?.done?.[b.key];
  const isToday = d === today, canTick = d <= today;
  const timed = rec?.spent?.[b.key] ?? 0;
  const running = focus.run?.key === b.key && focus.run.d === d;
  const go = goFor(b, state, today);
  const onSite = siteWork(b, state, d);
  const sums = state.summaries.filter((s) => s.src === "article" && s.d === d);
  const body = useRef<HTMLDivElement>(null);
  useGsap(body, (gsap, el) => { if (open) gsap.from(el, { height: 0, opacity: 0, duration: 0.3, ease: "power2.out", clearProps: "all" }); }, [open]);
  const toggle = () => update((st) => {
    if (!done) markDone(st, d, b, sec);
    else {
      const r = st.days[d];
      if (r?.done) delete r.done[b.key];
      if (b.carryFrom && st.days[b.carryFrom]?.carried) delete st.days[b.carryFrom].carried![sec.id];
    }
  });
  const id = `block-${sec.id}-${b.key}`;
  return (
    <li className={cn("overflow-hidden rounded-xl bg-card", done && "bg-card/60")}>
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
        <Tick done={done} onClick={canTick ? toggle : undefined} label={`${b.name}: ${done ? "done" : "not done"}`} />
        <button type="button" onClick={onOpen} aria-expanded={open} aria-controls={id}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate text-base font-semibold sm:text-lg", done && "text-muted-foreground line-through decoration-muted-foreground/60")}>{b.name}</span>
            <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground/80">{sec.short}</span>
              <span className="tabular-nums">{b.mins} min</span>
              {b.pri === 1 && !done && <span className="text-foreground">core</span>}
              {b.carryFrom && <span className="text-warning">catch-up</span>}
              {onSite && <span className="text-success">done on the site: {onSite}</span>}
              {timed > 0 && <span>timed {timed}</span>}
            </span>
          </span>
          <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
        </button>
      </div>
      {open && (
        <div ref={body} id={id} className="flex flex-col gap-3 overflow-hidden px-4 pb-4 sm:pl-[4.25rem] sm:pr-5">
          <p className="measure text-base text-foreground/85">{b.desc}</p>
          {b.carryFrom && <Meta>Missed on {shortDate(b.carryFrom)}.</Meta>}
          <div className="flex flex-wrap items-center gap-2">
            {go && !done && <LinkButton to={go.to} variant="secondary" size="sm">{go.label}</LinkButton>}
            <LinkButtons links={b.links.filter(([, u]) => u !== go?.to)} />
          </div>
          {b.id === "read" && canTick && (sums.length
            ? <p className="text-base text-success">Summary saved, {sums[sums.length - 1].checks.filter(Boolean).length} of 4 checks. <TextLink to="/journal">Reading journal</TextLink></p>
            : <div><Button variant="secondary" size="sm" className="gap-1.5" onClick={onSummary}><PenLine className="size-4" aria-hidden />Write your summary</Button></div>)}
          {isToday && !done && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {running ? <span className="inline-flex items-center gap-1.5 text-base text-success"><TimerIcon className="size-4" />Focus timer running</span>
                : focus.run ? <Meta>Another block's timer is running</Meta>
                : <Button variant="link" size="sm" className="gap-1.5" onClick={() => focus.start({ key: b.key, name: sec.short + ": " + b.name, sec: sec.id, d, target: b.mins, log: !!b.kind, carryFrom: b.carryFrom })}>
                    <TimerIcon className="size-4" />Start focus timer</Button>}
              {timed > 0 && <Meta>Timed {timed} of {b.mins} min</Meta>}
            </div>
          )}
          {canTick && !done && b.kind && <LogForm sec={sec} b={b} d={d} />}
          {done && b.kind && <p className="text-base text-success">Logged and done.</p>}
        </div>
      )}
    </li>
  );
}

/** The catch-up notices, one per section that has one, with "Skip it". */
function CarryNotes({ today }: { today: string }) {
  const { state, update } = useStore();
  // A catch-up already done today needs no notice.
  const carries = LIVE_SECTIONS.map((sec) => ({ sec, c: carryInfo(sec, state, today) })).filter((x) => x.c && !x.c.done);
  if (!carries.length) return null;
  return (
    <>
      {carries.map(({ sec, c }) => {
        const older = missedDays(sec, state, today).length - 1;
        return (
          <div key={sec.id} className="flex flex-col items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-base sm:flex-row sm:items-center sm:justify-between">
            <span>{sec.short} catch-up added from {shortDate(c!.date)}: {c!.block.name}.{older > 0 ? ` ${older} older missed ${older === 1 ? "day comes" : "days come"} one a day after it.` : ""}</span>
            <Button variant="link" size="sm" onClick={() => update((st) => skipCarry(st, sec, today))}>{older > 0 ? "Skip them all" : "Skip it"}</Button>
          </div>
        );
      })}
    </>
  );
}

function DayBlocks({ blocks, d, today }: { blocks: DayBlock[]; d: string; today: string }) {
  const { state } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [summing, setSumming] = useState<DayBlock | null>(null);
  const done = state.days[d]?.done ?? {};
  const left = blocks.filter((x) => !done[x.b.key]), finished = blocks.filter((x) => done[x.b.key]);
  const row = (x: DayBlock) => {
    const k = x.sec.id + ":" + x.b.key;
    return <BlockRow key={k} x={x} d={d} today={today} open={open === k} onOpen={() => setOpen(open === k ? null : k)} onSummary={() => setSumming(x)} />;
  };
  return (
    <section aria-labelledby="day-h" className="flex flex-col gap-3" id="plan">
      {/* Old links into one section's plan still land here. */}
      {LIVE_SECTIONS.map((s) => <span key={s.id} id={"plan-" + s.id} className="block scroll-mt-24" aria-hidden />)}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="day-h" className="text-heading font-semibold">{left.length ? (d === today ? "The rest of today" : "The plan") : "All done"}</h2>
        {/* On a phone the time buttons wait under the list, so the blocks come first. */}
        <div className="flex flex-wrap items-center gap-2 max-sm:hidden">{LIVE_SECTIONS.map((s) => <TimeControl key={s.id} sec={s} d={d} />)}</div>
      </div>
      {d === today && <CarryNotes today={today} />}
      {left.length > 0 && <ol className="flex flex-col gap-2">{left.map(row)}</ol>}
      {finished.length > 0 && (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setShowDone(!showDone)} aria-expanded={showDone}
            className="flex items-center gap-2 self-start rounded-md px-1 text-base text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <ChevronDown className={cn("size-4 transition-transform duration-300 motion-reduce:transition-none", showDone && "rotate-180")} aria-hidden />
            Done, {finished.length} {finished.length === 1 ? "block" : "blocks"}, {finished.reduce((s, x) => s + (done[x.b.key] ?? 0), 0)} min
          </button>
          {showDone && <ol className="flex flex-col gap-2">{finished.map(row)}</ol>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 sm:hidden"><span className="text-sm text-muted-foreground">Time today:</span>{LIVE_SECTIONS.map((s) => <TimeControl key={s.id} sec={s} d={d} />)}</div>
      <ArticleSummarySheet open={!!summing} onOpenChange={(o) => { if (!o) setSumming(null); }} d={d}
        sources={(summing?.b.links ?? []).filter(([, u]) => !u.startsWith("/")).map(([l]) => l)}
        saveLabel={summing && !done[summing.b.key] ? "Save and finish block" : "Save summary"}
        onSave={(st) => { if (summing && !st.days[d]?.done?.[summing.b.key]) markDone(st, d, summing.b, summing.sec); }} />
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The rest of the page

/** From Saturday evening to Monday: the weekly review is ready. "Not now" hides it until next Saturday. */
function ReviewCard({ today }: { today: string }) {
  const { state, update } = useStore();
  const monday = reviewWeek(today, new Date().getHours());
  if (!monday || reviewOf(state, monday)) return null;
  const skip = () => update((st) => { if (!st.weekReviews.some((r) => r.id === monday)) st.weekReviews.push({ id: monday, d: today, updatedAt: Date.now(), days: [], closed: true, skipped: true }); });
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading font-semibold">Your week in review is ready</h2>
        <p className="text-base text-muted-foreground">Two minutes: what moved this week, and one focus for the next.</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <LinkButton to="/review" variant="secondary">Open the review</LinkButton>
        <Button variant="ghost" onClick={skip}>Not now</Button>
      </div>
    </div>
  );
}

/**
 * When every block is done: the day closes with one highlighter sweep, what was done in each block (with the score
 * when it was done on the site), one optional extra for a student with time left, and tomorrow's first block.
 */
function DayDone({ today }: { today: string }) {
  const { state } = useStore();
  const box = useRef<HTMLDivElement>(null);
  useGsap(box, (gsap, el) => {
    gsap.from(el.querySelector("[data-sweep]"), { scaleX: 0, transformOrigin: "left center", duration: 0.8, ease: "power2.inOut", delay: 0.2 });
    gsap.from(el.querySelectorAll("[data-done]"), { opacity: 0, x: -8, duration: 0.4, stagger: 0.06, delay: 0.4, ease: "power2.out" });
  }, []);
  const blocks = dayPlan(state, today, today).blocks;
  const tomorrow = addDays(today, 1);
  const first = dayPlan(state, tomorrow, tomorrow).blocks[0];
  const extra = nextSteps(state, today).find((x) => x.key !== "done" && !x.key.startsWith("core:"));
  return (
    <div ref={box} className="flex flex-col gap-4 rounded-2xl bg-card p-6 sm:p-8">
      <h2 className="text-title font-extrabold"><span className="relative inline-block"><span data-sweep className="absolute inset-x-0 bottom-0.5 h-2.5 rounded-sm bg-highlight/60" aria-hidden /><span className="relative">Day done.</span></span></h2>
      <ul className="flex flex-col gap-1.5">
        {blocks.map(({ sec, b }) => {
          const w = siteWork(b, state, today);
          return (
            <li key={sec.id + b.key} data-done className="flex flex-wrap items-baseline gap-x-2 text-base">
              <span className="font-semibold">{b.name}</span>
              <span className="text-sm text-muted-foreground">{sec.short}, {state.days[today]?.done?.[b.key] ?? b.mins} min{w ? `, ${w}` : ""}</span>
            </li>
          );
        })}
      </ul>
      {extra && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-secondary/60 px-4 py-3">
          <p className="min-w-0 text-base"><span className="text-muted-foreground">If you have time: </span>{extra.title}, about {extra.mins} min</p>
          {extra.to.startsWith("#") ? null : <LinkButton to={extra.to} variant="secondary" size="sm">Start</LinkButton>}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <DoneLine d={today} isToday />
        {first && <p className="text-base text-muted-foreground">Tomorrow starts with {first.sec.short}: {first.b.name}, {first.b.mins} min.</p>}
      </div>
    </div>
  );
}

/**
 * One-time setup for the phase (D57), from both sections' `setup` lists: open the official site, start a course, get
 * the book. Ticks are the Learn tabs' own, so a tick here shows there and syncs. While anything is left it is a card
 * with a count; once all are ticked it folds to one line.
 */
function SetupCard({ d }: { d: string }) {
  const { state, update } = useStore();
  const ph = phaseOf(d);
  const varc = useResources(LIVE_SECTIONS[0]);
  const dilr = useResources(LIVE_SECTIONS[1] ?? LIVE_SECTIONS[0]);
  const [open, setOpen] = useState(false);
  if (ph.kind !== "phase") return null;
  const seen = new Set<string>();
  const items = LIVE_SECTIONS.flatMap((sec, i) => {
    const res = i === 0 ? varc : dilr;
    return (sec.setup?.[ph.phase.id] ?? []).flatMap((id) => {
      const r = res?.resources.find((x) => x.id === id);
      // The same link listed by two sections (the official site) is one job.
      if (!r || seen.has(r.u)) return [];
      seen.add(r.u);
      return [{ sec, r }];
    });
  });
  if (!items.length) return null;
  const doneN = items.filter((x) => state.ticks[x.r.id]).length, all = doneN === items.length;
  const toggle = (id: string) => update((st) => { if (st.ticks[id]) delete st.ticks[id]; else st.ticks[id] = 1; });
  const show = !all || open;
  return (
    <section aria-labelledby="setup-h" className="flex flex-col gap-3 rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <h2 id="setup-h" className="text-heading font-semibold">{all ? "Setup for this phase is done" : "Set up your prep"}</h2>
          <p className="text-base text-muted-foreground">{all ? `All ${items.length} one-time jobs for the ${ph.phase.name} phase are ticked.` : `One-time jobs for the ${ph.phase.name} phase. ${doneN} of ${items.length} done.`}</p>
        </div>
        {all && <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Hide" : "Show"}</Button>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", all ? "bg-success" : "bg-primary")} style={{ width: `${(doneN / items.length) * 100}%` }} />
      </div>
      {show && (
        <ul className="flex flex-col gap-1">
          {items.map(({ sec, r }) => {
            const on = !!state.ticks[r.id];
            // Only the next job says why it matters; the rest stay one line, so the card stays short.
            const next = !on && r.id === items.find((x) => !state.ticks[x.r.id])?.r.id;
            return (
              <li key={r.id} className={cn("flex items-start gap-3 rounded-xl px-2 py-2", next && "bg-secondary/60 py-3")}>
                <Tick done={on} onClick={() => toggle(r.id)} label={`${r.n}: ${on ? "done" : "not done"}`} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Ext href={r.u} className={cn("text-base font-semibold hover:text-primary", on && "text-muted-foreground line-through decoration-muted-foreground/60")}>{r.n}</Ext>
                  {next && <p className="measure text-base text-foreground/80">{r.w}</p>}
                  <span className="text-sm text-muted-foreground">{sec.short}, {r.t}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** What was done on the day shown, in one line, linking to that day in History (F51). Nothing on an empty day. */
function DoneLine({ d, isToday }: { d: string; isToday: boolean }) {
  const { state } = useStore();
  const text = useMemo(() => daySummary(historyDays(state).find((x) => x.d === d)), [state, d]);
  if (!text) return null;
  return (
    <p className="text-base">
      <span className="font-semibold">{isToday ? "Done today" : "Done that day"}:</span> {text}.{" "}
      <TextLink to={`/history?d=${d}`}>See it in History</TextLink>
    </p>
  );
}

/** The day's note when there is no plan: before the phases, exam day, after it, or a rest day. */
function NoPlan({ d }: { d: string }) {
  const ph = phaseOf(d);
  const [h, p]: [string, ReactNode] = ph.kind === "exam" ? ["Exam day.", "Eat well, reach early, and trust your attempt order."]
    : ph.kind === "after" ? ["CAT 2027 is over.", null]
    : ph.kind === "pre" ? ["The plan starts on " + mediumDate(PHASES[0].start) + ".", null]
    : ["Rest day.", "Nothing is planned. The core task moves to your next session. Pick a time above if you can study after all."];
  return <div className="flex flex-col gap-1 rounded-2xl bg-card p-6"><p className="text-heading font-semibold">{h}</p>{p && <p className="text-base text-muted-foreground">{p}</p>}</div>;
}

export default function Today() {
  const today = useToday();
  const [d, setD] = useState(today);
  const { state } = useStore();
  const root = useRef<HTMLDivElement>(null);
  const isToday = d === today, past = d < today;
  const { blocks, planned } = dayPlan(state, d, today);
  const done = doneMinutes(state, d);
  const allDone = blocks.length > 0 && blocks.every((x) => state.days[d]?.done?.[x.b.key]);
  const ph = phaseOf(d);
  // One entrance for the whole page, in reading order.
  useGsap(root, (gsap, el) => { gsap.from(el.querySelectorAll("[data-rise]"), { opacity: 0, y: 14, duration: 0.5, stagger: 0.08, ease: "power3.out", clearProps: "all" }); }, []);

  return (
    <Page className="gap-6 lg:gap-10">
      <div ref={root} className="flex flex-col gap-6 lg:gap-10">
        <header data-rise className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-title font-extrabold">{isToday ? "Today" : past ? "A past day" : "Planning ahead"}</h1>
            <StreakBadge />
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 text-base text-muted-foreground">
            <Button variant="ghost" size="icon-sm" className="-ml-2" aria-label="Previous day" onClick={() => setD(addDays(d, -1))}><ChevronLeft className="size-5" /></Button>
            <span className="font-semibold text-foreground">{longDate(d)}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Next day" onClick={() => setD(addDays(d, 1))}><ChevronRight className="size-5" /></Button>
            {ph.kind === "phase" && <Link to="/plan" className="rounded-sm underline-offset-4 hover:text-foreground hover:underline">{ph.phase.name}<span className="max-sm:hidden">, phase {ph.phase.id} of {PHASES.length}</span></Link>}
            {!isToday && <Button variant="link" size="sm" onClick={() => setD(today)}>Back to today</Button>}
          </div>
        </header>

        <div data-rise className="grid gap-3 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-6">
          <DayRing done={done} planned={planned} d={d} today={today} onPick={setD} />
          {isToday ? (allDone ? <DayDone today={today} /> : <UpNext today={today} />) : (
            <div className="flex flex-col justify-center gap-2 rounded-2xl bg-card p-6 sm:p-8">
              <p className="text-base text-muted-foreground">{past ? "What was planned that day" : "What is planned for this day"}</p>
              <p className="text-[clamp(1.75rem,1.3rem+1.6vw,2.6rem)] leading-[1.05] font-extrabold tracking-[-0.035em]">{blocks.length ? `${blocks.length} blocks, ${planned} min` : "Nothing planned"}</p>
              <DoneLine d={d} isToday={false} />
            </div>
          )}
        </div>

        {isToday && <ReviewCard today={today} />}

        <div data-rise>{blocks.length ? <DayBlocks blocks={blocks} d={d} today={today} /> : <NoPlan d={d} />}</div>

        {isToday && !allDone && <div data-rise><DoneLine d={d} isToday /></div>}
        {/* The sign-in nudge waits until after the plan, so it never stands between the student and the work. */}
        {isToday && <SyncPrompt />}
        <div data-rise><SetupCard d={d} /></div>
      </div>
    </Page>
  );
}
