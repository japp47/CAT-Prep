import { useEffect, useRef, useState } from "react";
import { shortDate } from "../lib/date";
import type { Mock } from "../lib/state";

/** Correct answers per logged paper, with wrong answers as bars and the target band shaded. */
export function MockChart({ data, max, band }: { data: Mock[]; max: number; band: [number, number] }) {
  const host = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(280, el.clientWidth || 600)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = data.length, H = 250, Lm = 34, Rm = 14, T = 16, Bm = 30, pw = W - Lm - Rm, ph = H - T - Bm;
  const y = (v: number) => T + ph * (1 - v / max);
  const x = (i: number) => (n === 1 ? Lm + pw / 2 : Lm + 18 + ((pw - 36) * i) / (n - 1));
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += 4) ticks.push(t);
  const step = Math.ceil(n / Math.max(2, Math.floor(pw / 62)));
  const last = data[n - 1];
  let ly = last ? y(Math.min(last.c, max)) - 11 : 0;
  if (last && ly < T + 6) ly = y(Math.min(last.c, max)) + 20;
  return (
    <div className="w-full" ref={host}>
      <svg className="block h-auto w-full" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Correct answers per logged paper or mock against the ${band[0]} to ${band[1]} target`}>
        {ticks.map((t) => (
          <g key={t}><line className="fill-none stroke-border" x1={Lm} x2={W - Rm} y1={y(t)} y2={y(t)} /><text className="fill-muted-foreground text-[14px]" x={Lm - 8} y={y(t) + 4} textAnchor="end">{t}</text></g>
        ))}
        <rect className="fill-success/15" x={Lm} y={y(band[1])} width={pw} height={y(band[0]) - y(band[1])} />
        <text className="fill-success text-[14px] font-semibold" x={Lm + 6} y={y(band[1]) - 4}>Target {band[0]} to {band[1]}</text>
        {!n && <text className="fill-muted-foreground text-[14px]" x={W / 2} y={y(max * 0.375)} textAnchor="middle">Your timed papers plot here once you log one.</text>}
        {data.map((d, i) => { const h = (Math.min(d.w, max) / max) * ph; return <rect key={d.id + "w"} className="fill-danger/50" x={x(i) - 5} y={T + ph - h} width={10} height={h} />; })}
        {n > 1 && <polyline className="fill-none stroke-primary [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.5]" points={data.map((d, i) => x(i).toFixed(1) + "," + y(Math.min(d.c, max)).toFixed(1)).join(" ")} />}
        {data.map((d, i) => <circle key={d.id} className="fill-primary stroke-card [stroke-width:2]" cx={x(i)} cy={y(Math.min(d.c, max))} r={5} />)}
        {last && <text className="fill-foreground text-[14px] font-semibold" x={x(n - 1)} y={ly} textAnchor="middle">{last.c}</text>}
        {data.map((d, i) => ((i % step === 0 && n - 1 - i >= step) || i === n - 1)
          ? <text key={d.id + "l"} className="fill-muted-foreground text-[14px]" x={x(i)} y={H - 9} textAnchor="middle">{shortDate(d.d)}</text> : null)}
      </svg>
    </div>
  );
}

/** The six largest counts as horizontal bars. */
export function Bars({ counts, empty }: { counts: Record<string, number>; empty: string }) {
  const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 6);
  if (!keys.length) return <p className="text-base text-muted-foreground">{empty}</p>;
  const max = counts[keys[0]];
  return (
    <ul className="flex flex-col gap-3">
      {keys.map((k) => (
        <li key={k} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-base">
          <span className="truncate" title={k}>{k}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-primary" style={{ width: Math.round((counts[k] / max) * 100) + "%" }} /></span>
          <span className="text-right font-semibold tabular-nums">{counts[k]}</span>
        </li>
      ))}
    </ul>
  );
}
