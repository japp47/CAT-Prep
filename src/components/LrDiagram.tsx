import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Box, Check, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calm, loadGsap, useGsap } from "../lib/motion";
import { usePref } from "../lib/prefs";
import type { LrDiagram } from "../practice/types";

// three.js comes with it, so it loads only for the review of a circular set (D41).
const LrTable3D = lazy(() => import("./LrTable3D"));

/**
 * LR pictures (F23): the seats of a set laid out as a row (several rows for a set that changes day by day), round a
 * table, as a grid (a results table, team against team) or as a bracket (a knockout, one column per round). The review
 * steps through the solution on it, filling cells in as each deduction places them; the attempt uses the same layout,
 * blank, as a scratch pad. docs/content/lr-format.md describes the data.
 */

type Cell = string[] | null;

/** A grid cell or bracket slot that cannot hold anything: null in the first picture. */
const closed = (g: LrDiagram, r: number, k: number) => (g.layout === "grid" || g.layout === "bracket") && g.frames[0]?.[r]?.[k] === null;

/** Lays out one picture and asks `cell` for what goes in each seat. `small` is the scratch pad's tighter circle. */
function Layout({ g, cell, col = "5.5rem", stack, small }: { g: LrDiagram; cell: (row: number, seat: number) => ReactNode; col?: string; stack?: boolean; small?: boolean }) {
  const rows = g.rows ?? [""];
  if (g.layout === "circle") {
    const n = g.seats.length;
    return (
      // Taller than wide on a phone, so the cards of neighbouring seats do not overlap; positions are % of each side.
      <div className={cn("relative mx-auto w-full", small ? "aspect-square max-w-[20rem]" : "aspect-[3/4] max-w-[32rem] sm:aspect-square")}>
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
  if (g.layout === "grid") {
    return (
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-center">
          <thead>
            <tr><td />{g.seats.map((h, k) => <th key={k} scope="col" className="px-1 text-sm font-semibold text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {/* A results grid's first columns are its teams, so on a phone the row takes the column's short name. */}
                <th scope="row" className="sticky left-0 z-10 bg-card pr-1.5 text-left text-sm font-semibold sm:pr-2">
                  {g.mirror ? <><span className="sm:hidden" aria-hidden>{g.seats[ri]}</span><span className="max-sm:sr-only">{r}</span></> : r}
                </th>
                {g.seats.map((_, k) => (
                  <td key={k} className="p-0">
                    {/* A cell that cannot hold anything is crossed out, so it does not read as one still to fill. */}
                    {closed(g, ri, k)
                      ? <div className="h-12 min-w-9 rounded-md bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),color-mix(in_oklab,var(--muted-foreground)_45%,transparent)_50%,transparent_calc(50%+1px))] sm:min-w-11" aria-label="No match" />
                      : cell(ri, k)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (g.layout === "bracket") {
    // One column per round. The later rounds sit centred against the earlier ones, as on a draw sheet, but with no
    // lines between them: the draw is re-made every round, so a match does not feed a fixed slot.
    return (
      <div className="overflow-x-auto">
        <div className="grid w-full gap-2 [grid-template-columns:var(--cols)] sm:gap-3" style={{ "--cols": `repeat(${rows.length}, minmax(4.25rem, 1fr))` } as CSSProperties}>
          {rows.map((r, ri) => (
            <div key={ri} className="flex flex-col gap-2">
              <p className="text-sm font-semibold">{r}</p>
              <ol className="flex flex-1 flex-col justify-around gap-2" aria-label={r}>
                {g.seats.map((_, k) => (closed(g, ri, k) ? null : <li key={k}>{cell(ri, k)}</li>))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    );
  }
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

/** A cell the current step filled in or changed. GSAP brings it in (the walkthrough below); the colour stays. */
const freshClass = "bg-highlight-soft";

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
    <div data-fresh={fresh || undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-center", line, fresh ? freshClass : "bg-secondary")}>
      <span className={cn("text-sm text-muted-foreground", stack && "max-sm:w-5 max-sm:shrink-0")}>{label}</span>
      {name && <span className={cn("text-sm leading-tight font-semibold", name.endsWith("?") && "font-normal text-muted-foreground")}>{name}</span>}
      {rest.map((t, i) => <span key={i} className={cn("text-sm leading-tight", t.endsWith("?") ? "text-muted-foreground" : "text-foreground/80", stack && i < rest.length - 1 && "max-sm:after:content-[',']")}>{t}</span>)}
    </div>
  );
}

/** One cell of a results grid: a result (W, D, L, "?") or a total, with any second line below it. */
function Mark({ c, fresh }: { c: Cell; fresh: boolean }) {
  const [top, ...rest] = c ?? [];
  return (
    <div data-fresh={fresh || undefined} className={cn("flex h-12 min-w-9 flex-col items-center justify-center rounded-md px-1.5 whitespace-nowrap sm:min-w-11", fresh ? freshClass : "bg-secondary")}>
      {top && <span className={cn("text-base leading-tight font-semibold tabular-nums", top.endsWith("?") && "font-normal text-muted-foreground")}>{top}</span>}
      {rest.map((t, i) => <span key={i} className="text-sm leading-tight text-foreground/80 tabular-nums">{t}</span>)}
    </div>
  );
}

/** One match of a bracket: both players, the winner in bold with a tick and the loser struck through, then notes. */
function Match({ c, fresh }: { c: Cell; fresh: boolean }) {
  if (!c || c.length < 2) {
    return <div className="flex min-h-[4.25rem] items-center justify-center rounded-md border border-dashed border-muted-foreground/50 text-sm text-muted-foreground">Not known yet</div>;
  }
  const [a, b, w, ...notes] = c;
  const side = (p: string) => (
    <span className={cn("flex items-center justify-between gap-2 px-2.5 text-base tabular-nums", w && (p === w ? "font-semibold" : "text-muted-foreground line-through"))}>
      {p || "?"}
      {w && p === w ? <Check data-tick className="size-4 shrink-0" aria-label="won" /> : w && <span className="sr-only">lost</span>}
    </span>
  );
  return (
    <div data-fresh={fresh || undefined} className={cn("flex min-h-[4.25rem] flex-col justify-center gap-0.5 rounded-md py-1.5", fresh ? freshClass : "bg-secondary")}>
      {side(a)}{side(b)}
      {notes.map((t, i) => <span key={i} className="px-2.5 text-sm text-muted-foreground">{t}</span>)}
    </div>
  );
}

const same = (a: Cell | undefined, b: Cell | undefined) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

/** A seat's label on the 3D table: its number and person, then what is known about them, in one small tag. */
function Tag({ label, c, fresh }: { label: string; c: Cell; fresh: boolean }) {
  const [name, ...rest] = c ?? [];
  return (
    <div className={cn("flex max-w-[8.5rem] flex-col rounded-md px-2 py-1 text-center", fresh ? freshClass : "bg-background/90", c === null && "opacity-70")}>
      <span className="text-sm leading-tight">
        <span className="text-muted-foreground">{label} </span>
        {c === null ? <span className="text-muted-foreground line-through">empty</span> : <span className={cn("font-semibold", name?.endsWith("?") && "font-normal text-muted-foreground")}>{name || "?"}</span>}
      </span>
      {rest.length > 0 && <span className="text-sm leading-tight text-foreground/80">{rest.join(", ")}</span>}
    </div>
  );
}

/**
 * The solution, step by step, with the picture beside it. Cells that a step fills in or changes are highlighted and
 * pop in (GSAP, D41), in reading order, so a bracket fills round by round; a won match ticks. A circular set is a 3D
 * table unless the student picks the flat view. Play steps through on its own; under reduced motion nothing moves.
 */
export function LrWalkthrough({ steps, g }: { steps: string[]; g?: LrDiagram }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [flat, setFlat] = usePref("lrFlat", false);
  const [no3d, setNo3d] = useState(false);
  const box = useRef<HTMLElement>(null);
  const last = steps.length - 1;
  useEffect(() => {
    if (!playing) return;
    if (i >= last) { setPlaying(false); return; }
    const t = window.setTimeout(() => setI((x) => Math.min(x + 1, last)), 3500);
    return () => window.clearTimeout(t);
  }, [playing, i, last]);
  // Fetched while the student reads the first step, so the second step already moves.
  useEffect(() => { if (g && !calm()) loadGsap().catch(() => {}); }, [g]);
  useGsap(box, (gsap, el) => {
    if (i === 0) return;
    gsap.from(el.querySelector("[data-step]"), { opacity: 0, y: 6, duration: 0.35, ease: "power2.out" });
    gsap.from(el.querySelectorAll("[data-fresh]"), { opacity: 0, scale: 0.82, y: 10, duration: 0.5, stagger: 0.07, ease: "back.out(1.8)", clearProps: "transform,opacity" });
    gsap.from(el.querySelectorAll("[data-fresh] [data-tick]"), { scale: 0, rotation: -90, duration: 0.4, delay: 0.3, stagger: 0.07, ease: "back.out(2.5)", transformOrigin: "50% 50%" });
  }, [i]);
  const frame = g?.frames[i], prev = i > 0 ? g?.frames[i - 1] : undefined;
  const ring = g?.layout === "circle";
  const fresh = useMemo(() => (frame && ring ? frame[0].map((c, k) => i > 0 && !same(c, prev?.[0]?.[k])) : []), [frame, prev, ring, i]);
  const flatPicture = g && frame && (
    <Layout g={g} stack={g.layout === "row" && !g.rows} cell={(r, k) => {
      const c = frame[r][k], f = i > 0 && !same(c, prev?.[r]?.[k]), key = JSON.stringify(c);
      if (g.layout === "grid") return <Mark key={key} c={c} fresh={f} />;
      if (g.layout === "bracket") return <Match key={key} c={c} fresh={f} />;
      return <Seat key={key} label={g.seats[k]} c={c} fresh={f} stack={!g.rows} />;
    }} />
  );
  return (
    <section ref={box} className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6" aria-labelledby="lr-walk">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="lr-walk" className="text-heading font-semibold">How it is solved</h2>
        <span className="text-sm text-muted-foreground" aria-live="polite">Step {i + 1} of {steps.length}</span>
      </div>
      <p data-step className="measure min-h-[4.5rem] text-base">{steps[i]}</p>
      {g && frame && (ring && !flat && !no3d
        ? (
          <Suspense fallback={flatPicture}>
            <LrTable3D n={g.seats.length} cells={frame[0]} fresh={fresh} onFail={() => setNo3d(true)}
              label={(k) => <Tag key={JSON.stringify(frame[0][k])} label={g.seats[k]} c={frame[0][k]} fresh={fresh[k]} />} />
          </Suspense>
        )
        : flatPicture)}
      {g?.note && <p className="text-sm text-muted-foreground">{g.note}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => { setPlaying(false); setI(i - 1); }}>Previous step</Button>
        <Button variant="secondary" size="sm" disabled={i === last} onClick={() => { setPlaying(false); setI(i + 1); }}>Next step</Button>
        {g && last > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { if (i >= last) setI(0); setPlaying(!playing); }} aria-pressed={playing}>
            {playing ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}{playing ? "Pause" : i >= last ? "Play again" : "Play"}
          </Button>
        )}
        {ring && !no3d && (
          <Button variant="ghost" size="sm" onClick={() => setFlat(!flat)}>
            {flat ? <Box data-icon="inline-start" /> : <Square data-icon="inline-start" />}{flat ? "3D view" : "Flat view"}
          </Button>
        )}
      </div>
    </section>
  );
}

/**
 * Writes one cell of the scratch pad. In a results grid with `mirror`, the other team's cell follows (W across writes
 * L down), unless the student has already written something else there.
 */
export function writeScratch(g: LrDiagram, value: string[][], r: number, k: number, t: string): string[][] {
  const next = value.map((row) => [...row]);
  const old = next[r][k];
  next[r][k] = t;
  if (g.layout === "grid" && g.mirror && r !== k && k < (g.rows?.length ?? 0)) {
    const flip = (x: string) => g.mirror![x.trim().toUpperCase()] ?? "";
    const other = next[k][r];
    if (!other || other === flip(old)) next[k][r] = flip(t);
  }
  return next;
}

const input = "w-full min-w-0 bg-transparent text-center text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70";

/** A blank copy of the set's layout to note placements while solving. Kept with the attempt's draft. */
export function LrScratch({ g, value, onChange }: { g: LrDiagram; value: string[][]; onChange: (v: string[][]) => void }) {
  const set = (r: number, k: number, t: string) => onChange(writeScratch(g, value, r, k, t));
  const v = (r: number, k: number) => value[r]?.[k] ?? "";
  const rowName = (r: number) => (g.rows ? g.rows[r] : "");
  return (
    <div className="flex flex-col gap-3">
      <Layout g={g} col="2.5rem" small cell={(r, k) => {
        if (g.layout === "grid") {
          return (
            <input
              value={v(r, k)} onChange={(e) => set(r, k, e.target.value)} maxLength={12} autoComplete="off" spellCheck={false} size={1}
              aria-label={`${rowName(r)}, ${g.seats[k]}`} className={cn(input, "h-12 min-w-9 rounded-md bg-secondary px-1 focus:ring-2 focus:ring-ring sm:min-w-11")}
            />
          );
        }
        if (g.layout === "bracket") {
          return (
            <input
              value={v(r, k)} onChange={(e) => set(r, k, e.target.value)} maxLength={20} autoComplete="off" spellCheck={false} size={1}
              aria-label={`${rowName(r)}, match ${k + 1}`} placeholder="… v …" className={cn(input, "h-12 rounded-md bg-secondary px-2 focus:ring-2 focus:ring-ring")}
            />
          );
        }
        return (
          <label className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md bg-secondary px-1.5 py-2 text-center focus-within:ring-2 focus-within:ring-ring">
            <span className="text-sm text-muted-foreground">{g.seats[k]}</span>
            <input
              value={v(r, k)} onChange={(e) => set(r, k, e.target.value)} maxLength={30} autoComplete="off" spellCheck={false} size={1}
              aria-label={`Seat ${g.seats[k]}${g.rows ? ", " + g.rows[r] : ""}`} className={input} placeholder="…"
            />
          </label>
        );
      }} />
      {/* The note's first part describes the layout; the rest explains walkthrough marks the scratch pad does not use. */}
      {g.note && <p className="text-sm text-muted-foreground">{g.note.split(/ (?=A crossed|A name with|The winner of)/)[0]}</p>}
    </div>
  );
}

/** An empty scratch pad of the right size. */
export const blankScratch = (g: LrDiagram): string[][] => (g.rows ?? [""]).map(() => g.seats.map(() => ""));
