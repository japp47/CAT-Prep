import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DiChart as Chart, DiData } from "../practice/types";

/**
 * A DI set's chart (F90, docs/design/di-sets.md), drawn from the set's numbers the way a printed exam chart is: gridlines
 * and axis values to read off, values printed on the marks when the set says so, a legend in words, and no hover
 * values (hovering would answer the "read a value" questions). Colours are the validated series tokens (dataviz skill;
 * --series-1 to 4 in index.css); text uses text tokens, never a series colour. The chart keeps its size and scrolls
 * sideways in a narrow pane, so no text falls under 14 px. Screen readers get the numbers as a table.
 */

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];
const fmt = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function DiFigure({ chart, data }: { chart: Chart; data: DiData }) {
  const title = chart.title ?? data.caption;
  return (
    <figure className="flex min-w-0 flex-col gap-2.5">
      <figcaption className="flex flex-col">
        <span className="text-base font-semibold">{title}</span>
        {data.unit && chart.kind !== "table" && <span className="text-sm text-muted-foreground">{data.unit}</span>}
      </figcaption>
      {chart.kind === "table" ? <DiTable data={data} /> : <>
        <Legend names={seriesNames(chart, data)} kind={chart.kind} />
        <Scroller>{chart.kind === "line" ? <Lines chart={chart} data={data} /> : <Bars chart={chart} data={data} />}</Scroller>
        <SrTable data={data} />
      </>}
    </figure>
  );
}

/**
 * A chart keeps its size (text stays 14 px and up) and scrolls sideways in a narrow pane; when it does, a line under
 * it says so, so nobody misses the last bars.
 */
function Scroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setWide(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <>
    <div ref={ref} className="-mx-1 overflow-x-auto px-1 pb-1">{children}</div>
    {wide && <p className="text-sm text-muted-foreground">Scroll the chart sideways to see all of it.</p>}
  </>;
}

/** The series a chart colours: its columns (bars grouped by row), or its rows (lines across columns, bars by column). */
function seriesNames(c: Chart, d: DiData): string[] {
  return c.kind === "line" || c.by === "cols" ? d.rows.map((r) => r.name) : d.cols;
}

function Legend({ names, kind }: { names: string[]; kind: Chart["kind"] }) {
  if (names.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5" aria-hidden>
      {names.map((n, i) => (
        <li key={n} className="flex items-center gap-2 text-sm text-foreground/85">
          {kind === "line"
            ? <svg width="22" height="10" className="shrink-0"><line x1="1" y1="5" x2="21" y2="5" stroke={SERIES[i]} strokeWidth="2" strokeLinecap="round" /><circle cx="11" cy="5" r="3.5" fill={SERIES[i]} /></svg>
            : <span className="size-3 shrink-0 rounded-[3px]" style={{ background: SERIES[i] }} />}
          {n}
        </li>
      ))}
    </ul>
  );
}

const PAD = { top: 26, right: 8, bottom: 34, left: 44 };
const PLOT_H = 220;

/** The value axis: gridlines at each step and their values, recessive. */
function Axis({ max, step, width }: { max: number; step: number; width: number }) {
  const ticks = Array.from({ length: Math.floor(max / step + 1e-9) + 1 }, (_, k) => k * step);
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  return <>
    {ticks.map((t) => (
      <g key={t}>
        <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={t === 0 ? 1.5 : 1} />
        <text x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end" className="fill-muted-foreground text-sm tabular-nums">{fmt(t)}</text>
      </g>
    ))}
  </>;
}

/** The value scale: the set's own, or the next round step above the largest value. */
function scale(c: Chart, values: number[]) {
  if (c.axis) return c.axis;
  const top = Math.max(...values, 1), raw = top / 5, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return { max: Math.ceil(top / step) * step, step, label: "" };
}

/** A bar whose data end is rounded (4 px) and whose baseline end is square. */
const barPath = (x: number, y: number, w: number, h: number, r = 4) =>
  h <= 0 ? "" : `M${x},${y + h}V${y + Math.min(r, h)}Q${x},${y} ${x + Math.min(r, w / 2)},${y}H${x + w - Math.min(r, w / 2)}Q${x + w},${y} ${x + w},${y + Math.min(r, h)}V${y + h}Z`;

function Bars({ chart, data }: { chart: Chart; data: DiData }) {
  const byCols = chart.by === "cols";
  // groups along the axis, each with one value per series
  const groups = byCols ? data.cols.map((c, j) => ({ name: c, vals: data.rows.map((r) => r.cells[j] ?? 0) })) : data.rows.map((r) => ({ name: r.name, vals: r.cells.map((v) => v ?? 0) }));
  const stacked = chart.kind === "stacked";
  const k = groups[0]?.vals.length ?? 1;
  const values = stacked ? groups.map((g) => g.vals.reduce((a, b) => a + b, 0)) : groups.flatMap((g) => g.vals);
  const { max, step } = scale(chart, values);
  // Bars at most 24 px (dataviz mark spec), spaced so a printed value above each never meets its neighbour's.
  const barW = 24, gap = stacked ? 0 : 6, groupGap = 30;
  const groupW = stacked ? barW + 10 : k * barW + (k - 1) * gap;
  const width = PAD.left + groups.length * (groupW + groupGap) + PAD.right;
  const height = PAD.top + PLOT_H + PAD.bottom;
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block max-w-none" aria-hidden>
      <Axis max={max} step={step} width={width} />
      {groups.map((g, gi) => {
        const x0 = PAD.left + groupGap / 2 + gi * (groupW + groupGap);
        let acc = 0;
        return (
          <g key={g.name}>
            {g.vals.map((v, si) => {
              if (stacked) {
                const top = y(acc + v), h = y(acc) - top - (acc > 0 ? 2 : 0);
                acc += v;
                return (
                  <g key={si}>
                    <path d={si === g.vals.length - 1 ? barPath(x0 + 5, top, barW, h) : `M${x0 + 5},${top}h${barW}v${h}h${-barW}Z`} fill={SERIES[si]} />
                    {chart.labels && h > 18 && <text x={x0 + 5 + barW / 2} y={top + h / 2} dy="0.35em" textAnchor="middle" className="fill-white text-sm font-semibold">{fmt(v)}</text>}
                  </g>
                );
              }
              const x = x0 + si * (barW + gap);
              return (
                <g key={si}>
                  <path d={barPath(x, y(v), barW, y(0) - y(v))} fill={SERIES[si]} />
                  {chart.labels && <text x={x + barW / 2} y={y(v) - 7} textAnchor="middle" className="fill-foreground text-sm">{fmt(v)}</text>}
                </g>
              );
            })}
            {stacked && chart.labels && <text x={x0 + 5 + barW / 2} y={y(acc) - 7} textAnchor="middle" className="fill-foreground text-sm font-semibold">{fmt(acc)}</text>}
            <text x={x0 + groupW / 2} y={PAD.top + PLOT_H + 22} textAnchor="middle" className="fill-foreground text-sm">{g.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Lines({ chart, data }: { chart: Chart; data: DiData }) {
  const n = data.cols.length;
  const { max, step } = scale(chart, data.rows.flatMap((r) => r.cells.map((v) => v ?? 0)));
  const slot = 76;
  const width = PAD.left + n * slot + PAD.right;
  const height = PAD.top + PLOT_H + PAD.bottom;
  const x = (j: number) => PAD.left + slot / 2 + j * slot;
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block max-w-none" aria-hidden>
      <Axis max={max} step={step} width={width} />
      {data.cols.map((c, j) => <text key={c} x={x(j)} y={PAD.top + PLOT_H + 22} textAnchor="middle" className="fill-foreground text-sm">{c}</text>)}
      {data.rows.map((r, si) => {
        const pts = r.cells.map((v, j) => (v === null ? null : [x(j), y(v)] as const)).filter((p): p is readonly [number, number] => !!p);
        return (
          <g key={r.name}>
            <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={SERIES[si]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r="4.5" fill={SERIES[si]} stroke="var(--card)" strokeWidth="2" />)}
            {chart.labels && r.cells.map((v, j) => (v === null ? null : <text key={j} x={x(j)} y={y(v) - 10} textAnchor="middle" className="fill-foreground text-sm">{fmt(v)}</text>))}
          </g>
        );
      })}
    </svg>
  );
}

/** A data table as the exam prints it: blanks as "?", a total row or column set apart by weight. */
export function DiTable({ data, filled, className }: { data: DiData; filled?: DiData; className?: string }) {
  const total = (s: string) => /^total$/i.test(s);
  return (
    <div className={cn("-mx-1 overflow-x-auto px-1", className)}>
      <table className="w-full min-w-max border-separate border-spacing-0 text-base">
        {data.unit && <caption className="pb-2 text-left text-sm text-muted-foreground">{data.unit === "%" ? "In per cent" : data.unit}</caption>}
        <thead>
          <tr>
            <th scope="col" className="border-b border-border px-3 py-2 text-left text-sm font-semibold">{data.rowHead}</th>
            {data.cols.map((c) => <th key={c} scope="col" className={cn("border-b border-border px-3 py-2 text-right text-sm font-semibold", total(c) && "text-foreground")}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={r.name} className={cn(total(r.name) && "font-semibold")}>
              <th scope="row" className="border-b border-border/60 px-3 py-2 text-left font-semibold">{r.name}</th>
              {r.cells.map((v, j) => {
                const f = filled?.rows[i].cells[j];
                const blank = v === null;
                return (
                  <td key={j} className={cn("border-b border-border/60 px-3 py-2 text-right", total(data.cols[j]) && "font-semibold")}>
                    {blank
                      ? f !== undefined && f !== null
                        ? <span className="rounded-md bg-success-soft px-1.5 py-0.5 font-semibold" title="Worked out from the rules">{fmt(f)}</span>
                        : <span className="inline-block min-w-8 rounded-md bg-muted px-1.5 py-0.5 text-center text-muted-foreground" aria-label="missing">?</span>
                      : fmt(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The chart's numbers for screen readers. */
function SrTable({ data }: { data: DiData }) {
  return (
    <table className="sr-only">
      <caption>{data.caption}{data.unit ? `, ${data.unit}` : ""}</caption>
      <thead><tr><th>{data.rowHead}</th>{data.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{data.rows.map((r) => <tr key={r.name}><th>{r.name}</th>{r.cells.map((v, j) => <td key={j}>{v === null ? "missing" : fmt(v)}</td>)}</tr>)}</tbody>
    </table>
  );
}
