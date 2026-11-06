import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { catByYear, catChoices, defaultCat, phaseIn, roadFor, type CatExam, type Road } from "../data/exam";
import { diffDays, mediumDate, shortDate, todayIso } from "../lib/date";
import { calm, loadGsap } from "../lib/motion";
import { useStore } from "../lib/store";

/**
 * Which CAT you are aiming for (D87, docs/design/your-cat-year.md). Three years as cards; picking one does not change
 * anything yet: the road below reshapes into the new one (GSAP stretches each phase from its old length to its new
 * one), with what changes in plain words, and only "Switch" saves it. Days already studied never change.
 */
export function CatYear() {
  const { state, update } = useStore();
  const today = todayIso();
  const mine = catByYear(state.about.exam) ?? defaultCat(state.since);
  const over = mine.date < today;
  const choices = catChoices(today, mine);
  const [pick, setPick] = useState<CatExam>(over ? choices[0] ?? mine : mine);
  const [saved, setSaved] = useState<string | null>(null);
  const now = roadFor(mine, state.since), next = roadFor(pick, state.since);
  const changing = pick.year !== mine.year;

  const choose = () => {
    update((st) => { st.about.exam = pick.year; });
    setSaved(`Your plan now leads to ${next.name}. Today, Plan and the countdown follow it.`);
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 sm:p-7">
      {over && <p className="rounded-lg bg-warning-soft px-4 py-3 text-base">{now.name} is over. Sitting again? Pick your next CAT and the plan starts again from today.</p>}
      <div role="radiogroup" aria-label="The CAT you are aiming for" className="grid grid-cols-3 gap-2 sm:gap-3">
        {choices.map((e) => {
          const on = e.year === pick.year, left = diffDays(today, e.date);
          return (
            <button key={e.year} type="button" role="radio" aria-checked={on} onClick={() => { setPick(e); setSaved(null); }}
              className={cn("flex min-w-0 flex-col items-start gap-1 rounded-xl px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:py-4",
                on ? "bg-accent text-accent-foreground" : "bg-secondary hover:bg-muted")}>
              <span className="text-sm text-muted-foreground">{e.year === mine.year && !over ? "Your exam" : e.confirmed ? "Announced" : "Expected"}</span>
              <span className="text-[clamp(1.25rem,1rem+1.2vw,1.75rem)] leading-none font-extrabold tracking-[-0.03em]">CAT {e.year}</span>
              <span className="text-sm text-muted-foreground">{shortDate(e.date)}</span>
              <span className="text-base font-semibold">{left.toLocaleString("en-IN")} <span className="font-normal text-muted-foreground">days</span></span>
            </button>
          );
        })}
      </div>

      <RoadBar from={changing ? now : null} road={next} today={today} />

      {changing ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-base font-semibold">What changes if you switch to {next.name}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-base text-foreground/85 marker:text-muted-foreground">
              {changes(now, next, today).map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={choose}>Switch to {next.name}</Button>
            {!over && <Button variant="ghost" onClick={() => setPick(mine)}>Keep {now.name}</Button>}
          </div>
        </div>
      ) : (
        <p role="status" className="text-base text-muted-foreground">{saved ?? `Your plan leads to ${now.name}. Pick another year to see how the road would change.`}</p>
      )}
    </div>
  );
}

/** The road as one bar to scale, a column per phase; switching years stretches each column to its new length. */
function RoadBar({ from, road, today }: { from: Road | null; road: Road; today: string }) {
  const box = useRef<HTMLDivElement>(null);
  const last = useRef<Map<number, number> | null>(null);
  const total = Math.max(diffDays(road.phases[0]?.start ?? road.start, road.exam.date), 1);
  const cur = phaseIn(road, today);
  const days = (p: { start: string; end: string }) => diffDays(p.start, p.end) + 1;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const before = last.current;
    last.current = new Map(road.phases.map((p) => [p.id, days(p)]));
    if (!before || calm()) return;
    void loadGsap().then((gsap) => {
      el.querySelectorAll<HTMLElement>("[data-col]").forEach((col) => {
        const id = Number(col.dataset.col), to = Number(col.dataset.len);
        gsap.fromTo(col, { flexGrow: before.get(id) ?? 0, opacity: before.has(id) ? 1 : 0 }, { flexGrow: to, opacity: 1, duration: 0.7, ease: "power3.inOut", overwrite: true });
      });
      const n = el.querySelector<HTMLElement>("[data-left]");
      if (n) {
        const v = { x: Number(n.dataset.was) }, to = Number(n.dataset.left);
        gsap.to(v, { x: to, duration: 0.7, ease: "power3.inOut", onUpdate: () => { n.textContent = Math.round(v.x).toLocaleString("en-IN"); } });
      }
    });
  }, [road]);

  const left = diffDays(today, road.exam.date);
  const was = from ? diffDays(today, from.exam.date) : left;
  return (
    <div ref={box} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-base font-semibold">{from ? "Your road, if you switch" : "Your road"}</p>
        <p className="text-base text-muted-foreground"><b data-left={left} data-was={was} className="font-semibold text-foreground">{left.toLocaleString("en-IN")}</b> days to {road.name}, {mediumDate(road.exam.date)}{road.exam.confirmed ? "" : " (expected)"}</p>
      </div>
      <div className="flex gap-1" aria-hidden>
        {road.phases.map((p) => {
          const on = cur.kind === "phase" && cur.phase === p, share = days(p) / total;
          return (
            <div key={p.id} data-col={p.id} data-len={days(p)} className="flex min-w-0 flex-col gap-1.5" style={{ flexGrow: days(p), flexBasis: 0 }}>
              <span className={cn("h-3 rounded-full", on ? "bg-primary" : p.id === 0 ? "bg-primary/20" : "bg-primary/40")} />
              <span className={cn("truncate text-sm", on ? "font-semibold text-primary" : "text-muted-foreground")}>{share > 0.16 ? p.name : ""}</span>
            </div>
          );
        })}
      </div>
      <ol className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
        {road.phases.map((p) => (
          <li key={p.id} className={cn(cur.kind === "phase" && cur.phase === p && "font-semibold text-foreground")}>
            {p.name}: {mediumDate(p.start)} to {mediumDate(p.end)}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** What switching from one road to another changes, in plain words. */
export function changes(now: Road, next: Road, today: string): string[] {
  const out: string[] = [];
  const head = next.phases.find((p) => p.id === 0);
  const named = (name: string, r: Road) => r.phases.find((p) => p.name === name);
  const was = phaseIn(now, today), will = phaseIn(next, today);
  if (head) out.push(`A light head start until ${mediumDate(head.end)}: one article, one RC and a few words a day, at the time you choose.`);
  if (will.kind === "phase" && (was.kind !== "phase" || was.phase.name !== will.phase.name)) out.push(`From today you are in ${will.phase.name === "Head start" ? "the head start" : will.phase.name}, not ${was.kind === "phase" ? was.phase.name : "the plan"}.`);
  const f = named("Foundation", next), b = named("Build", next), m = named("Mock phase", next);
  if (f) out.push(`Foundation ${mediumDate(f.start)} to ${mediumDate(f.end)}${b ? `, Build from ${mediumDate(b.start)}` : ""}${m ? `, mocks from ${mediumDate(m.start)}` : ""}.`);
  if (next.short) out.push("You start late for this exam, so the early phases are shorter: the same steps, in less time.");
  out.push("The days you have already studied stay as they are. Only the days ahead change.");
  return out;
}
