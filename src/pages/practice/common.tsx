import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useBlocker, useSearchParams } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportUrl } from "../../data/site";
import { API_ENABLED } from "../../lib/api";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CAUSES } from "../../data/traps";
import { useGsap } from "../../lib/motion";
import { usePref } from "../../lib/prefs";
import { CAUSE_IDS, type Cause } from "../../lib/state";
import { useStore } from "../../lib/store";
import { fmtSecs } from "../../practice/record";
import { Page, Tnum } from "../../components/kit";
import { diffDays, iso, mediumDate, todayIso } from "../../lib/date";
import { addAway, comeBack, dropCleared, peekCleared, readDraftAt, writeDraft } from "../../lib/draft";
import KeepHint from "../../components/KeepHint";

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

/** Seconds of warning before a practice set submits itself, and the hard stop as a multiple of its target. */
export const GRACE_SECS = 60;
export const HARD_STOP = 3;

/**
 * When a practice set (RC, VA, CR) submits itself (docs/feature.md, "Practice clock"): at the target a bar gives
 * 60 seconds to choose Keep going; without an answer it submits, so a page left open never counts for hours. After
 * Keep going (or on a set reopened past its target) the hard stop is three times the target, again with 60
 * seconds of warning. Pure, so the rule is tested without a clock.
 */
export function timeUpState(secs: number, target: number, kept: boolean): { stopAt: number; warn: boolean; left: number; over: boolean } {
  const stopAt = kept ? HARD_STOP * target : target + GRACE_SECS;
  return { stopAt, warn: secs >= stopAt - GRACE_SECS, left: Math.max(0, stopAt - secs), over: secs >= stopAt };
}

/** The time-up bar for a practice set; it calls onSubmit once when time runs out. */
export function TimeUp({ startAt, target, onSubmit }: { startAt: number; target: number; onSubmit: () => void }) {
  const secs = useElapsed(true, startAt);
  // A set reopened past its target was already past the first warning: only the hard stop applies.
  const [kept, setKept] = useState(() => (Date.now() - startAt) / 1000 > target);
  const fired = useRef(false);
  const t = timeUpState(secs, target, kept);
  useEffect(() => {
    if (t.over && !fired.current) { fired.current = true; onSubmit(); }
  });
  if (!t.warn || t.over) return null;
  return (
    <div role="alert" className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl flex-col gap-3 rounded-xl bg-foreground p-4 text-background shadow-lg sm:flex-row sm:items-center sm:justify-between lg:bottom-6">
      <p className="text-base">
        {kept
          ? <>This set has been open for {fmtSecs(secs)}. It will be submitted in <b className="font-semibold">{t.left} s</b> so your time stays honest.</>
          : <><b className="font-semibold">Time is up</b> ({fmtSecs(target)} target). Submitting in <b className="font-semibold">{t.left} s</b>.</>}
      </p>
      <div className="flex shrink-0 gap-2">
        {!kept && <Button size="sm" variant="secondary" onClick={() => setKept(true)}>Keep going</Button>}
        <Button size="sm" variant="ghost" className="text-background hover:bg-background/10 hover:text-background" onClick={() => { fired.current = true; onSubmit(); }}>Submit now</Button>
      </div>
    </div>
  );
}

/** Keep an in-progress practice session from being left accidentally. */
export function useLeaveConfirmation(active: boolean) {
  const allowNextNavigation = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allowNextNavigation.current) {
      allowNextNavigation.current = false;
      return false;
    }
    if (!active) return false;
    return currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search ||
      currentLocation.hash !== nextLocation.hash;
  });
  const proceeding = useRef(false);

  return {
    open: blocker.state === "blocked",
    onOpenChange: (open: boolean) => {
      if (open || blocker.state !== "blocked") return;
      if (proceeding.current) proceeding.current = false;
      else blocker.reset();
    },
    onLeave: () => {
      if (blocker.state !== "blocked") return;
      proceeding.current = true;
      blocker.proceed();
    },
    allowNextNavigation: () => { allowNextNavigation.current = true; },
  };
}

/**
 * "Not sure": a quiet toggle beside a question while practising. A right answer marked this way was a lucky guess,
 * so it comes back once in the redo queue (docs/research/step-2g.md). It can be turned off in Settings.
 */
export function NotSure({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const [enabled] = usePref("notSure", true);
  if (!enabled) return null;
  return (
    <Button variant="ghost" size="sm" aria-pressed={on} onClick={() => onChange(!on)} className={cn(on && "bg-mark/10 text-mark hover:bg-mark/15")}>
      {on && <Check aria-hidden />}Not sure
    </Button>
  );
}

/**
 * Under a wrong answer that is in the Error log: one tap for why it went wrong. The trap is already known from the
 * option; this is what happened to the student, which they can change later in the Error log.
 */
export function ErrorCause({ src }: { src: string }) {
  const { state, update } = useStore();
  const e = [...state.errors].reverse().find((x) => x.src === src);
  if (!e) return null;
  const pick = (c: Cause) => update((st) => {
    const x = st.errors.find((y) => y.id === e.id);
    if (!x || x.cause === c) return;
    if (x.cause && !x.causeWas) x.causeWas = x.cause;
    x.cause = c;
  });
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base"><span className="text-success">In your Error log.</span> Why did you miss it?</p>
      <ToggleGroup type="single" value={e.cause ?? ""} onValueChange={(v) => v && pick(v as Cause)} aria-label="Why did you miss it" className="flex flex-wrap justify-start gap-2">
        {CAUSE_IDS.map((c) => (
          <ToggleGroupItem key={c} value={c} className="min-h-11 flex-none rounded-md bg-secondary px-3.5 text-base data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/40">
            {CAUSES[c]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/** The practice clock. It ticks on its own, so the passage and the questions do not redraw every second. */
export function ElapsedTimer({ startAt, target, onClick, title }: { startAt: number; target: number; onClick?: () => void; title?: string }) {
  const secs = useElapsed(true, startAt);
  return <Timer over={secs > target} onClick={onClick} title={title}><Tnum>{`${fmtSecs(secs)} / ${fmtSecs(target)}`}</Tnum></Timer>;
}

const ReportForm = lazy(() => import("../../components/ReportForm"));
const reportClass = "relative w-fit text-sm text-muted-foreground underline after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] underline-offset-4 hover:text-foreground";

/**
 * "Report a problem" for one question (F39). item is its redo key (rc:<set>:<n>, a VA key, cr:<id>). With the API
 * on, it opens a short form that sends to the 99ile inbox; without it, a prefilled GitHub issue in a new tab.
 */
export function ReportLink({ what, item }: { what: string; item: string }) {
  const [open, setOpen] = useState(false);
  if (!API_ENABLED) {
    return <a className={reportClass} href={reportUrl(what, window.location.href)} target="_blank" rel="noopener noreferrer">Report a problem with this question</a>;
  }
  if (open) return <Suspense fallback={null}><ReportForm what={what} item={item} onClose={() => setOpen(false)} /></Suspense>;
  return <button type="button" className={cn(reportClass, "cursor-pointer text-left")} aria-expanded={false} onClick={() => setOpen(true)}>Report a problem with this question</button>;
}

/** The sticky bar on top of every practice screen: what you are doing, the clock, and the main action. */
export function PlayerBar({ kicker, title, children }: { kicker: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="sticky top-14 z-30 bleed-gutter flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-background/95 px-gutter py-3 backdrop-blur-sm lg:top-0">
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
  const cls = cn("inline-flex h-9 items-center rounded-md bg-card px-3 text-base font-semibold", over && "bg-danger-soft text-danger");
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

const STEP: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/**
 * The options of one question. Like native radio buttons: Tab lands on the picked option
 * (or the first), and the arrow keys move to the next option and pick it.
 */
export function ChoiceGroup({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const radios = () => [...(ref.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])];
  useEffect(() => {
    const r = radios();
    const on = Math.max(0, r.findIndex((x) => x.getAttribute("aria-checked") === "true"));
    r.forEach((x, i) => { x.tabIndex = i === on ? 0 : -1; });
  });
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = STEP[e.key];
    const r = radios(), i = r.indexOf(document.activeElement as HTMLElement);
    if (!step || i < 0) return;
    e.preventDefault();
    const next = r[(i + step + r.length) % r.length];
    next.focus();
    next.click();
  };
  return <div ref={ref} role="radiogroup" aria-label={label} className={cn("flex flex-col gap-2.5", className)} onKeyDown={onKeyDown}>{children}</div>;
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
/**
 * Previous and next for a review, under the question it moves through: both buttons in the question's own column, with
 * where you are between them, so neither ends up under the passage.
 */
export function QuestionNav({ cur, n, onGo }: { cur: number; n: number; onGo: (i: number) => void }) {
  return (
    <nav aria-label="Questions" className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
      <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => onGo(cur - 1)}><ChevronLeft data-icon="inline-start" />Previous</Button>
      <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">Question {cur + 1} of {n}</span>
      <Button variant="secondary" size="sm" disabled={cur >= n - 1} onClick={() => onGo(cur + 1)}>Next<ChevronRight data-icon="inline-end" /></Button>
    </nav>
  );
}

export function PaletteCell({ n, state, current, onClick, label, className }: { n: number; state: Cell; current?: boolean; onClick: () => void; label: string; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-current={current || undefined}
      className={cn("relative grid h-10 min-w-10 place-items-center rounded-md bg-card px-2 text-sm font-semibold tabular-nums ring-1 ring-inset ring-border transition-colors hover:ring-primary",
        state === "open" && "text-danger ring-danger/60",
        (state === "done" || state === "doneMarked") && "bg-success-soft text-success ring-success/50",
        state === "marked" && "bg-mark/10 text-mark ring-mark/60",
        state === "right" && "bg-success text-white ring-success",
        state === "wrong" && "bg-danger text-white ring-danger",
        state === "blank" && "bg-secondary text-muted-foreground ring-transparent",
        current && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className)}>
      {n}
      {(state === "marked" || state === "doneMarked") && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-mark" aria-hidden />}
    </button>
  );
}

// The reminder offer loads only on a result screen, and only in builds with the API (F65).
const ReminderOffer = lazy(() => import("../../components/Reminders").then((m) => ({ default: m.ReminderOffer })));

/**
 * A score with its parts, shown after a set or a test. On arrival the score counts up from 0 and the parts follow one
 * by one (D41); the final text is in the page from the start, so a screen reader and a slow phone read it as is.
 */
export function ScoreCard({ score, of, unit, parts, children }: { score: ReactNode; of?: ReactNode; unit?: string; parts: [string, ReactNode][]; children?: ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  const num = typeof score === "string" || typeof score === "number" ? /^([+−-]?)(\d+)$/.exec(String(score)) : null;
  useGsap(card, (gsap, el) => {
    gsap.from(el.querySelectorAll("[data-part]"), { opacity: 0, y: 8, duration: 0.4, stagger: 0.08, delay: 0.15, ease: "power2.out" });
    const out = el.querySelector<HTMLElement>("[data-score]");
    if (!num || !out || +num[2] === 0) return;
    const n = +num[2], o = { v: 0 };
    gsap.to(o, {
      v: n, duration: Math.min(1.1, 0.4 + n / 50), ease: "power2.out",
      onUpdate: () => { const v = Math.round(o.v); out.textContent = (v ? num[1] : "") + v; },
      onComplete: () => { out.textContent = num[0]; },
    });
  }, [String(score)]);
  return (
    <div ref={card} className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <p className="flex items-baseline gap-1.5">
          <span data-score className="text-[3rem] leading-none font-bold tracking-tight tabular-nums">{score}</span>
          {of != null && <span className="text-heading text-muted-foreground">/ {of}</span>}
          {unit && <span className="text-heading text-muted-foreground">{unit}</span>}
        </p>
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          {parts.map(([k, v]) => <div key={k} data-part className="flex flex-col"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-heading font-semibold">{typeof v === "string" || typeof v === "number" ? <Tnum>{String(v)}</Tnum> : v}</dd></div>)}
        </dl>
      </div>
      {children}
      {API_ENABLED && <Suspense fallback={null}><ReminderOffer /></Suspense>}
      <KeepHint />
    </div>
  );
}

/** "Submit this set?" and similar: a real dialog instead of a box in the page. */
export function Confirm({ open, onOpenChange, title, children, action, onAction, cancel = "Keep going", danger, actionClassName }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode; action: string; onAction: () => void; cancel?: string; danger?: boolean; actionClassName?: string;
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
          <AlertDialogAction onClick={onAction} className={cn(danger && "bg-danger text-white hover:bg-danger/90", actionClassName)}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * A review opened from the Error log at one question (?q=3): the question to start on, and a ref for the question
 * block, which scrolls into view once so the student lands on it below the score card (docs/feature.md F52).
 */
export function useStartQuestion(n: number) {
  const [sp] = useSearchParams();
  const q = Number(sp.get("q"));
  const asked = Number.isInteger(q) && q >= 1 && q <= n;
  const el = useRef<HTMLDivElement>(null);
  // After the layout's own scroll to the top of a new page, which runs after this component's effects.
  useEffect(() => {
    if (!asked) return;
    const t = setTimeout(() => el.current?.scrollIntoView({ block: "start" }), 80);
    return () => clearTimeout(t);
  }, [asked]);
  return { start: asked ? q - 1 : 0, el };
}

/**
 * The attempt a player shows, and how it moves to a finished attempt (docs/feature.md F52).
 * A finished attempt goes into the address (?review=), so a reload, the back button or a phone that drops the tab
 * brings back these answers, never a fresh copy. The page restarts with the new address one moment before the saved
 * attempt may reach it: then it waits (renders nothing) instead of starting a fresh attempt that would save itself as
 * a draft. An id that never turns up (a deleted attempt) falls back to a fresh attempt after 1.5 s.
 */
export function useShownAttempt<T extends { id: string }>(list: T[], initial: string | null) {
  const [, setSp] = useSearchParams();
  const [id, setId] = useState<string | null>(initial);
  const attempt = id ? list.find((a) => a.id === id) : undefined;
  const waiting = !!id && !attempt;
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => setId(null), 1500);
    return () => clearTimeout(t);
  }, [waiting]);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  /** `drop` lists address parameters that only meant "start a new attempt" (RC's retake seed n). */
  const finish = (next: string, drop: string[] = []) => {
    setId(next);
    setSp((p) => { const q = new URLSearchParams(p); q.set("review", next); drop.forEach((k) => q.delete(k)); return q; }, { replace: true });
  };
  return { attempt, waiting, finish, retake: () => setId(null) };
}

/** "less than a minute", "6 minutes", "3 hours", "2 days": how long the student was away. */
export function awayText(secs: number): string {
  const m = Math.round(secs / 60);
  if (m < 1) return "less than a minute";
  if (m < 60) return m === 1 ? "1 minute" : `${m} minutes`;
  const h = Math.round(m / 60);
  if (h < 48) return h === 1 ? "1 hour" : `${h} hours`;
  return `${Math.round(h / 24)} days`;
}

/**
 * How a set was opened (D83). gap: seconds since the student left it, when its draft came back. away: the breaks over
 * 30 minutes the student chose to carry on after, so the attempt is saved as interrupted and its time is not counted.
 * cleared: when a draft dropped for being a day old was last saved.
 */
export interface Resume { gap?: number; away?: number; cleared?: number }

/**
 * The door to a practice set (D83, docs/design/resume-and-quick-pick.md). Back within 30 minutes, the set carries on.
 * After longer, it asks first: Start fresh gives an honest time and a clean attempt; Continue brings the work back and
 * the attempt is saved as interrupted. The set's player mounts only after the choice, so it reads the draft as chosen.
 */
export function ComeBack({ draftKey, kicker, title, width, children }: { draftKey: string; kicker: ReactNode; title: ReactNode; width?: "wide" | "read"; children: (r: Resume) => ReactNode }) {
  const [open] = useState((): { ask: boolean; r: Resume } => {
    const d = readDraftAt(draftKey), now = Date.now();
    if (!d) { const cleared = peekCleared(draftKey); return { ask: false, r: cleared ? { cleared } : {} }; }
    const gap = Math.max(0, (now - d.at) / 1000);
    return { ask: comeBack(d.at, now) === "ask", r: { gap, ...(d.away ? { away: d.away } : {}) } };
  });
  const [r, setR] = useState<Resume | null>(open.ask ? null : open.r);
  useEffect(() => { if (open.r.cleared) dropCleared(draftKey); }, [draftKey, open.r.cleared]);
  if (r) return children(r);
  const gap = open.r.gap ?? 0;
  return (
    <Page width={width} className="gap-6 lg:gap-8">
      <PlayerBar kicker={kicker} title={title} />
      <section aria-labelledby="come-back" className="flex flex-col gap-4 rounded-2xl bg-card p-6 sm:p-8">
        <h2 id="come-back" className="text-heading font-semibold">You left this set {awayText(gap)} ago</h2>
        <p className="measure text-base text-foreground/85">Starting fresh gives you an honest time and a clean attempt. If you carry on, your answers count as usual, but this set's time is left out of your time figures.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={() => { writeDraft(draftKey, null); setR({}); }}>Start fresh</Button>
          <Button variant="secondary" onClick={() => setR({ gap, away: addAway(draftKey, gap) })}>Continue where I stopped</Button>
        </div>
      </section>
    </Page>
  );
}

/** The line above a set that came back: how long the timer paused, a break that keeps its time out, or a draft cleared. */
export function ResumeNote({ r, restored, onRestart }: { r: Resume; restored: boolean; onRestart?: () => void }) {
  let text: ReactNode = null;
  if (restored && r.away) text = <>Your answers are back. You took a break of {awayText(r.away)}, so this set's time will not be counted.</>;
  else if (restored && r.gap !== undefined) text = <>Your answers are back. The timer paused for {awayText(r.gap)}.</>;
  else if (!restored && r.cleared) {
    const days = diffDays(iso(new Date(r.cleared)), todayIso());
    text = <>Your unfinished attempt from {days === 1 ? "yesterday" : mediumDate(iso(new Date(r.cleared)))} was cleared: an unfinished set keeps for a day.</>;
  }
  if (!text) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      {restored && onRestart && <Button variant="ghost" size="sm" onClick={onRestart}>Start over</Button>}
    </div>
  );
}

/** The Time figure on a score card, red past the target; an attempt a long break interrupted has none (D83). */
export const timeShown = (a: { secs: number; away?: number }, over = false): ReactNode =>
  a.away ? "Not counted" : <span className={cn(over && "text-danger")}>{fmtSecs(a.secs)}</span>;

/** Under a score card: why an interrupted attempt has no time. */
export function BreakNote({ away }: { away?: number }) {
  return away ? <p className="text-base text-muted-foreground">You took a break of {awayText(away)} in this set, so its time is not counted.</p> : null;
}
