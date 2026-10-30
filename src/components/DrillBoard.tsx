import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGsap } from "../lib/motion";
import { usePref } from "../lib/prefs";
import { LinkButton } from "./kit";
import { WORLDS, type Board, type World } from "../practice/lrlogic";

/**
 * The boards of the LR drills (F83 to F85, D47): seats in a row or round a table, and the four cases of a two-part
 * rule. Seats and cases are buttons while the student answers; after checking, each shows the true answer in words as
 * well as tone (Can sit, Ruled out), and what the student got wrong (You missed this, Not this one).
 */

/** How a seat or case reads after checking: picked and right, right but not picked, picked but wrong. */
export type Mark = "right" | "missed" | "wrong" | "no";

/** A sentence that says which way the people face and which way the seats run. */
export function boardCaption(b: Board): string {
  if (b.layout === "row") {
    const look = b.facing === "toward" ? "everyone faces you" : "everyone faces the same way as you, away from you";
    return `A row of ${b.n} seats, numbered 1 to ${b.n} from your left to your right; ${look}.`;
  }
  return `A round table with ${b.n} seats; everyone faces ${b.facing === "out" ? "away from the centre" : "the centre"}. Seat 1 is at the bottom.`;
}

const MARK_CLASS: Record<Mark, string> = {
  right: "bg-success-soft text-foreground",
  missed: "bg-transparent text-foreground ring-2 ring-success ring-inset ring-offset-0 [&_span]:opacity-80",
  wrong: "bg-danger-soft text-foreground ring-2 ring-danger ring-inset",
  no: "bg-muted/50 text-muted-foreground",
};
const MARK_WORD: Record<Mark, string> = { right: "Right", missed: "You missed this", wrong: "Not this one", no: "" };

export interface SeatView {
  /** Who or what sits here already. */
  lines?: string[];
  /** The student's pick, shown as the person being placed. */
  picked?: string;
  /** A free seat the student can tap. */
  tap?: boolean;
  mark?: Mark;
  /** Newly filled in, so it eases in. */
  fresh?: boolean;
  /** Marked as what matters here (someone who moves between seatings). */
  hl?: boolean;
  /** Named by the statement in focus. */
  lit?: boolean;
}

/** The first three letters on a phone, the whole name from a tablet up, so a row of seven fits a phone. */
function Name({ t, strong }: { t: string; strong?: boolean }) {
  return (
    <span className={cn("block max-w-full truncate text-sm", strong && "font-semibold")}>
      <span className="sm:hidden" aria-hidden>{t.length > 4 ? t.slice(0, 3) : t}</span>
      <span className="max-sm:sr-only">{t}</span>
    </span>
  );
}

function SeatBox({ k, v, onTap, small }: { k: number; v: SeatView; onTap?: (k: number) => void; small?: boolean }) {
  const body = (
    <>
      {(v.mark === "right" || v.mark === "wrong") && (
        <span className="absolute top-1 right-1" aria-hidden>{v.mark === "wrong" ? <X className="size-3.5 text-danger" /> : <Check className="size-3.5 text-success" />}</span>
      )}
      {v.picked ? <Name t={v.picked} strong /> : v.lines?.map((l, i) => <Name key={i} t={l} strong={i === 0} />)}
    </>
  );
  const base = cn("relative flex w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center transition-[background-color,transform] duration-200 motion-reduce:transition-none",
    small ? "min-h-11" : "min-h-14", v.fresh && "seat-fresh");
  const label = `Seat ${k + 1}${v.lines?.length ? ", " + v.lines.join(", ") : v.picked ? ", " + v.picked : ", empty"}${v.mark && v.mark !== "no" ? ". " + MARK_WORD[v.mark] : ""}`;
  if (v.tap && onTap) {
    return (
      <button type="button" onClick={() => onTap(k)} aria-pressed={!!v.picked} aria-label={label}
        className={cn(base, "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.96]",
          v.picked ? "bg-primary text-primary-foreground" : "bg-muted/70 hover:bg-muted")}>
        {body}
      </button>
    );
  }
  return <div className={cn(base, v.mark ? MARK_CLASS[v.mark] : v.hl ? "bg-highlight-soft" : v.lines?.length ? "bg-secondary" : "bg-muted/40", v.lit && "ring-2 ring-primary ring-inset")} aria-label={label} role="img">{body}</div>;
}

/**
 * Seats as the set describes them. A row runs left to right with its seat numbers under it; a table puts seat 1 at the
 * bottom and goes round to the left of someone facing the centre (clockwise on screen), as the set pictures do, with a
 * small arrow on each seat showing which way its person faces.
 */
export function SeatBoard({ board, seat, onTap, label, small }: { board: Board; seat: (k: number) => SeatView; onTap?: (k: number) => void; label: string; small?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  // Seats that were just filled in ease in; nothing moves under reduced motion.
  useGsap(root, (gsap, el) => {
    const fresh = el.querySelectorAll(".seat-fresh");
    if (fresh.length) gsap.from(fresh, { scale: 0.85, opacity: 0, duration: 0.35, stagger: 0.06, ease: "back.out(2)", clearProps: "all" });
  }, [Array.from({ length: board.n }, (_, k) => JSON.stringify(seat(k))).join("|")]);
  const n = board.n;
  if (board.layout === "circle") {
    const out = board.facing === "out";
    return (
      <div ref={root} role="group" aria-label={label} className={cn("relative mx-auto aspect-square w-full", small ? "max-w-[18rem]" : "max-w-[24rem]")}>
        <div className="absolute top-1/2 left-1/2 aspect-square w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/70" aria-hidden />
        {/* Which way each seat faces: a small triangle between the seat and the table, pointing in or out. */}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full fill-muted-foreground/70" aria-hidden>
          {Array.from({ length: n }, (_, k) => {
            const a = (2 * Math.PI * k) / n, r = 26, x = 50 - r * Math.sin(a), y = 50 + r * Math.cos(a);
            return <path key={k} d="M0 -2.6 L2.4 1.6 L-2.4 1.6 Z" transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + (out ? 180 : 0)})`} />;
          })}
        </svg>
        {Array.from({ length: n }, (_, k) => {
          const a = (2 * Math.PI * k) / n;
          return (
            <div key={k} className="absolute flex w-[21%] -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${50 - 40 * Math.sin(a)}%`, top: `${50 + 40 * Math.cos(a)}%` }}>
              <SeatBox k={k} v={seat(k)} onTap={onTap} small />
              {/* The number sits on the outer side, so it never meets the arrow between the seat and the table. */}
              <span className={cn("absolute text-sm text-muted-foreground tabular-nums", Math.cos(a) < -0.3 ? "bottom-full mb-0.5" : "top-full mt-0.5")} aria-hidden>{k + 1}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div ref={root} className="flex flex-col gap-2">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol role="group" aria-label={label} className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(2.75rem, 1fr))` }}>
          {Array.from({ length: n }, (_, k) => (
            <li key={k} className="flex flex-col items-center gap-1">
              <SeatBox k={k} v={seat(k)} onTap={onTap} small={small} />
              <span className="text-sm text-muted-foreground tabular-nums" aria-hidden>{k + 1}</span>
            </li>
          ))}
        </ol>
      </div>
      {/* Which way the row faces, drawn once under it. */}
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <ChevronUp className={cn("size-4", board.facing === "toward" && "rotate-180")} aria-hidden />
        {board.facing === "toward" ? "They face you: their left is your right" : "They face away from you: their left is your left"}
      </p>
    </div>
  );
}

/** The four cases of a two-part rule, in the order both, P only, Q only, neither, as one line each for P and Q. */
export function caseLines(c: { p: string; q: string; np: string; nq: string }): Record<World, [string, string]> {
  return { both: [c.p, c.q], p: [c.p, c.nq], q: [c.np, c.q], neither: [c.np, c.nq] };
}

/**
 * The four cases as tiles to tap: tapped means "this clue rules it out". After checking, every tile says what is true
 * (Ruled out or Allowed) and marks the ones the student got wrong.
 */
export function RuleTiles({ lines, picked, onTap, answer }: { lines: Record<World, [string, string]>; picked: World[]; onTap?: (w: World) => void; answer?: World[] }) {
  const root = useRef<HTMLDivElement>(null);
  useGsap(root, (gsap, el) => {
    if (answer) gsap.from(el.querySelectorAll("[data-verdict]"), { y: 6, opacity: 0, duration: 0.3, stagger: 0.07, ease: "power2.out", clearProps: "all" });
  }, [!!answer]);
  return (
    <div ref={root} className="grid grid-cols-2 gap-2" role="group" aria-label="The four cases">
      {WORLDS.map((w, i) => {
        const on = picked.includes(w);
        const out = answer?.includes(w);
        const mark: Mark | undefined = answer ? (on && out ? "right" : out ? "missed" : on ? "wrong" : undefined) : undefined;
        const content: ReactNode = (
          <>
            <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span className="tabular-nums" aria-hidden>{i + 1}</span>
              {answer ? (
                <span data-verdict className={cn("font-semibold", out ? "text-danger" : "text-success")}>{out ? "Ruled out" : "Allowed"}</span>
              ) : on && <span className="font-semibold text-danger">Ruled out</span>}
            </span>
            <span className={cn("text-base font-semibold", (answer ? out : on) && "line-through decoration-danger/70 decoration-2")}>{lines[w][0]}</span>
            <span className={cn("text-base", (answer ? out : on) && "line-through decoration-danger/70 decoration-2")}>{lines[w][1]}</span>
            {mark && mark !== "right" && <span className={cn("text-sm font-semibold", mark === "wrong" ? "text-danger" : "text-foreground")}>{MARK_WORD[mark]}</span>}
          </>
        );
        const cls = "flex min-h-28 flex-col gap-1 rounded-xl p-3.5 text-left sm:p-4";
        if (!answer && onTap) {
          return (
            <button key={w} type="button" aria-pressed={on} onClick={() => onTap(w)}
              className={cn(cls, "transition-[background-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
                on ? "bg-danger-soft" : "bg-muted/70 hover:bg-muted")}>
              {content}
            </button>
          );
        }
        return <div key={w} className={cn(cls, out ? "bg-danger-soft" : "bg-muted/50", mark === "missed" && "ring-2 ring-danger ring-inset", mark === "wrong" && "ring-2 ring-foreground/40 ring-inset")}>{content}</div>;
      })}
    </div>
  );
}

/**
 * How a drill works, with one worked example (D48). Open until the student has finished a run of this drill, then
 * folded; opening or closing it is remembered.
 */
export function DrillHow({ id, done, title = "How it works", children }: { id: string; done: boolean; title?: string; children: ReactNode }) {
  const [pref, setPref] = usePref<boolean | null>("drillHow:" + id, null);
  const open = pref ?? !done;
  const body = useRef<HTMLDivElement>(null);
  useGsap(body, (gsap, el) => { gsap.from(el, { height: 0, opacity: 0, duration: 0.35, ease: "power2.out", clearProps: "all" }); }, [open]);
  return (
    <section className="overflow-hidden rounded-2xl bg-secondary/60">
      <button type="button" aria-expanded={open} aria-controls={"how-" + id} onClick={() => setPref(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:px-6">
        <span className="text-base font-semibold">{title}</span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div ref={body} id={"how-" + id} className="flex flex-col gap-4 overflow-hidden px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>}
    </section>
  );
}

/** Numbered steps inside a how-it-works card. */
export function HowSteps({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((x, i) => (
        <li key={i} className="flex gap-3 text-base">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-sm font-semibold tabular-nums">{i + 1}</span>
          <span className="measure">{x}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Asked before a drill that would give away a set the student has not solved (D49): solve it first, or carry on.
 * Not shown when the drill was opened from the set's own review.
 */
export function SolveFirst({ title, set, minutes, what, onGo }: { title: string; set: string; minutes: number; what: string; onGo: () => void }) {
  return (
    <section aria-label="Solve the set first" className="flex flex-col gap-4 rounded-2xl bg-card p-5 sm:p-8">
      <h2 className="text-title font-extrabold text-balance">Solve "{title}" first?</h2>
      <p className="measure text-base">{what} If you open it now, the set is spoiled as practice: you will know the answer before you try it.</p>
      <p className="measure text-base text-muted-foreground">Solve it first ({minutes} minutes). Its review then brings you back here, to the drill for whatever went wrong.</p>
      <div className="flex flex-wrap items-center gap-3">
        <LinkButton to={`/practice/lr/${set}`}>Solve the set first</LinkButton>
        <Button variant="secondary" onClick={onGo}>Show me anyway</Button>
      </div>
    </section>
  );
}
