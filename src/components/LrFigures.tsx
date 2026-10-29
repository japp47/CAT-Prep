import { useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useGsap } from "../lib/motion";
import type { LrDiagram } from "../practice/types";

/**
 * The newer LR pictures (D53, docs/design/lr-visuals.md): a family tree, clock dials, a map of walks, lanes of bars on
 * a time axis, and bars. Each draws one frame; `prev` is the frame before, so only what changed moves: a person drops
 * in, a hand sweeps to its new time, a leg or a line draws itself (data-draw), a bar grows. Lines are SVG with
 * non-scaling strokes; every word is HTML or SVG text at 14 px or more. GSAP comes through useGsap, so nothing moves
 * under reduced motion.
 */

type Cell = string[] | null;
type Frame = Cell[][];
const same = (a: Cell | undefined, b: Cell | undefined) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
const pct = (x: number) => `${x}%`;

// ---------------------------------------------------------------------------------------------------------------
// Family tree

/**
 * People at their places (`at`, 0 to 100), a double line for a marriage ("=") and an elbow line from a parent to a
 * child. Someone not placed yet is faint; a person placed in this step is in highlighter; lines appear when their step
 * lists them in `lit` and draw themselves in.
 */
export function TreeFigure({ g, frame, prev, lit, before }: { g: LrDiagram; frame: Frame; prev?: Frame; lit: number[]; before: number[] }) {
  const at = g.at ?? [];
  return (
    // Names stay at 14 px and never overlap: on a phone the tree keeps its width and scrolls sideways.
    <div className="-mx-1 overflow-x-auto px-1">
    <div className="relative mx-auto aspect-[16/10] w-full min-w-[32rem] max-w-[44rem]">
      <div className="absolute inset-x-8 inset-y-9">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          {g.links?.map(([a, b, kind], i) => {
            if (!lit.includes(i)) return null;
            const [x1, y1] = at[a], [x2, y2] = at[b], fresh = !before.includes(i);
            if (kind === "=") {
              return (
                <g key={`${i}-${fresh}`} className="stroke-primary" strokeWidth={2.5}>
                  <line x1={x1} y1={y1 - 1.6} x2={x2} y2={y2 - 1.6} pathLength={100} data-draw={fresh || undefined} vectorEffect="non-scaling-stroke" />
                  <line x1={x1} y1={y1 + 1.6} x2={x2} y2={y2 + 1.6} pathLength={100} data-draw={fresh || undefined} vectorEffect="non-scaling-stroke" />
                </g>
              );
            }
            // A child of a married parent hangs from the middle of the couple's double line.
            const wed = g.links?.findIndex(([p, q, k]) => k === "=" && (p === a || q === a)) ?? -1;
            const partner = wed >= 0 ? (g.links![wed][0] === a ? g.links![wed][1] : g.links![wed][0]) : -1;
            const sx = partner >= 0 && lit.includes(wed) ? (x1 + at[partner][0]) / 2 : x1;
            const mid = (y1 + y2) / 2;
            return <path key={`${i}-${fresh}`} d={`M${sx} ${y1} V${mid} H${x2} V${y2}`} fill="none" className="stroke-muted-foreground/70" strokeWidth={2} pathLength={100} data-draw={fresh || undefined} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        <ol className="contents" aria-label="Family">
          {g.seats.map((name, k) => {
            const c = frame[0]?.[k] ?? [], known = c.length > 0, fresh = !!prev && !same(c, prev[0]?.[k]) && known;
            return (
              <li key={k} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(at[k][0]), top: pct(at[k][1]) }}>
                <div data-fresh={fresh || undefined} className={cn("flex min-w-16 flex-col items-center rounded-lg px-2.5 py-1 text-center transition-opacity",
                  fresh ? "bg-highlight text-highlight-foreground" : known ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground opacity-60")}>
                  <span className="text-base leading-tight font-semibold whitespace-nowrap">{name}</span>
                  {c.map((t, i) => <span key={i} className="text-sm leading-tight whitespace-nowrap">{t}</span>)}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Clock dials

/** Minutes past 12 from "8:24", "4:54 6/11" or "12:16 4/11"; null when the line is not a time. */
export function clockMinutes(t: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})(?:\s+(\d+)\/(\d+))?/.exec(t?.trim() ?? "");
  if (!m) return null;
  const h = +m[1] % 12, min = +m[2] + (m[3] ? +m[3] / +m[4] : 0);
  return h * 60 + min;
}
const hourAngle = (t: number) => (t / 2) % 360;
const minuteAngle = (t: number) => (t * 6) % 360;

/** The smaller wedge between the hands, as an SVG path on a dial of radius r centred at 60, 60. */
function wedge(a: number, b: number, r: number): string {
  let from = a, to = b;
  let d = (to - from + 360) % 360;
  if (d > 180) { [from, to] = [to, from]; d = 360 - d; }
  const p = (deg: number) => [60 + r * Math.sin((deg * Math.PI) / 180), 60 - r * Math.cos((deg * Math.PI) / 180)];
  const [x1, y1] = p(from), [x2, y2] = p(from + d);
  return `M60 60 L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function Dial({ label, c, was }: { label: string; c: Cell; was: Cell | undefined }) {
  const box = useRef<HTMLDivElement>(null);
  const t = clockMinutes(c?.[0]), before = clockMinutes(was?.[0]);
  const angle = c?.[1];
  // The hands sweep forward from the last time shown to this one; the wedge fades in after them. GSAP tweens plain
  // numbers and each frame writes the hands' own rotate(), so the turn always pivots on the dial's centre.
  useGsap(box, (gsap, el) => {
    if (t === null) return;
    const from = before ?? 0;
    const hour = el.querySelector("[data-hour]"), minute = el.querySelector("[data-minute]");
    if (before !== t && hour && minute) {
      const ha = hourAngle(t), ma = minuteAngle(t), h0 = hourAngle(from), m0 = minuteAngle(from);
      const v = { h: ha - ((ha - h0 + 360) % 360), m: ma - ((ma - m0 + 360) % 360) };
      const put = () => { hour.setAttribute("transform", `rotate(${v.h} 60 60)`); minute.setAttribute("transform", `rotate(${v.m} 60 60)`); };
      put();
      gsap.to(v, { h: ha, m: ma, duration: 0.9, ease: "power2.inOut", onUpdate: put });
    }
    gsap.from(el.querySelectorAll("[data-wedge]"), { opacity: 0, duration: 0.5, delay: before !== t ? 0.7 : 0, ease: "power1.out" });
  }, [c?.join("|")]);
  return (
    <figure ref={box} className="flex w-[11rem] flex-col items-center gap-1.5">
      <figcaption className="text-base font-semibold">{label}</figcaption>
      <svg viewBox="0 0 120 120" className="size-40" role="img" aria-label={`${label}: ${c?.join(", ") ?? "no time yet"}`}>
        <circle cx="60" cy="60" r="56" className="fill-secondary" />
        {Array.from({ length: 60 }, (_, k) => {
          const a = (k * 6 * Math.PI) / 180, big = k % 5 === 0;
          return <line key={k} x1={60 + (big ? 46 : 50) * Math.sin(a)} y1={60 - (big ? 46 : 50) * Math.cos(a)} x2={60 + 53 * Math.sin(a)} y2={60 - 53 * Math.cos(a)} className={big ? "stroke-foreground/60" : "stroke-foreground/20"} strokeWidth={big ? 2 : 1} />;
        })}
        {[12, 3, 6, 9].map((n, k) => {
          const a = (k * 90 * Math.PI) / 180;
          return <text key={n} x={60 + 37 * Math.sin(a)} y={60 - 37 * Math.cos(a) + 4} textAnchor="middle" className="fill-muted-foreground text-[11px] font-semibold">{n}</text>;
        })}
        {t !== null && angle && <path data-wedge d={wedge(hourAngle(t), minuteAngle(t), 34)} className="fill-highlight/45" />}
        {t !== null && (
          <>
            <line data-hour x1="60" y1="60" x2="60" y2="32" transform={`rotate(${hourAngle(t)} 60 60)`} className="stroke-foreground" strokeWidth={4.5} strokeLinecap="round" />
            <line data-minute x1="60" y1="60" x2="60" y2="16" transform={`rotate(${minuteAngle(t)} 60 60)`} className="stroke-primary" strokeWidth={3} strokeLinecap="round" />
          </>
        )}
        <circle cx="60" cy="60" r="3.5" className="fill-foreground" />
      </svg>
      <span className="text-base font-semibold tabular-nums">{c?.[0] ?? "?"}</span>
      {angle && <span className="rounded-md bg-highlight-soft px-1.5 text-sm font-semibold tabular-nums">{angle}</span>}
    </figure>
  );
}

/** One dial per seat, side by side, each with its caption, its time and the angle between its hands. */
export function ClockFigure({ g, frame, prev }: { g: LrDiagram; frame: Frame; prev?: Frame }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-8 gap-y-6">
      {g.seats.map((label, k) => <Dial key={k} label={label} c={frame[0]?.[k] ?? null} was={prev?.[0]?.[k] ?? undefined} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Map of walks

const WALK = ["stroke-primary", "stroke-success", "stroke-warning", "stroke-danger"];
const WALK_BG = ["bg-primary text-primary-foreground", "bg-success text-white dark:text-black", "bg-warning text-black", "bg-danger text-white dark:text-black"];

/**
 * North up, metres on a light grid, the start marked F, and one walk per path in its own colour. Legs drawn so far
 * come from `legs[step]`; a leg this step adds draws itself in; each walker's stop carries its label (the frame line).
 * `ties[step]` are dashed lines for distances the step works out, with their length.
 */
export function MapFigure({ g, frame, step }: { g: LrDiagram; frame: Frame; step: number }) {
  const paths = g.paths ?? [];
  const pts = paths.flatMap((p) => p.pts);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const pad = 3;
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const w = maxX - minX, h = maxY - minY;
  const X = (x: number) => ((x - minX) / w) * 100, Y = (y: number) => ((maxY - y) / h) * 100;
  const drawn = g.legs?.[step] ?? paths.map((p) => p.pts.length - 1), was = step > 0 ? g.legs?.[step - 1] ?? [] : [];
  const ties = g.ties?.[step] ?? [], tiesBefore = step > 0 ? (g.ties?.[step - 1] ?? []).map((t) => JSON.stringify(t)) : [];
  const grid = w > 60 ? 10 : 5;
  const lines: number[][] = [];
  for (let x = Math.ceil(minX / grid) * grid; x <= maxX; x += grid) lines.push([x, 0]);
  for (let y = Math.ceil(minY / grid) * grid; y <= maxY; y += grid) lines.push([y, 1]);
  return (
    <div className="-mx-1 overflow-x-auto px-1 pt-2 pb-8">
    <div className="relative mx-auto w-full min-w-[22rem] max-w-[40rem]" style={{ aspectRatio: `${Math.max(0.75, Math.min(1.6, w / h))}` } as CSSProperties}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <rect width="100" height="100" className="fill-secondary/40" />
        {lines.map(([v, axis], i) => axis === 0
          ? <line key={i} x1={X(v)} y1="0" x2={X(v)} y2="100" className={v === 0 ? "stroke-foreground/30" : "stroke-foreground/10"} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          : <line key={i} x1="0" y1={Y(v)} x2="100" y2={Y(v)} className={v === 0 ? "stroke-foreground/30" : "stroke-foreground/10"} strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        {paths.map((p, pi) => p.pts.slice(1).map((q, li) => {
          if (li >= (drawn[pi] ?? 0)) return null;
          const a = p.pts[li], fresh = li >= (was[pi] ?? 0) && step > 0;
          return <line key={`${pi}-${li}-${fresh}`} x1={X(a[0])} y1={Y(a[1])} x2={X(q[0])} y2={Y(q[1])} className={WALK[pi % WALK.length]} strokeWidth={3} strokeLinecap="round" pathLength={100} data-draw={fresh || undefined} vectorEffect="non-scaling-stroke" />;
        }))}
        {ties.map(([a, b], i) => {
          const fresh = !tiesBefore.includes(JSON.stringify(ties[i]));
          return <line key={`t${i}-${fresh}`} x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} className="stroke-foreground" strokeWidth={2} strokeDasharray="5 4" pathLength={fresh ? 100 : undefined} data-draw={fresh || undefined} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <span className="absolute top-2 right-2 rounded-md bg-card px-1.5 text-sm font-semibold" aria-hidden>N ↑</span>
      {paths[0] && (
        <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground px-2 text-sm font-bold text-background" style={{ left: pct(X(paths[0].pts[0][0])), top: pct(Y(paths[0].pts[0][1])) }}>F</span>
      )}
      <ol className="contents" aria-label="Walks">
        {paths.map((p, pi) => {
          const n = drawn[pi] ?? 0;
          if (n === 0) return null;
          const end = p.pts[n], c = frame[0]?.[pi] ?? [], x = X(end[0]);
          // Labels alternate above and below their stops so close stops do not collide, and stay inside the box.
          const across = x < 15 ? "translate-x-0" : x > 85 ? "-translate-x-full" : "-translate-x-1/2";
          return (
            <li key={pi} className={cn("absolute", across, pi % 2 ? "translate-y-[30%]" : "-translate-y-[130%]")} style={{ left: pct(x), top: pct(Y(end[1])) }}>
              <span className={cn("flex flex-col items-center rounded-md px-1.5 py-0.5 text-center text-sm leading-tight font-semibold whitespace-nowrap", WALK_BG[pi % WALK_BG.length])}>
                {p.name}{c.length > 0 && <span className="font-normal">{c.join(", ")}</span>}
              </span>
            </li>
          );
        })}
        {ties.map(([a, b, label], i) => (
          <li key={`l${i}`} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-card px-1.5 text-sm font-bold tabular-nums" style={{ left: pct((X(a[0]) + X(b[0])) / 2), top: pct((Y(a[1]) + Y(b[1])) / 2) }}>{label}</li>
        ))}
      </ol>
    </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Timeline

/** Round numbers for an axis from a to b: about six ticks. */
function ticks(a: number, b: number): number[] {
  const raw = (b - a) / 6, mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let t = Math.ceil(a / step) * step; t <= b + 1e-9; t += step) out.push(+t.toFixed(6));
  return out;
}

/**
 * One lane per row (a machine or a crew), each bar a job from its start to its end on a shared axis. Bars appear when
 * their step lists them in `lit`; a new bar grows from its start. The lane's frame lines sit at its right end.
 */
export function TimelineFigure({ g, frame, lit, before }: { g: LrDiagram; frame: Frame; lit: number[]; before: number[] }) {
  const [a, b] = g.span ?? [0, Math.max(...(g.bars ?? []).map((x) => x[2]), 1)];
  const at = (t: number) => pct(((t - a) / (b - a)) * 100);
  const rows = g.rows ?? [""];
  return (
    <div className="flex flex-col gap-2 overflow-x-auto pb-1">
      <div className="grid min-w-[34rem] grid-cols-[4.5rem_minmax(0,1fr)_5rem] items-center gap-x-3 gap-y-2">
        {rows.map((r, ri) => (
          <div key={ri} className="contents">
            <span className="text-sm font-semibold">{r}</span>
            <div className="relative h-11 rounded-md bg-secondary/60">
              {(g.bars ?? []).map(([lane, s, e, label], i) => {
                if (lane !== ri || !lit.includes(i)) return null;
                const fresh = !before.includes(i);
                return (
                  <span key={`${i}-${fresh}`} data-grow={fresh || undefined} title={label}
                    className={cn("absolute inset-y-1 flex origin-left items-center justify-center overflow-hidden rounded px-1 text-sm font-semibold whitespace-nowrap",
                      fresh ? "bg-highlight text-highlight-foreground" : "bg-primary text-primary-foreground")}
                    style={{ left: at(s), width: `calc(${at(e)} - ${at(s)} - 2px)` }}>{label}</span>
                );
              })}
            </div>
            <span className="text-sm font-semibold tabular-nums">{(frame[ri]?.[0] ?? []).join(", ")}</span>
          </div>
        ))}
        <span />
        <div className="relative h-6">
          {ticks(a, b).map((t) => <span key={t} className="absolute -translate-x-1/2 text-sm text-muted-foreground tabular-nums" style={{ left: at(t) }}>{t}</span>)}
        </div>
        <span />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Bars

/** The number a frame line starts with ("16 at most" is 16), or 0. */
const lead = (c: Cell | undefined) => parseFloat(c?.[0] ?? "") || 0;

/**
 * One bar per seat, its height the number its first line starts with, on a scale shared by every step, so a bar that
 * changes visibly grows or shrinks from where it was; the line itself sits on top of the bar.
 */
export function BarsFigure({ g, frame, prev }: { g: LrDiagram; frame: Frame; prev?: Frame }) {
  const box = useRef<HTMLDivElement>(null);
  const top = Math.max(1, ...g.frames.flatMap((f) => f[0].map(lead)));
  const now = frame[0].map(lead), was = prev?.[0].map(lead);
  useGsap(box, (gsap, el) => {
    el.querySelectorAll<HTMLElement>("[data-bar]").forEach((bar, k) => {
      const from = was ? was[k] : 0;
      if (from !== now[k]) gsap.fromTo(bar, { height: `${(from / top) * 85}%` }, { height: `${(now[k] / top) * 85}%`, duration: 0.7, ease: "power3.out" });
    });
  }, [now.join(",")]);
  return (
    <div ref={box} className="mx-auto flex h-60 w-full max-w-[36rem] items-end gap-3 sm:gap-5" role="img" aria-label={g.seats.map((s, k) => `${s}: ${(frame[0][k] ?? []).join(", ")}`).join("; ")}>
      {g.seats.map((s, k) => {
        const c = frame[0][k] ?? [], fresh = !!prev && !same(c, prev[0]?.[k]);
        return (
          <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            {/* The bar's own box, so its height is a share of the space left by the name; its value rides on top. */}
            <div className="flex w-full flex-1 flex-col items-center justify-end gap-1">
              <span className={cn("rounded-md px-1.5 text-center text-sm leading-tight font-semibold", fresh && "bg-highlight-soft")}>{c.join(", ")}</span>
              <div data-bar className={cn("w-full rounded-t-lg", fresh ? "bg-highlight" : "bg-primary")} style={{ height: `${(now[k] / top) * 85}%` }} />
            </div>
            <span className="text-base font-semibold">{s}</span>
          </div>
        );
      })}
    </div>
  );
}
