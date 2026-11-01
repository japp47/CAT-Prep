import { useRef } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGsap } from "../lib/motion";
import { cellKey, cellLabel, ways, type BoardGroup, type Shown, type TrailStep } from "../practice/replay";
import type { GridModel } from "../practice/solver";

/**
 * The DILR Replay board (F57, docs/design/replay.md): one grid per group of values, a row per person or match and a
 * column per choice. Cells are buttons while the student marks them (tap: cross, tick, empty); settled cells are shown
 * in tone and words. The count of ways left sits above it as a staircase, one step per worked step.
 */

/** How a cell reads: the student's tick or cross, a cross that follows from a tick, a settled tick or cross, and after checking what was wrong or missed. */
export interface CellView { mark?: "in" | "out" | "auto"; locked?: boolean; wrong?: boolean; missed?: boolean; ahead?: boolean; fresh?: boolean }

const WORD = { in: "ticked", out: "crossed out", auto: "crossed out by a tick" } as const;

function Cell({ label, row, v, onTap, text }: { label: string; row: string; v: CellView; onTap?: () => void; text?: boolean }) {
  const icon = v.mark === "in" ? <Check className="size-5" strokeWidth={2.75} aria-hidden /> : v.mark ? <X className={cn("size-4.5", v.mark === "auto" && "opacity-45")} strokeWidth={2.5} aria-hidden /> : null;
  const tone = v.wrong ? "bg-danger-soft text-danger ring-2 ring-danger ring-inset"
    : v.missed ? "bg-success-soft/50 text-success ring-2 ring-success ring-inset"
    : v.mark === "in" ? (v.locked ? "bg-success-soft text-success" : "bg-primary text-primary-foreground")
    : v.mark ? "bg-muted/40 text-muted-foreground"
    : "bg-muted/70 text-muted-foreground";
  const say = `${row}, ${label}: ${v.mark ? WORD[v.mark] : "empty"}${v.wrong ? ", wrong" : v.missed ? ", this step settles it" : v.ahead ? ", not proven yet" : ""}`;
  const body = (
    <>
      {text && <span className="truncate text-sm font-semibold">{label}</span>}
      {icon}
      {v.missed && !v.mark && <Check className="size-5 opacity-70" aria-hidden />}
      {v.ahead && <span className="absolute top-0.5 right-1 text-sm leading-none text-warning" aria-hidden>?</span>}
    </>
  );
  const cls = cn("rp-cell relative flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg px-1.5 transition-[background-color,transform] duration-150 motion-reduce:transition-none", tone, v.fresh && "rp-fresh");
  if (!onTap || v.locked) return <span className={cls} role="img" aria-label={say}>{body}</span>;
  return (
    <button type="button" onClick={onTap} aria-label={say}
      className={cn(cls, "cursor-pointer hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.94] dark:hover:brightness-110")}>
      {body}
    </button>
  );
}

export function ReplayBoard({ model, groups, view, onTap }: { model: GridModel; groups: BoardGroup[]; view: (key: string) => CellView; onTap?: (key: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fresh = groups.flatMap((g) => g.rows.flatMap((r) => g.cols.filter((c) => view(cellKey(r.name, c.v)).fresh).map((c) => cellKey(r.name, c.v)))).join();
  // Cells a step newly settles pop in, one after another.
  useGsap(ref, (gsap, el) => {
    const cells = el.querySelectorAll(".rp-fresh");
    if (cells.length) gsap.from(cells, { scale: 0.7, opacity: 0, duration: 0.32, stagger: 0.025, ease: "back.out(2)", clearProps: "all" });
  }, [fresh]);
  return (
    <div ref={ref} className="flex flex-wrap gap-4">
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title || "Board"} className="flex min-w-0 flex-1 basis-[22rem] flex-col gap-2 rounded-2xl bg-card p-4 sm:p-5">
          {g.title && <h3 className="text-base font-semibold">{g.title}</h3>}
          {g.perRow ? (
            // A league: each match with its three results named.
            <ul className="flex flex-col gap-2">
              {g.rows.map((r) => (
                <li key={r.name} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-sm text-muted-foreground sm:w-36 sm:shrink-0">{r.label}</span>
                  <span className="grid flex-1 grid-cols-3 gap-1.5">
                    {g.cols.map((c) => { const k = cellKey(r.name, c.v); return <Cell key={k} text label={cellLabel(model, g, r.name, c.v)} row={r.label} v={view(k)} onTap={onTap && (() => onTap(k))} />; })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">{g.title}</span></th>
                  {g.cols.map((c) => <th key={String(c.v)} scope="col" className="pb-0.5 text-center text-sm font-semibold text-muted-foreground">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.name}>
                    <th scope="row" className="pr-1 text-left text-sm font-semibold whitespace-nowrap">{r.label}</th>
                    {g.cols.map((c) => { const k = cellKey(r.name, c.v); return <td key={k} className="min-w-11 p-0"><Cell label={c.label} row={r.label} v={view(k)} onTap={onTap && (() => onTap(k))} /></td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}

/** A filled cell's view from what the board shows (Shown) and the rest. */
export const viewOf = (shown: Shown, key: string, extra: Partial<CellView> = {}): CellView => ({ mark: shown.get(key), ...extra });

/**
 * Ways left: the count as a big number, and under it a staircase, one bar per step, as long as the count on a log scale
 * (so 1,680 to 40 and 4 to 1 both read as real cuts). The bar of the step shown is solid; later steps stay faint
 * until reached. `best` is the step that cut the most, marked once it has been reached.
 */
export function WaysLeft({ trail, at, best, label = "Ways left" }: { trail: TrailStep[]; at: number; best?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const prev = useRef(at);
  const top = Math.log(trail[0].settled.count + 1);
  const len = (i: number) => Math.max(0.04, Math.log(trail[i].settled.count + 1) / top);
  const cur = trail[at].settled;
  useGsap(ref, (gsap) => {
    const from = trail[prev.current]?.settled.count ?? cur.count;
    prev.current = at;
    if (from === cur.count || !num.current || cur.capped) return;
    const o = { n: from };
    gsap.to(o, { n: cur.count, duration: 0.7, ease: "power3.out", onUpdate: () => { if (num.current) num.current.textContent = Math.round(o.n).toLocaleString("en-IN"); } });
    gsap.from(`[data-bar="${at}"]`, { scaleX: len(Math.max(0, at - 1)) / len(at), duration: 0.7, ease: "power3.out", clearProps: "transform" });
  }, [at]);
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base text-muted-foreground">{label}</span>
        {at > 0 && <span className="text-sm text-muted-foreground">from {ways(trail[0].settled.count, trail[0].settled.capped)}</span>}
      </div>
      <p className="text-title font-extrabold" aria-live="polite">
        <span ref={num}>{ways(cur.count, cur.capped)}</span>
        <span className="sr-only"> {cur.count === 1 ? "way" : "ways"} left</span>
      </p>
      <ol className="flex flex-col gap-1.5" aria-label="Ways left after each step">
        {trail.map((t, i) => (
          <li key={i} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 text-sm">
            <span className={cn("text-muted-foreground", i === at && "font-semibold text-foreground")}>{i === 0 ? "Start" : `Step ${i}`}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <span data-bar={i} className={cn("block h-full origin-left rounded-full transition-colors duration-300 motion-reduce:transition-none",
                i > at ? "bg-primary/15" : i === at ? "bg-primary" : "bg-primary/45")} style={{ width: `${len(i) * 100}%` }} />
            </span>
            <span className={cn("min-w-14 text-right", i > at ? "text-muted-foreground/60" : "text-foreground", i === best && i <= at && "hl font-semibold")}>
              {i > at ? "?" : ways(t.settled.count, t.settled.capped)}
            </span>
          </li>
        ))}
      </ol>
      {best !== undefined && best <= at && <p className="text-sm text-muted-foreground">Step {best} cut the most: <span className="text-foreground">{ways(trail[best - 1].settled.count, trail[best - 1].settled.capped)} to {ways(trail[best].settled.count)}</span>.</p>}
    </div>
  );
}
