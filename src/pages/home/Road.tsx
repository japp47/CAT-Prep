import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { daysLeft, examLine } from "../../components/Countdown";
import { phaseIn, phaseNo, type Phase } from "../../data/exam";
import { useRoad } from "../../lib/useRoad";
import { YearSwitch } from "../../components/YearSwitch";
import { clamp, diffDays, shortDate, todayIso } from "../../lib/date";
import { calm, loadScrollTrigger } from "../../lib/motion";
import { Head } from "./Head";

/**
 * The road to the exam (D42): the days left, large, and the five phases on one line to scale, with month marks, a pin
 * for today and a flag for the exam, each phase saying what it is for. It draws itself once when it scrolls into view.
 * On a phone the line turns vertical.
 */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The first of each month between the start and the exam, as a share of the road. */
function months(first: string, end: string, total: number): { at: number; label: string }[] {
  const out: { at: number; label: string }[] = [];
  const d = new Date(first + "T00:00:00");
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  for (;;) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    if (iso > end) break;
    // A road over about 13 months marks the quarters only, so the labels never run into each other.
    if (total < 400 || d.getMonth() % 3 === 0) out.push({ at: diffDays(first, iso) / total, label: d.getMonth() === 0 ? `Jan ’${String(d.getFullYear()).slice(2)}` : MON[d.getMonth()] });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export function Road() {
  const box = useRef<HTMLElement>(null);
  const t = todayIso();
  const road = useRoad(), phases = road.phases, exam = road.exam.date;
  const first = phases[0]?.start ?? road.start;
  const total = Math.max(diffDays(first, exam), 1);
  const at = (d: string) => clamp(diffDays(first, d) / total, 0, 1) * 100;
  const left = Math.max(daysLeft(road), 0);
  const ph = phaseIn(road, t);
  const cur = ph.kind === "phase" ? ph.phase : null;
  const fill = (p: Phase) => clamp((diffDays(p.start, t) + 1) / (diffDays(p.start, p.end) + 1), 0, 1);
  const label = (p: Phase) => (p.id === 0 ? "To start with" : `Phase ${phaseNo(road, p)}`);
  const head = phases.some((p) => p.id === 0) ? "A light head start, then five phases to the exam." : `${["No", "One", "Two", "Three", "Four", "Five"][phases.length] ?? phases.length} phases from now to the exam.`;

  useEffect(() => {
    const el = box.current;
    if (!el || calm()) return;
    let gone = false, kill = () => {};
    loadScrollTrigger().then(({ gsap, ScrollTrigger }) => {
      if (gone) return;
      const out = el.querySelector<HTMLElement>("[data-days]");
      const tl = gsap.timeline({ paused: true });
      tl.from(el.querySelectorAll("[data-seg]"), { scaleX: 0, transformOrigin: "0% 50%", duration: 0.6, stagger: 0.12, ease: "power2.out" })
        .from(el.querySelectorAll("[data-pin]"), { y: -18, opacity: 0, duration: 0.5, ease: "back.out(2)" }, "-=0.3")
        .from(el.querySelectorAll("[data-phase]"), { opacity: 0, y: 10, duration: 0.4, stagger: 0.07 }, "<");
      if (out) { const v = { x: 0 }; tl.to(v, { x: left, duration: 1.1, ease: "power2.out", onUpdate: () => { out.textContent = String(Math.round(v.x)); } }, 0); }
      const st = ScrollTrigger.create({ trigger: el, start: "top 75%", once: true, onEnter: () => tl.play() });
      // Revert, not kill: a road redrawn for another CAT year must not keep the hidden starting state of the old one.
      kill = () => { st.kill(); tl.revert(); };
    }, () => {});
    return () => { gone = true; kill(); };
  }, [left]);

  return (
    <section ref={box} aria-labelledby="road-h" className="flex flex-col gap-10 lg:gap-14">
      <Head id="road-h" lead={`The road to ${road.name}.`} rest={`${head} The plan knows which one you are in and shapes each day to it.`} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.3fr)_minmax(0,1fr)] lg:gap-14">
        <div className="flex flex-col gap-2">
          <p className="text-[clamp(5rem,2.6rem+6.5vw,9.5rem)] leading-[0.82] font-extrabold tracking-[-0.055em] tabular-nums" data-days>{left}</p>
          <p className="text-heading font-semibold">{left === 1 ? "day" : "days"} to go</p>
          <p className="text-base text-muted-foreground">{examLine(road)}.</p>
          <p className="text-base text-muted-foreground"><YearSwitch align="start">Preparing for a later CAT?</YearSwitch></p>
        </div>

        {/* Wide screens: one line to scale. */}
        <div className="hidden min-w-0 flex-col gap-8 lg:flex">
          <div className="relative pt-14 pb-8" aria-hidden>
            {cur && (
              <div data-pin className="absolute top-0 bottom-8 flex -translate-x-1/2 flex-col items-center" style={{ left: `${at(t)}%` }}>
                <span className="rounded-md bg-primary px-2 py-0.5 text-sm font-semibold whitespace-nowrap text-primary-foreground">Today</span>
                <span className="w-0.5 flex-1 bg-primary" />
                <span className="size-4 rounded-full border-[3px] border-primary bg-card" />
              </div>
            )}
            <div data-pin className="absolute top-0 right-0 bottom-8 flex flex-col items-end">
              <span className="rounded-md bg-highlight px-2 py-0.5 text-sm font-semibold whitespace-nowrap text-highlight-foreground">{road.name}, {shortDate(exam)}</span>
              <span className="mr-0 w-0.5 flex-1 bg-highlight" />
            </div>
            <div className="flex h-3 gap-1">
              {phases.map((p) => (
                <div key={p.id} className="relative h-full overflow-hidden rounded-full bg-secondary" style={{ flex: diffDays(p.start, p.end) + 1 }}>
                  <div data-seg className={cn("h-full rounded-full", p === cur ? "bg-primary" : "bg-primary/45")} style={{ width: `${fill(p) * 100}%` }} />
                </div>
              ))}
            </div>
            {months(first, exam, total).map((m) => (
              <span key={m.at} className="absolute bottom-0 -translate-x-1/2 text-sm text-muted-foreground" style={{ left: `${m.at * 100}%` }}>{m.label}</span>
            ))}
          </div>
          {/* One row for five phases; a road with a head start goes to two rows of three, so no card is squeezed. */}
          <ol className="grid gap-3" style={{ gridTemplateColumns: `repeat(${phases.length > 5 ? 3 : phases.length}, minmax(0, 1fr))` }}>
            {phases.map((p) => (
              <li key={p.id} data-phase className={cn("flex flex-col gap-1.5 rounded-xl px-4 py-4", p === cur ? "bg-card" : "")}>
                <span className={cn("text-sm", p === cur ? "font-semibold text-primary" : "text-muted-foreground")}>{p === cur ? "You are here" : label(p)}</span>
                <span className="text-heading leading-tight font-bold">{p.name}</span>
                <span className="text-sm text-muted-foreground">{shortDate(p.start)} to {shortDate(p.end)}</span>
                <span className="text-sm text-foreground/80">{p.focus}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Phones: the same road, top to bottom. */}
        <ol className="relative flex flex-col gap-1 lg:hidden">
          <span className="absolute top-3 bottom-3 left-[0.6875rem] w-0.5 bg-secondary" aria-hidden />
          {phases.map((p) => {
            const on = p === cur, past = p.end < t;
            return (
              <li key={p.id} data-phase className={cn("relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 rounded-xl py-3 pr-4", on && "bg-card")}>
                <span className={cn("relative z-10 mt-1 size-6 rounded-full border-[3px]", on ? "border-primary bg-card" : past ? "border-primary/45 bg-primary/45" : "border-secondary bg-background")} aria-hidden />
                <div className="flex flex-col gap-1">
                  <span className={cn("text-sm", on ? "font-semibold text-primary" : "text-muted-foreground")}>{on ? "You are here" : label(p)}, {shortDate(p.start)} to {shortDate(p.end)}</span>
                  <span className="text-heading leading-tight font-bold">{p.name}</span>
                  <span className="text-base text-foreground/80">{p.focus}</span>
                  {on && <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><span data-seg className="block h-full rounded-full bg-primary" style={{ width: `${fill(p) * 100}%` }} /></span>}
                </div>
              </li>
            );
          })}
          <li className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 py-3">
            <span className="relative z-10 mt-1 size-6 rounded-full bg-highlight" aria-hidden />
            <span className="text-heading font-bold">{road.name}, {shortDate(exam)}</span>
          </li>
        </ol>
      </div>
    </section>
  );
}
