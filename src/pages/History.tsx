import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpen, CalendarCheck, ChevronRight, CircleAlert, ClipboardList, FileText, Gauge, NotebookPen, RotateCcw, Scale, Search,
  Puzzle, SearchCheck, Shuffle, Timer, X, type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { Empty, LinkButton, Page, PageHeader, Stat } from "../components/kit";
import { addDays, DOW, MON, parseIso, todayIso } from "../lib/date";
import { useStore } from "../lib/store";
import {
  filterDays, historyDays, HISTORY_KINDS, KIND_LABEL, level, stripWeeks, type HistoryDay, type HistoryIcon, type HistoryItem, type HistoryKind,
} from "../practice/history";

const ICON: Record<HistoryIcon, LucideIcon> = {
  rc: BookOpen, va: Shuffle, cr: Scale, lr: Puzzle, speed: Gauge, redo: RotateCcw, own: ClipboardList, sectional: Timer, mock: FileText,
  analysis: SearchCheck, week: CalendarCheck, summary: NotebookPen, mistake: CircleAlert,
};
const SHADE = ["bg-secondary", "bg-primary/20", "bg-primary/45", "bg-primary/70", "bg-primary"] as const;
const PAGE_DAYS = 30;

const hours = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
function dayName(d: string, today: string) {
  if (d === today) return "Today";
  if (d === addDays(today, -1)) return "Yesterday";
  const x = parseIso(d);
  return `${DOW[x.getDay()]}, ${x.getDate()} ${MON[x.getMonth()]}${d.slice(0, 4) !== today.slice(0, 4) ? " " + d.slice(0, 4) : ""}`;
}
const dayId = (d: string) => "day-" + d;

/**
 * History (docs/feature.md F51): every day the student studied, newest first, with a 12-week strip on top. Built
 * from saved state only (D26), so it works offline and on every synced device. Filters live in the URL:
 * ?k=tests&q=climate, and ?d=2026-10-21 opens one day.
 */
export default function History() {
  const { state } = useStore();
  const today = todayIso();
  const [sp, setSp] = useSearchParams();
  const kind = (HISTORY_KINDS as string[]).includes(sp.get("k") ?? "") ? (sp.get("k") as HistoryKind) : undefined;
  const q = sp.get("q") ?? "";
  const jump = sp.get("d");
  const [shown, setShown] = useState(PAGE_DAYS);

  const all = useMemo(() => historyDays(state), [state]);
  const byDay = useMemo(() => new Map(all.map((d) => [d.d, d])), [all]);
  const days = useMemo(() => filterDays(all, { kind, q }), [all, kind, q]);
  const filtered = !!kind || !!q.trim();

  const set = (k: string, v: string | undefined) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== "d") next.delete("d");
    setSp(next, { replace: true });
  };

  // ?d= opens a day: show enough days to include it, then scroll once the layout has done its own scroll to the top.
  const jumpAt = jump ? days.findIndex((d) => d.d === jump) : -1;
  useEffect(() => {
    if (jumpAt < 0) return;
    if (jumpAt >= shown) { setShown(jumpAt + 1); return; }
    const t = setTimeout(() => document.getElementById(dayId(jump!))?.scrollIntoView({ block: "start", behavior: "smooth" }), 80);
    return () => clearTimeout(t);
  }, [jump, jumpAt, shown]);

  if (all.length === 0) {
    return (
      <Page width="read">
        <PageHeader title="History">Every day you study shows here, newest first, with what you did and how it went.</PageHeader>
        <Empty action={<LinkButton to="/practice">Go to Practice</LinkButton>}>
          Nothing yet. Finish an RC set, a drill or a timed test and it appears here the same day, ready to open again.
        </Empty>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="History">Every day you studied, newest first. Tap a day in the strip to jump to it, or find a passage by its title.</PageHeader>

      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <Overview strip={<Strip byDay={byDay} today={today} selected={jump} onPick={(d) => { setSp(new URLSearchParams({ d }), { replace: true }); }} />}
          weeks={<WeekBars all={all} today={today} />} />
        <Period all={all} today={today} />
      </div>

      <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <ToggleGroup type="single" value={kind ?? "all"} onValueChange={(v) => v && set("k", v === "all" ? undefined : v)} aria-label="Show"
          className="flex flex-wrap justify-start gap-2">
          {(["all", ...HISTORY_KINDS] as const).map((k) => (
            <ToggleGroupItem key={k} value={k} className="min-h-10 flex-none rounded-md bg-secondary px-3.5 text-base data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/40">
              {k === "all" ? "All" : KIND_LABEL[k]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Find a passage or drill by its title</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => set("q", e.target.value || undefined)} placeholder="Find a passage" className="h-11 pl-10 text-base" />
        </label>
      </div>

      {days.length === 0 ? (
        <Empty action={<Button variant="outline" onClick={() => setSp(new URLSearchParams(), { replace: true })}><X data-icon="inline-start" />Clear filters</Button>}>
          Nothing matches{q ? ` “${q}”` : ""}{kind ? ` in ${KIND_LABEL[kind].toLowerCase()}` : ""}.
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered && <p className="text-base text-muted-foreground" role="status">{plural(days.reduce((s, d) => s + d.items.length, 0), "item")} on {plural(days.length, "day")}</p>}
          <ol className="flex flex-col gap-4">
            {days.slice(0, shown).map((day) => <Day key={day.d} day={day} today={today} selected={day.d === jump} />)}
          </ol>
          {days.length > shown && (
            <Button variant="outline" className="self-start" onClick={() => setShown((n) => n + PAGE_DAYS)}>
              Show older days ({days.length - shown} more)
            </Button>
          )}
        </div>
      )}
      </div>
    </Page>
  );
}

/** The last 12 weeks, Monday at the top. Days with activity are buttons; empty days are plain, never red. */
function Strip({ byDay, today, selected, onPick }: { byDay: Map<string, HistoryDay>; today: string; selected: string | null; onPick: (d: string) => void }) {
  const weeks = useMemo(() => stripWeeks(today), [today]);
  // A month name over the first week that starts in it (and over the first column).
  const months = weeks.map((w, i) => {
    const d = w[0]!, prev = i ? weeks[i - 1][0]! : null;
    return !prev || d.slice(5, 7) !== prev.slice(5, 7) ? MON[parseIso(d).getMonth()] : "";
  });
  return (
    <section aria-label="Last 12 weeks" className="flex w-full flex-col gap-3 rounded-xl bg-card p-4 sm:w-fit sm:p-5">
      <h2 className="text-base font-semibold">Last 12 weeks</h2>
      <div className="grid grid-cols-[2rem_repeat(12,minmax(0,1fr))] gap-1 sm:grid-cols-[2rem_repeat(12,1.5rem)] sm:gap-1.5">
        <span />
        {months.map((m, i) => <span key={i} className="h-5 overflow-visible whitespace-nowrap text-sm leading-5 text-muted-foreground">{m}</span>)}
        {[0, 1, 2, 3, 4, 5, 6].map((row) => (
          <Row key={row} row={row} weeks={weeks} byDay={byDay} today={today} selected={selected} onPick={onPick} />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-hidden>
        Less {SHADE.map((s) => <span key={s} className={cn("size-3.5 rounded-sm", s)} />)} More
      </div>
    </section>
  );
}

const ROW_LABEL = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
function Row({ row, weeks, byDay, today, selected, onPick }: { row: number; weeks: (string | null)[][]; byDay: Map<string, HistoryDay>; today: string; selected: string | null; onPick: (d: string) => void }) {
  return (
    <>
      <span className="self-center text-sm leading-none text-muted-foreground">{ROW_LABEL[row]}</span>
      {weeks.map((w, i) => {
        const d = w[row];
        if (!d) return <span key={i} />;
        const day = byDay.get(d);
        const lv = day ? level(day.minutes, day.items.length) : 0;
        const ring = cn(d === today && "ring-2 ring-foreground/60", d === selected && "ring-2 ring-primary ring-offset-2 ring-offset-card");
        if (!day) return <span key={i} className={cn("aspect-square w-full rounded-sm sm:size-6", SHADE[0], ring)} />;
        const label = `${dayName(d, today)}: ${day.minutes ? hours(day.minutes) + ", " : ""}${plural(day.items.length, "item")}`;
        return (
          <button key={i} type="button" onClick={() => onPick(d)} aria-label={label} title={label}
            className={cn("aspect-square w-full cursor-pointer rounded-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:scale-100 sm:size-6", SHADE[lv], ring)} />
        );
      })}
    </>
  );
}

/** The 12 weeks in numbers, and minutes per week as bars from a tablet up (the strip already shows days on a phone). */
function Period({ all, today }: { all: HistoryDay[]; today: string }) {
  const from = addDays(today, -83), weekFrom = addDays(today, -6);
  const inRange = all.filter((d) => d.d >= from && d.d <= today);
  const minutes = inRange.reduce((s, d) => s + d.minutes, 0);
  const done = inRange.reduce((s, d) => s + d.items.filter((x) => x.kind === "practice" || x.kind === "tests").length, 0);
  const week = all.filter((d) => d.d >= weekFrom && d.d <= today).length;
  return (
    <div className="flex flex-col gap-6 rounded-xl bg-card p-5 lg:self-stretch">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Stat value={inRange.length} label="Days studied" />
        <Stat value={minutes ? hours(minutes) : "None yet"} label="Time studied" />
        <Stat value={done} label="Sets, drills and tests" />
        <Stat value={`${week} of 7`} label="Days in the last week" />
      </div>
      <div className="mt-auto hidden sm:block"><WeekBars all={all} today={today} bare /></div>
    </div>
  );
}

/** Minutes in each of the 12 weeks, this week in full colour, with this week and the busiest week named. */
function WeekBars({ all, today, bare }: { all: HistoryDay[]; today: string; bare?: boolean }) {
  const byDay = new Map(all.map((d) => [d.d, d.minutes]));
  const weeks = stripWeeks(today).map((w) => w.reduce((s, d) => s + (d ? byDay.get(d) ?? 0 : 0), 0));
  const top = Math.max(...weeks, 1);
  const best = weeks.indexOf(Math.max(...weeks));
  const chart = (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm text-muted-foreground">Minutes each week, oldest on the left</figcaption>
      <div className="flex h-28 items-end gap-1.5" role="img" aria-label={`Minutes each week, oldest first: ${weeks.join(", ")}`}>
        {weeks.map((m, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={hours(m)}>
            <div className={cn("rounded-t-sm", i === weeks.length - 1 ? "bg-primary" : "bg-primary/40")} style={{ height: `${Math.max(m ? 6 : 2, (m / top) * 100)}%` }} />
          </div>
        ))}
      </div>
    </figure>
  );
  if (bare) return chart;
  return (
    <section aria-label="Minutes each week" className="flex h-full w-full flex-col gap-4 rounded-xl bg-card p-4">
      <h2 className="text-base font-semibold">Last 12 weeks</h2>
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <Stat value={hours(weeks[weeks.length - 1])} label="This week" />
        {weeks[best] > 0 && <Stat value={hours(weeks[best])} label={best === weeks.length - 1 ? "Your best week, this one" : "Your best week"} />}
      </div>
      <div className="mt-auto">{chart}</div>
    </section>
  );
}

/**
 * The strip and the weekly bars. On a phone they share one card you swipe between (with "Days" and "Weeks" to tap,
 * and two dots), so the list starts higher; from a tablet up the strip stands alone and the bars sit in Period.
 */
function Overview({ strip, weeks }: { strip: ReactNode; weeks: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };
  const onScroll = () => { const el = track.current; if (el) setAt(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))); };
  return (
    <>
      <div className="flex flex-col gap-3 sm:hidden">
        <ToggleGroup type="single" value={String(at)} onValueChange={(v) => v && go(Number(v))} aria-label="Show the last 12 weeks by" className="flex w-fit gap-1 rounded-lg bg-secondary p-1">
          {["Days", "Weeks"].map((l, i) => (
            <ToggleGroupItem key={l} value={String(i)} className="h-9 rounded-md px-4 text-base text-muted-foreground data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-primary">{l}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="w-full shrink-0 snap-center" aria-hidden={at !== 0} inert={at !== 0}>{strip}</div>
          <div className="w-full shrink-0 snap-center" aria-hidden={at !== 1} inert={at !== 1}>{weeks}</div>
        </div>
        <div className="flex justify-center gap-2" aria-hidden>
          {[0, 1].map((i) => <span key={i} className={cn("size-2 rounded-full transition-colors motion-reduce:transition-none", at === i ? "bg-primary" : "bg-muted-foreground/30")} />)}
        </div>
      </div>
      <div className="hidden sm:block">{strip}</div>
    </>
  );
}

function Day({ day, today, selected }: { day: HistoryDay; today: string; selected: boolean }) {
  const name = dayName(day.d, today);
  return (
    <li id={dayId(day.d)} className={cn("scroll-mt-24 overflow-hidden rounded-xl bg-card", selected && "ring-2 ring-primary")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pb-3 pt-4 sm:px-5">
        <h2 className="text-heading font-semibold">{name}</h2>
        <p className="text-base text-muted-foreground">
          {[day.minutes ? hours(day.minutes) : "", day.items.length ? plural(day.items.length, "item") : ""].filter(Boolean).join(", ")}
        </p>
      </div>
      {day.items.length > 0 ? (
        <ul className="flex flex-col gap-px bg-background">
          {day.items.map((x) => <Item key={x.id} x={x} />)}
        </ul>
      ) : (
        <p className="px-4 pb-4 text-base text-muted-foreground sm:px-5">Study blocks ticked off on Today.</p>
      )}
    </li>
  );
}

function Item({ x }: { x: HistoryItem }) {
  const Icon = ICON[x.icon];
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary" aria-hidden><Icon className="size-5" /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-medium leading-snug">{x.title}</span>
        <span className="text-sm text-muted-foreground">{x.detail}</span>
      </span>
      {x.kind === "tests" && <Badge variant="secondary" className="hidden sm:inline-flex">Test</Badge>}
      {x.href && <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />}
    </>
  );
  const row = "flex min-h-16 items-center gap-3 bg-card px-4 py-3 sm:gap-4 sm:px-5";
  return (
    <li>
      {x.href
        ? <Link to={x.href} className={cn(row, "transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none")}>{body}</Link>
        : <div className={row}>{body}</div>}
    </li>
  );
}
