import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LrDiagram } from "../practice/types";

/**
 * LR pictures (F23): the seats of a set laid out as a row (several rows for a set that changes day by day) or round a
 * table. The review steps through the solution on it, filling seats in as each deduction places them; the attempt
 * uses the same layout, blank, as a scratch pad. docs/content/lr-format.md describes the data.
 */

type Cell = string[] | null;

/** Lays out one picture and asks `cell` for what goes in each seat. */
function Layout({ g, cell, col = "5.5rem", stack }: { g: LrDiagram; cell: (row: number, seat: number) => ReactNode; col?: string; stack?: boolean }) {
  if (g.layout === "circle") {
    const n = g.seats.length;
    return (
      // Taller than wide on a phone, so the cards of neighbouring seats do not overlap; positions are % of each side.
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[32rem] sm:aspect-square">
        <div className="absolute top-1/2 left-1/2 aspect-square w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/70" aria-hidden />
        <ol className="contents">
          {g.seats.map((label, k) => {
            // Seat 1 at the bottom, then round to the left of a person facing the centre: clockwise on screen.
            const a = (2 * Math.PI * k) / n;
            return (
              <li key={k} className="absolute w-[25%] -translate-x-1/2 -translate-y-1/2" style={{ left: `${50 - 38 * Math.sin(a)}%`, top: `${50 + 38 * Math.cos(a)}%` }}>
                {cell(0, k)}
                <span className="sr-only">Seat {label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
  const rows = g.rows ?? [""];
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r, ri) => (
        <div key={ri} className="flex flex-col gap-1.5">
          {r && <p className="text-sm font-semibold">{r}</p>}
          <div className="overflow-x-auto">
            {/* stack: a one-row picture becomes a list on a phone, seat 1 on top, so long cards need no sideways scrolling. */}
            <ol
              className={cn("grid gap-1.5 sm:w-max sm:min-w-full sm:gap-2 sm:[grid-template-columns:var(--cols)]", !stack && "w-max min-w-full [grid-template-columns:var(--cols)]")}
              style={{ "--cols": `repeat(${g.seats.length}, minmax(${col}, 1fr))` } as CSSProperties} aria-label={r || "Seats"}
            >
              {g.seats.map((_, k) => <li key={k}>{cell(ri, k)}</li>)}
            </ol>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One seat of the walkthrough: its number, then the person and what is known about them. */
function Seat({ label, c, fresh, stack }: { label: string; c: Cell; fresh: boolean; stack?: boolean }) {
  // In a phone list the seat number sits at the left and the facts run along one line.
  const line = stack && "max-sm:min-h-12 max-sm:flex-row max-sm:flex-wrap max-sm:justify-start max-sm:gap-x-2 max-sm:px-3 max-sm:text-left";
  if (c === null) {
    return (
      <div className={cn("flex min-h-16 flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 px-2 py-2 text-center", line)}>
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm text-muted-foreground line-through">empty</span>
      </div>
    );
  }
  const [name, ...rest] = c;
  return (
    <div className={cn(
      "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-center", line,
      fresh ? "bg-highlight-soft motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500" : "bg-secondary",
    )}>
      <span className={cn("text-sm text-muted-foreground", stack && "max-sm:w-5 max-sm:shrink-0")}>{label}</span>
      {name && <span className={cn("text-sm leading-tight font-semibold", name.endsWith("?") && "font-normal text-muted-foreground")}>{name}</span>}
      {rest.map((t, i) => <span key={i} className={cn("text-sm leading-tight", t.endsWith("?") ? "text-muted-foreground" : "text-foreground/80", stack && i < rest.length - 1 && "max-sm:after:content-[',']")}>{t}</span>)}
    </div>
  );
}

const same = (a: Cell | undefined, b: Cell | undefined) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

/**
 * The solution, step by step, with the picture beside it. Seats that a step fills in or changes are highlighted;
 * Play steps through on its own, and every animation stops under reduced motion (index.css).
 */
export function LrWalkthrough({ steps, g }: { steps: string[]; g?: LrDiagram }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = steps.length - 1;
  useEffect(() => {
    if (!playing) return;
    if (i >= last) { setPlaying(false); return; }
    const t = window.setTimeout(() => setI((x) => Math.min(x + 1, last)), 3500);
    return () => window.clearTimeout(t);
  }, [playing, i, last]);
  const frame = g?.frames[i], prev = i > 0 ? g?.frames[i - 1] : undefined;
  return (
    <section className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6" aria-labelledby="lr-walk">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="lr-walk" className="text-heading font-semibold">How it is solved</h2>
        <span className="text-sm text-muted-foreground" aria-live="polite">Step {i + 1} of {steps.length}</span>
      </div>
      <p className="measure min-h-[4.5rem] text-base">{steps[i]}</p>
      {g && frame && (
        <Layout g={g} stack={!g.rows} cell={(r, k) => {
          const c = frame[r][k], p = prev?.[r]?.[k];
          return <Seat key={JSON.stringify(c)} label={g.seats[k]} c={c} fresh={i > 0 && !same(c, p)} stack={!g.rows} />;
        }} />
      )}
      {g?.note && <p className="text-sm text-muted-foreground">{g.note}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => { setPlaying(false); setI(i - 1); }}>Previous step</Button>
        <Button variant="secondary" size="sm" disabled={i === last} onClick={() => { setPlaying(false); setI(i + 1); }}>Next step</Button>
        {g && last > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { if (i >= last) setI(0); setPlaying(!playing); }} aria-pressed={playing}>
            {playing ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}{playing ? "Pause" : i >= last ? "Play again" : "Play"}
          </Button>
        )}
      </div>
    </section>
  );
}

/** A blank copy of the set's layout to note placements while solving. Kept with the attempt's draft. */
export function LrScratch({ g, value, onChange }: { g: LrDiagram; value: string[][]; onChange: (v: string[][]) => void }) {
  const set = (r: number, k: number, t: string) => onChange(value.map((row, ri) => (ri === r ? row.map((x, ki) => (ki === k ? t : x)) : row)));
  return (
    <div className="flex flex-col gap-3">
      <Layout g={g} col="2.5rem" cell={(r, k) => (
        <label className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md bg-secondary px-1.5 py-2 text-center focus-within:ring-2 focus-within:ring-ring">
          <span className="text-sm text-muted-foreground">{g.seats[k]}</span>
          <input
            value={value[r]?.[k] ?? ""} onChange={(e) => set(r, k, e.target.value)} maxLength={30} autoComplete="off" spellCheck={false} size={1}
            aria-label={`Seat ${g.seats[k]}${g.rows ? ", " + g.rows[r] : ""}`}
            className="w-full min-w-0 bg-transparent text-center text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70" placeholder="…"
          />
        </label>
      )} />
      {/* The note's first part describes the layout; the rest explains walkthrough marks the scratch pad does not use. */}
      {g.note && <p className="text-sm text-muted-foreground">{g.note.split(/ (?=A crossed|A name with)/)[0]}</p>}
    </div>
  );
}

/** An empty scratch pad of the right size. */
export const blankScratch = (g: LrDiagram): string[][] => (g.rows ?? [""]).map(() => g.seats.map(() => ""));
