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
    <div className="chart" ref={host}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Correct answers per logged paper or mock against the ${band[0]} to ${band[1]} target`}>
        {ticks.map((t) => (
          <g key={t}><line className="gl" x1={Lm} x2={W - Rm} y1={y(t)} y2={y(t)} /><text className="ax" x={Lm - 8} y={y(t) + 4} textAnchor="end">{t}</text></g>
        ))}
        <rect className="band" x={Lm} y={y(band[1])} width={pw} height={y(band[0]) - y(band[1])} />
        <text className="bandl" x={Lm + 6} y={y(band[1]) - 4}>Target {band[0]} to {band[1]}</text>
        {!n && <text className="ax" x={W / 2} y={y(max * 0.375)} textAnchor="middle">Your timed papers plot here once you log one.</text>}
        {data.map((d, i) => { const h = (Math.min(d.w, max) / max) * ph; return <rect key={d.id + "w"} className="wr" x={x(i) - 5} y={T + ph - h} width={10} height={h} />; })}
        {n > 1 && <polyline className="ln" points={data.map((d, i) => x(i).toFixed(1) + "," + y(Math.min(d.c, max)).toFixed(1)).join(" ")} />}
        {data.map((d, i) => <circle key={d.id} className="pt" cx={x(i)} cy={y(Math.min(d.c, max))} r={5} />)}
        {last && <text className="val" x={x(n - 1)} y={ly} textAnchor="middle">{last.c}</text>}
        {data.map((d, i) => ((i % step === 0 && n - 1 - i >= step) || i === n - 1)
          ? <text key={d.id + "l"} className="ax" x={x(i)} y={H - 9} textAnchor="middle">{shortDate(d.d)}</text> : null)}
      </svg>
    </div>
  );
}

export function Bars({ counts, empty }: { counts: Record<string, number>; empty: string }) {
  const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 6);
  if (!keys.length) return <ul className="bars"><li style={{ display: "block" }}><div className="empty">{empty}</div></li></ul>;
  const max = counts[keys[0]];
  return (
    <ul className="bars">
      {keys.map((k) => <li key={k}><span>{k}</span><span className="bar"><i style={{ width: Math.round((counts[k] / max) * 100) + "%" }} /></span><span className="n">{counts[k]}</span></li>)}
    </ul>
  );
}
