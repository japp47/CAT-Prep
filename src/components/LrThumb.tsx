import { cn } from "@/lib/utils";
import type { LrType } from "../practice/types";

/** A small drawing of each type's picture, so a group reads at a glance: seats round a table, a bracket, a table. */
export function LrThumb({ type, className }: { type: LrType; className?: string }) {
  const c = "fill-none stroke-current stroke-[1.75]";
  return (
    <svg viewBox="0 0 48 48" className={cn("size-11 shrink-0 text-primary", className)} aria-hidden>
      {type === "arrangement" ? (
        <><circle cx="24" cy="24" r="9" className={c} />{Array.from({ length: 6 }, (_, k) => { const a = (k * Math.PI) / 3; return <circle key={k} cx={24 + 17 * Math.sin(a)} cy={24 + 17 * Math.cos(a)} r="3.2" className="fill-current" />; })}</>
      ) : type === "routes" ? (
        <><path d="M8 36 20 12l12 22 9-20M20 12l21 2M8 36h24" className={c} />{[[8, 36], [20, 12], [32, 34], [41, 14]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.6" className="fill-current" />)}</>
      ) : type === "venn" || type === "setmax" ? (
        <><circle cx="18" cy="20" r="11" className={c} /><circle cx="30" cy="20" r="11" className={c} /><circle cx="24" cy="31" r="11" className={c} /></>
      ) : type === "tournament" ? (
        <path d="M5 8h10v8H5M5 32h10v8H5M15 12h8v24h-8M23 24h8M31 18h10v12H31" className={c} />
      ) : (
        <><rect x="5" y="8" width="38" height="32" rx="3" className={c} /><path d="M5 18.5h38M5 29h38M17.5 8v32M30.5 8v32" className={c} /></>
      )}
    </svg>
  );
}
