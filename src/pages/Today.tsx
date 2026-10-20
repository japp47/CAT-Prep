import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, PenLine, Timer as TimerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ArticleSummarySheet } from "../components/ArticleSummary";
import { phaseCaption } from "../components/Countdown";
import { ErrorText, Ext, Field, LinkButton, LinkButtons, Meta, Page, PageHeader, Section, TextLink } from "../components/kit";
import { NativeSelect } from "../components/Select";
import { PHASES, phaseOf } from "../data/exam";
import { addDays, clamp, DOW, dow, isWeekend, longDate, shortDate, todayIso, uid, weekStart, mediumDate } from "../lib/date";
import { useStore } from "../lib/store";
import type { AppState } from "../lib/state";
import { buildDay, budgetFor, carryInfo, defaultMin, doneKey, doneMinutes, coreOf, markBlockDone, type PlacedBlock } from "../planner/engine";
import { useFocus } from "../lib/focus";
import { LIVE_SECTIONS, SECTIONS } from "../sections";
import type { SectionDef } from "../sections/types";
import { useResources } from "../sections/useResources";
import { rcOfDay } from "../practice/daily";
import { dueRedo } from "../practice/redo";
import { FOCUS_DAYS, focusToday, reviewOf, reviewWeek } from "../practice/week";
import { GENRES } from "../practice/types";
import { DAILY_MIX } from "../practice/va/build";
import { StreakBadge } from "../components/StreakBadge";

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

function markDone(st: AppState, d: string, b: PlacedBlock, sec: SectionDef) {
  markBlockDone(st, d, sec.id, b.key, b.mins, b.carryFrom);
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
        <Button type="submit" className="col-span-2 sm:col-span-1">Log and finish</Button>
      </div>
      <ErrorText>{err}</ErrorText>
    </form>
  );
}

/** "120 min planned" with the day's time choices folded into a popover. */
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
        <Button variant="secondary" size="sm" className="gap-1.5">{budget === 0 ? "Rest day" : `${budget} min planned`}<ChevronDown className="size-4" aria-hidden /></Button>
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

function SectionDay({ sec, d, today }: { sec: SectionDef; d: string; today: string }) {
  const { state, update } = useStore();
  const focus = useFocus();
  const isToday = d === today;
  const rec = state.days[d];
  const budget = budgetFor(sec, state, d);
  const dm = rec?.done ?? {};
  const carry = isToday ? carryInfo(sec, state, today) : null;
  const blocks = buildDay(sec, state, d, budget, { today });
  const ph = phaseOf(d);
  const canTick = d <= today;
  // The reading block whose summary sheet is open, if any (step 2e, place 2).
  const [summing, setSumming] = useState<PlacedBlock | null>(null);
  const articleSums = state.summaries.filter((s) => s.src === "article" && s.d === d);

  const toggle = (b: PlacedBlock, on: boolean) => update((st) => {
    if (on) markDone(st, d, b, sec);
    else {
      const r = st.days[d];
      if (r?.done) delete r.done[b.key];
      if (b.carryFrom && st.days[b.carryFrom]?.carried) delete st.days[b.carryFrom].carried![sec.id];
    }
  });
  const total = blocks.reduce((s, b) => s + b.mins, 0);
  const doneCount = blocks.filter((b) => dm[b.key]).length;
  const timedTotal = blocks.reduce((s, b) => s + (rec?.spent?.[b.key] ?? 0), 0);

  let body: React.ReactNode;
  if (ph.kind !== "phase") {
    body = <div className="rounded-lg bg-card p-6"><p className="text-heading font-semibold">{ph.kind === "exam" ? "Exam day." : ph.kind === "after" ? "CAT 2027 is over." : "The plan starts on " + mediumDate(PHASES[0].start) + "."}</p>
      {ph.kind === "exam" && <p className="text-base text-muted-foreground">Eat well, reach early, and trust your attempt order.</p>}</div>;
  } else if (!blocks.length) {
    body = <div className="rounded-lg bg-card p-6"><p className="text-heading font-semibold">Rest day.</p><p className="text-base text-muted-foreground">Nothing is planned. The core task moves to your next session. Pick a time above if you can study after all.</p></div>;
  } else {
    body = (
      <ol className="flex flex-col gap-2">
        {blocks.map((b) => {
          const done = !!dm[b.key];
          const timed = rec?.spent?.[b.key] ?? 0;
          const running = focus.run?.key === b.key && focus.run.d === d;
          const core = b.pri === 1;
          const tickId = "tick-" + sec.id + "-" + b.key;
          return (
            <li key={b.key} className={cn("relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 overflow-hidden rounded-lg bg-card py-3 pr-3 pl-4 sm:gap-x-3.5 sm:py-4 sm:pr-6 sm:pl-5", core && !done && "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-highlight")}>
              {canTick ? <Checkbox id={tickId} checked={done} onCheckedChange={(v) => toggle(b, v === true)} className="mt-1" /> : <span />}
              <div className={cn("flex min-w-0 flex-col gap-1.5 sm:gap-2", done && "opacity-60")}>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {/* The block's name is the checkbox's label, so tapping it ticks the block too. */}
                  {canTick
                    ? <label htmlFor={tickId} className={cn("cursor-pointer text-base font-semibold sm:text-lg", done && "line-through decoration-muted-foreground")}>{b.name}</label>
                    : <span className="text-base font-semibold sm:text-lg">{b.name}</span>}
                  <span className="text-sm text-muted-foreground tabular-nums sm:text-base">{b.mins} min</span>
                  {core && <Badge variant="highlight">Core</Badge>}
                  {b.pri === 9 && <Badge variant="secondary">Extra time</Badge>}
                  {b.carryFrom && <Badge variant="warning">Catch-up</Badge>}
                </div>
                <p className="measure text-sm text-foreground/80 sm:text-base">{b.desc}</p>
                <LinkButtons links={b.links} />
                {b.id === "read" && canTick && (articleSums.length ? (
                  <p className="text-sm text-success sm:text-base">
                    Summary saved, {articleSums[articleSums.length - 1].checks.filter(Boolean).length} of 4 checks. <TextLink to="/journal" className="text-base">Reading journal</TextLink>
                  </p>
                ) : (
                  <div><Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setSumming(b)}><PenLine className="size-4" aria-hidden />Write your summary</Button></div>
                ))}
                {isToday && !done && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {running ? <span className="inline-flex items-center gap-1.5 text-sm text-success sm:text-base"><TimerIcon className="size-4" />Focus timer running</span>
                      : focus.run ? <Meta>Another block's timer is running</Meta>
                      : <Button variant="link" size="sm" className="gap-1.5"
                          onClick={() => focus.start({ key: b.key, name: sec.short + ": " + b.name, sec: sec.id, d, target: b.mins, log: !!b.kind, carryFrom: b.carryFrom })}>
                          <TimerIcon className="size-4" />Start focus timer</Button>}
                    {timed > 0 && <Meta>Timed {timed} of {b.mins} min</Meta>}
                  </div>
                )}
                {done && timed > 0 && <Meta>Timed {timed} of {b.mins} min.</Meta>}
                {canTick && !done && b.kind && <LogForm sec={sec} b={b} d={d} />}
                {done && b.kind && <p className="text-sm text-success sm:text-base">Logged and done.</p>}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <Section
      title={<>{sec.short}{blocks.length > 0 && ph.kind === "phase" && <span className="font-normal text-muted-foreground">, {ph.phase.name} phase</span>}</>}
      action={<div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end"><TimeControl sec={sec} d={d} /><TextLink to={"/" + sec.id} className="relative text-sm after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] sm:text-base">Resources</TextLink></div>}>
      {blocks.length > 0 && <Meta className="-mt-2">{blocks.length} block{blocks.length === 1 ? "" : "s"}, {total} min, {doneCount} done{timedTotal > 0 ? `, ${timedTotal} min timed` : ""}</Meta>}
      {carry && (
        <div className="flex flex-col items-start gap-2 rounded-lg bg-warning-soft px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:text-base">
          <span>Catch-up added from {shortDate(carry.date)}: {carry.block.name}.</span>
          <Button variant="link" size="sm" className="self-end sm:self-auto" onClick={() => update((st) => { ((st.days[carry.date] ??= {}).dismiss ??= {})[sec.id] = 1; })}>Skip it</Button>
        </div>
      )}
      {body}
      <ArticleSummarySheet open={!!summing} onOpenChange={(o) => { if (!o) setSumming(null); }} d={d}
        sources={(summing?.links ?? []).filter(([, u]) => !u.startsWith("/")).map(([l]) => l)}
        saveLabel={summing && !dm[summing.key] ? "Save and finish block" : "Save summary"}
        onSave={(st) => { if (summing && !st.days[d]?.done?.[summing.key]) markDone(st, d, summing, sec); }} />
    </Section>
  );
}

function Week({ d, today, onPick }: { d: string; today: string; onPick: (d: string) => void }) {
  const { state } = useStore();
  const ws = weekStart(d);
  let target = 0, done = 0, studied = 0;
  const cells = Array.from({ length: 7 }, (_, i) => {
    const x = addDays(ws, i);
    const b = phaseOf(x).kind !== "phase" ? 0 : LIVE_SECTIONS.reduce((s, sec) => s + budgetFor(sec, state, x), 0);
    const dn = doneMinutes(state, x);
    target += b; done += dn; if (dn > 0) studied++;
    const f = b > 0 ? clamp(dn / b, 0, 1) * 100 : dn > 0 ? 100 : 0;
    return (
      <button key={x} type="button" onClick={() => onPick(x)} aria-label={longDate(x) + ", " + b + " minutes planned, " + dn + " done"}
        className={cn("flex min-w-0 flex-col items-center gap-1 rounded-md px-0.5 py-2 text-sm hover:bg-muted", x === d && "bg-accent text-accent-foreground hover:bg-accent", x === today && "font-semibold")}>
        <span>{DOW[dow(x)].slice(0, 3)}</span>
        <span className="text-muted-foreground tabular-nums">{b === 0 ? "rest" : b}</span>
        <span className="h-1 w-full max-w-7 overflow-hidden rounded-full bg-secondary"><span className="block h-full bg-primary" style={{ width: f.toFixed(0) + "%" }} /></span>
      </button>
    );
  });
  return (
    <Section title="This week">
      <div className="flex flex-col gap-4 rounded-lg bg-card p-4 sm:p-5">
        <p className="text-sm sm:text-base">Done <b className="font-semibold tabular-nums">{done}</b> of <b className="font-semibold tabular-nums">{target}</b> min, studied <b className="font-semibold">{studied}</b> of 7 days</p>
        <Progress value={target ? clamp(done / target, 0, 1) * 100 : 0} aria-label="Minutes done this week" className="h-2" />
        <div className="grid grid-cols-7 gap-1">{cells}</div>
      </div>
    </Section>
  );
}

function MustDo() {
  const { state } = useStore();
  // Only VARC has a list so far; it loads on demand, and this section sits low on the page.
  const varc = LIVE_SECTIONS[0];
  const res = useResources(varc);
  if (!res) return null;
  const items = res.resources.map((r) => ({ r, s: varc })).filter(({ r }) => r.p === "must" && !state.ticks[r.id]).slice(0, 5);
  return (
    <Section title="Must-do resources left">
      <ul className="flex flex-col gap-1 rounded-lg bg-card p-2">
        {items.length ? items.map(({ r, s }) => {
          const cat = res.categories.find((c) => c.id === r.c)?.n ?? "";
          return (
            <li key={r.id}>
              <Ext href={r.u} className="flex flex-col gap-0.5 rounded-md px-3 py-2 hover:bg-muted">
                <span className="text-sm font-semibold sm:text-base">{r.n}</span>
                <Meta>{s.short}, {cat.toLowerCase()}{r.find ? ", opens a search" : ""}</Meta>
              </Ext>
            </li>
          );
        }) : <li className="px-3 py-2.5 text-base text-muted-foreground">Every must-do resource is ticked.</li>}
      </ul>
    </Section>
  );
}

export default function Today() {
  const today = useToday();
  const [d, setD] = useState(today);
  const { state } = useStore();
  const isToday = d === today, past = d < today;
  const coreLeft = LIVE_SECTIONS.filter((s) => { const c = coreOf(s, state, today); return c && !state.days[today]?.done?.[doneKey(s, c.id)]; }).length;
  const ph = phaseOf(today);
  const goal = ph.kind === "phase" ? LIVE_SECTIONS[0]?.phaseText?.[ph.phase.id]?.goal : undefined;
  const soon = SECTIONS.filter((s) => s.status === "soon");

  return (
    <Page className="gap-8 lg:gap-12">
      <PageHeader title={isToday ? "Today" : past ? "A past day" : "Planning ahead"} aside={<StreakBadge />}><span className="text-sm sm:text-base">{phaseCaption(goal)}</span></PageHeader>

      <div className="-mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous day" onClick={() => setD(addDays(d, -1))}><ChevronLeft className="size-5" /></Button>
          <span className="min-w-0 text-center text-base font-semibold sm:min-w-[11.5rem] sm:text-heading">{longDate(d)}</span>
          <Button variant="ghost" size="icon-sm" aria-label="Next day" onClick={() => setD(addDays(d, 1))}><ChevronRight className="size-5" /></Button>
        </div>
        {!isToday && <Button variant="link" size="sm" onClick={() => setD(today)}>Back to today</Button>}
        {isToday && coreLeft > 0 && <Badge variant="highlight">{coreLeft} core task{coreLeft > 1 ? "s" : ""} left</Badge>}
      </div>

      {isToday && <ReviewCard today={today} />}

      {LIVE_SECTIONS.map((s) => <SectionDay key={s.id} sec={s} d={d} today={today} />)}

      {isToday && <PracticeToday today={today} />}

      {soon.length > 0 && <p className="measure text-base text-muted-foreground">{soon.map((s) => s.short).join(" and ")} timetables are coming soon. You can already log their mock scores in <TextLink to="/progress">Progress</TextLink> and mistakes in the <TextLink to="/errors">Error log</TextLink>.</p>}

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
        <Week d={d} today={today} onPick={setD} />
        <MustDo />
      </div>
    </Page>
  );
}

/** From Saturday evening to Monday: the weekly review is ready. "Not now" hides it until next Saturday. */
function ReviewCard({ today }: { today: string }) {
  const { state, update } = useStore();
  const monday = reviewWeek(today, new Date().getHours());
  if (!monday || reviewOf(state, monday)) return null;
  const skip = () => update((st) => { if (!st.weekReviews.some((r) => r.id === monday)) st.weekReviews.push({ id: monday, d: today, updatedAt: Date.now(), days: [], closed: true, skipped: true }); });
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
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

/** The two daily sets, so the timetable's RC and VA blocks have something to open on this site. */
function PracticeToday({ today }: { today: string }) {
  const { state, update } = useStore();
  const rc = rcOfDay(today);
  const rcTry = state.rcAttempts.filter((a) => a.set === rc.id && a.d === today).pop();
  const vaTry = state.vaAttempts.filter((a) => a.mode === "daily" && a.d === today).pop();
  const redo = dueRedo(state.redo, today).length;
  const focus = focusToday(state, today);
  const markFocus = () => update((st) => {
    const r = st.weekReviews.find((x) => x.id === focus?.review.id);
    if (r) { r.days = r.days.includes(today) ? r.days.filter((x) => x !== today) : [...r.days, today]; r.updatedAt = Date.now(); }
  });
  const rows: { label: string; to: string; title: string; done?: string; go: string }[] = [
    { label: `RC of the day, ${GENRES[rc.genre].toLowerCase()}`, to: rcTry ? `/practice/rc/${rc.id}?review=${rcTry.id}` : `/practice/rc/${rc.id}`, title: rc.title, done: rcTry && `${rcTry.c} of ${rc.questions} correct`, go: rcTry ? "Review" : "Start" },
    { label: "Daily VA drill", to: "/practice/va", title: `${DAILY_MIX.length} questions, all four VA types`, done: vaTry && `${vaTry.items.filter((i) => i.ok).length} of ${vaTry.items.length} correct`, go: vaTry ? "Review" : "Start" },
  ];
  if (redo > 0) rows.push({ label: "Redo queue", to: "/practice/redo", title: `${redo} question${redo > 1 ? "s" : ""} you missed earlier`, go: "Start" });
  return (
    <Section title="Practice on this site today" action={<TextLink to="/practice" className="text-base">All practice</TextLink>} description="Scores log themselves in Progress. Tick the matching timetable block when you are done.">
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {focus && (
          <li className="grid gap-3 rounded-lg bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-6 sm:p-5 md:col-span-2 xl:col-span-3">
            <div className="flex min-w-0 flex-col gap-1">
              <Meta>Focus of the week, from your weekly review{focus.left ? `, ${focus.left} of ${FOCUS_DAYS} days left` : ""}</Meta>
              <p className="text-base font-semibold text-pretty">{focus.rec.text}</p>
              {focus.doneToday && <p className="text-base text-success">Done today.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {focus.rec.to && !focus.doneToday && <LinkButton to={focus.rec.to} size="sm" variant="secondary">Practise it</LinkButton>}
              <Button size="sm" variant="ghost" onClick={markFocus}>{focus.doneToday ? "Undo" : "Mark done for today"}</Button>
            </div>
          </li>
        )}
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg bg-card p-4 sm:gap-x-4 sm:p-5">
            <div className="flex min-w-0 flex-col gap-1">
              <Meta>{r.label}</Meta>
              <Link to={r.to} className="text-sm font-semibold text-pretty hover:text-primary sm:text-base">{r.title}</Link>
              {r.done && <p className="text-sm text-success sm:text-base">Done: {r.done}</p>}
            </div>
            {/* Quiet: the timetable above already has this screen's one filled button. */}
            <LinkButton to={r.to} size="sm" variant="secondary">{r.go}</LinkButton>
          </li>
        ))}
      </ul>
    </Section>
  );
}
