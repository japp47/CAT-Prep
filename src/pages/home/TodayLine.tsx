import { useRef } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowLink, LinkButton } from "../../components/kit";
import { StreakBadge } from "../../components/StreakBadge";
import { phaseOf } from "../../data/exam";
import { addDays, longDate, todayIso, weekStart } from "../../lib/date";
import { useGsap } from "../../lib/motion";
import { useStore } from "../../lib/store";
import { budgetFor, buildDay, doneMinutes } from "../../planner/engine";
import { dueRedo } from "../../practice/redo";
import { activityDays } from "../../practice/streak";
import { DAILY_MIX } from "../../practice/va/build";
import { reviewOf, reviewWeek } from "../../practice/weekopen";
import { LIVE_SECTIONS } from "../../sections";
import { Head } from "./Head";

/**
 * Today on the home page (D42): the day's blocks as a timeline (done, next, later) with a ring for the minutes done,
 * and beside it the week as seven bars and what else is waiting. The rail draws and the ring fills on arrival.
 */

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

/** Minutes done against minutes planned, as a ring. */
function Ring({ done, planned }: { done: number; planned: number }) {
  const r = 30, c = 2 * Math.PI * r, f = planned ? Math.min(done / planned, 1) : 0;
  return (
    <svg viewBox="0 0 72 72" className="size-[4.5rem] shrink-0 -rotate-90" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--secondary)" strokeWidth="7" />
      <circle data-ring cx="36" cy="36" r={r} fill="none" stroke="var(--success)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - f)} />
    </svg>
  );
}

export function TodayLine() {
  const { state } = useStore();
  const box = useRef<HTMLElement>(null);
  const t = todayIso();
  const planned = LIVE_SECTIONS.reduce((s, sec) => s + budgetFor(sec, state, t), 0);
  const done = doneMinutes(state, t);
  const doneMap = state.days[t]?.done ?? {};
  const blocks = LIVE_SECTIONS.flatMap((sec) => buildDay(sec, state, t, budgetFor(sec, state, t), { today: t }).map((b) => ({ ...b, sec: sec.short })));
  const next = blocks.find((b) => !doneMap[b.key]);
  const longest = Math.max(1, ...blocks.map((b) => b.mins));
  const active = activityDays(state);
  const mon = weekStart(t);
  const vaTry = state.vaAttempts.filter((a) => a.mode === "daily" && a.d === t).pop();
  const redo = dueRedo(state.redo, t).length;
  const reviewFor = reviewWeek(t, new Date().getHours());
  const reviewReady = !!reviewFor && !reviewOf(state, reviewFor);
  const ph = phaseOf(t);

  useGsap(box, (gsap, el) => {
    gsap.from(el.querySelector("[data-rail]"), { scaleY: 0, transformOrigin: "50% 0%", duration: 0.9, ease: "power2.out" });
    gsap.from(el.querySelectorAll("[data-node]"), { scale: 0, duration: 0.4, stagger: 0.1, delay: 0.15, ease: "back.out(2.4)" });
    gsap.from(el.querySelectorAll("[data-day]"), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.5, stagger: 0.05, ease: "power2.out" });
    const ring = el.querySelector("[data-ring]");
    if (ring) gsap.from(ring, { strokeDashoffset: 2 * Math.PI * 30, duration: 1, ease: "power2.out" });
  }, []);

  return (
    <section ref={box} aria-labelledby="today-h" className="flex flex-col gap-8">
      <Head id="today-h" lead={`Today, ${longDate(t)}.`} rest={planned ? `${done} of ${planned} minutes done.` : "A rest day: nothing is planned."} aside={<StreakBadge />} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
        <div className="flex flex-col gap-6 rounded-2xl bg-card p-6 sm:p-8">
          <div className="flex items-center gap-5">
            <Ring done={done} planned={planned} />
            <div className="flex flex-col gap-1">
              <p className="text-heading font-semibold">Your timetable</p>
              <p className="text-base text-muted-foreground">{ph.kind === "phase" ? `${ph.phase.name} phase: ${ph.phase.focus.charAt(0).toLowerCase()}${ph.phase.focus.slice(1)}` : "Built from your phase and the time you have."}</p>
            </div>
          </div>
          {blocks.length > 0 ? (
            <ol className="relative flex flex-col" aria-label="Today's blocks">
              <span data-rail className="absolute top-4 bottom-4 left-[0.6875rem] w-0.5 bg-secondary" aria-hidden />
              {blocks.map((b) => {
                const ok = !!doneMap[b.key], now = b === next;
                return (
                  <li key={b.key} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-4 py-3">
                    <span data-node className={cn("relative z-10 mt-0.5 flex size-6 items-center justify-center rounded-full", ok ? "bg-success text-white" : now ? "border-[3px] border-primary bg-card" : "border-2 border-muted-foreground/40 bg-card")} aria-hidden>
                      {ok && <Check className="size-3.5" />}
                    </span>
                    <div className="flex min-w-0 flex-col gap-2">
                      <p className="text-base leading-snug">
                        <span className={cn(b.pri === 1 ? "font-semibold" : "", ok && "text-muted-foreground line-through")}>{b.name}</span>
                        <span className="text-muted-foreground">, {b.sec}, {b.mins} min{b.pri === 1 ? ", core" : ""}</span>
                        <span className="sr-only">{ok ? ", done" : now ? ", next" : ""}</span>
                      </p>
                      <span className="h-1.5 rounded-full bg-secondary" style={{ width: `${Math.max(12, (100 * b.mins) / longest)}%` }} aria-hidden>
                        <span className={cn("block h-full rounded-full", ok ? "bg-success" : b.pri === 1 ? "bg-highlight" : "bg-primary/35")} />
                      </span>
                    </div>
                    {now ? <LinkButton to="/today" size="sm" variant="secondary">Start</LinkButton> : ok ? <span className="text-sm text-success">Done</span> : null}
                  </li>
                );
              })}
            </ol>
          ) : <p className="text-base text-muted-foreground">Nothing planned today. Rest, or open the timetable and pick a time.</p>}
          <ArrowLink to="/today">Open the timetable</ArrowLink>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-4 rounded-2xl bg-card p-6">
            <p className="text-heading font-semibold">This week</p>
            <ol className="grid grid-cols-7 gap-2" aria-label="Days studied this week">
              {WEEK.map((w, i) => {
                const d = addDays(mon, i), on = active.has(d), today = d === t;
                return (
                  <li key={d} className="flex flex-col items-center gap-2">
                    <span className={cn("flex h-16 w-full items-end overflow-hidden rounded-md bg-secondary", today && "ring-2 ring-primary ring-offset-2 ring-offset-card")} aria-hidden>
                      {on && <span data-day className="block h-full w-full rounded-md bg-success" />}
                    </span>
                    <span className={cn("text-sm", today ? "font-semibold" : "text-muted-foreground")} aria-hidden>{w}</span>
                    <span className="sr-only">{longDate(d)}, {on ? "studied" : "not studied"}</span>
                  </li>
                );
              })}
            </ol>
          </div>
          <Link to="/practice/va" className="flex flex-col gap-1 rounded-2xl bg-card p-6 transition-colors hover:bg-card/70">
            <span className="text-heading font-semibold">Daily VA drill</span>
            <span className="text-base text-muted-foreground">{vaTry ? `Done today: ${vaTry.items.filter((i) => i.ok).length} of ${vaTry.items.length} correct.` : `${DAILY_MIX.length} questions, about 12 minutes.`}</span>
          </Link>
          {redo > 0 && <Link to="/practice/redo" className="rounded-2xl bg-highlight-soft p-6 text-base hover:bg-highlight-soft/70"><b>{redo}</b> missed question{redo > 1 ? "s" : ""} due in your redo queue</Link>}
          {reviewReady && <Link to="/review" className="rounded-2xl bg-card p-6 text-base hover:bg-card/70">Your week in review is ready: two minutes, one focus for next week</Link>}
        </div>
      </div>
    </section>
  );
}
