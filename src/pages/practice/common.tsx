import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Flame } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { reportUrl } from "../../data/site";
import { todayIso } from "../../lib/date";
import { useStore } from "../../lib/store";
import { activityDays, computeStreak } from "../../practice/streak";

export function useStreak() {
  const { state } = useStore();
  return useMemo(() => computeStreak(activityDays(state), todayIso()), [state]);
}

export function StreakBadge() {
  const s = useStreak();
  const title = s.days
    ? `${s.days}-day streak${s.activeToday ? "" : ". Practice today to keep it going"}. ${s.shieldsLeft} of 2 shields left this month; a shield covers one missed day.`
    : "Practice or tick a timetable block to start a streak.";
  return (
    <span title={title} className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium whitespace-nowrap">
      <Flame className={cn("size-4", s.days ? "text-warning" : "text-muted-foreground")} aria-hidden />
      {s.days ? `${s.days}-day streak` : "No streak yet"}
      {s.days > 0 && <span className="text-muted-foreground">, {s.shieldsLeft} shield{s.shieldsLeft === 1 ? "" : "s"}</span>}
    </span>
  );
}

/** Seconds since the component mounted, ticking once a second while `running`. */
export function useElapsed(running: boolean, startAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  return Math.max(0, Math.floor((now - startAt) / 1000));
}

/** "Report a problem" for one question. Opens a prefilled GitHub issue in a new tab. */
export function ReportLink({ what }: { what: string }) {
  return (
    <a className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground" href={reportUrl(what, window.location.href)} target="_blank" rel="noopener noreferrer">
      Report a problem with this question
    </a>
  );
}

/** The sticky bar on top of every practice screen: what you are doing, the clock, and the main action. */
export function PlayerBar({ kicker, title, children }: { kicker: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="sticky top-14 z-30 -mx-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-12 lg:px-12">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm text-muted-foreground">{kicker}</span>
        <h1 className="truncate text-heading font-semibold">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** The clock in a practice bar. Turns red when the target time is passed. */
export function Timer({ children, over, onClick, title }: { children: ReactNode; over?: boolean; onClick?: () => void; title?: string }) {
  const cls = cn("inline-flex h-9 items-center rounded-md bg-card px-3 text-base font-semibold tabular-nums", over && "bg-danger-soft text-danger");
  return onClick ? <button type="button" className={cls} onClick={onClick} title={title}>{children}</button> : <span className={cls} role="timer">{children}</span>;
}

/** One answer choice while a question is open. */
export function Choice({ mark, checked, onClick, children, className }: { mark: ReactNode; checked: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onClick}
      className={cn("grid w-full grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3 rounded-lg bg-card px-4 py-3.5 text-left text-base ring-1 ring-inset ring-border transition-colors hover:ring-primary/60",
        checked && "bg-accent ring-2 ring-primary hover:ring-primary", className)}>
      <span className={cn("grid size-7 place-items-center rounded-full bg-secondary text-sm font-semibold", checked && "bg-primary text-primary-foreground")}>{mark}</span>
      <span className="pt-0.5">{children}</span>
    </button>
  );
}

/** One answer choice after marking: green for the answer, red for a wrong pick, with the reason in full ink. */
export function ReviewChoice({ mark, state, children, why, tags }: { mark: ReactNode; state: "right" | "wrong" | "plain"; children: ReactNode; why?: ReactNode; tags?: ReactNode }) {
  return (
    <li className={cn("grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3 rounded-lg bg-card px-4 py-3.5 text-base",
      state === "right" && "bg-success-soft", state === "wrong" && "bg-danger-soft")}>
      <span className={cn("grid size-7 place-items-center rounded-full bg-secondary text-sm font-semibold",
        state === "right" && "bg-success text-white", state === "wrong" && "bg-danger text-white")}>{mark}</span>
      <span className="flex flex-col gap-1.5 pt-0.5">
        <span>{children}</span>
        {why && <span className="text-base text-foreground/80">{why}</span>}
        {tags && <span className="flex flex-wrap gap-1.5">{tags}</span>}
      </span>
    </li>
  );
}

export type Cell = "unseen" | "open" | "done" | "marked" | "doneMarked" | "right" | "wrong" | "blank";
/** A question number in a palette, coloured like the CAT exam screen. */
export function PaletteCell({ n, state, current, onClick, label }: { n: number; state: Cell; current?: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-current={current || undefined}
      className={cn("relative grid h-10 min-w-10 place-items-center rounded-md bg-card px-2 text-sm font-semibold tabular-nums ring-1 ring-inset ring-border transition-colors hover:ring-primary",
        state === "open" && "text-danger ring-danger/60",
        (state === "done" || state === "doneMarked") && "bg-success-soft text-success ring-success/50",
        state === "marked" && "bg-mark/10 text-mark ring-mark/60",
        state === "right" && "bg-success text-white ring-success",
        state === "wrong" && "bg-danger text-white ring-danger",
        state === "blank" && "bg-secondary text-muted-foreground ring-transparent",
        current && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
      {n}
      {(state === "marked" || state === "doneMarked") && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-mark" aria-hidden />}
    </button>
  );
}

/** A score with its parts, shown after a set or a test. */
export function ScoreCard({ score, of, unit, parts, children }: { score: ReactNode; of?: ReactNode; unit?: string; parts: [string, ReactNode][]; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <p className="flex items-baseline gap-1.5">
          <span className="text-[3rem] leading-none font-bold tracking-tight tabular-nums">{score}</span>
          {of != null && <span className="text-heading text-muted-foreground">/ {of}</span>}
          {unit && <span className="text-heading text-muted-foreground">{unit}</span>}
        </p>
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          {parts.map(([k, v]) => <div key={k} className="flex flex-col"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-heading font-semibold tabular-nums">{v}</dd></div>)}
        </dl>
      </div>
      {children}
    </div>
  );
}

/** "Submit this set?" and similar: a real dialog instead of a box in the page. */
export function Confirm({ open, onOpenChange, title, children, action, onAction, cancel = "Keep going", danger }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode; action: string; onAction: () => void; cancel?: string; danger?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-heading">{title}</AlertDialogTitle>
          <AlertDialogDescription>{children}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onAction} className={danger ? "bg-danger text-white hover:bg-danger/90" : undefined}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
