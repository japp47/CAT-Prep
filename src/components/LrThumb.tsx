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
      ) : type === "binary" ? (
        // Two columns of marks: true and false.
        <><path d="M8 13l4 4 7-8M8 27l4 4 7-8" className={c} /><path d="M29 10l10 10M39 10 29 20M29 24l10 10M39 24 29 34" className={c} /><path d="M8 41h31" className={c} /></>
      ) : type === "directions" ? (
        // A walk with right-angle turns from a flagpole.
        <><path d="M10 40V14h18v12h12" className={c} /><path d="M36 22l4 4-4 4" className={c} /><circle cx="10" cy="40" r="3.6" className="fill-current" /></>
      ) : type === "scheduling" ? (
        // Bars on a timeline, as in a schedule.
        <><rect x="6" y="9" width="18" height="7" rx="2" className={c} /><rect x="24" y="20" width="16" height="7" rx="2" className={c} /><rect x="14" y="31" width="22" height="7" rx="2" className={c} /><path d="M6 43h36" className={c} /></>
      ) : type === "selection" || type === "distribution" ? (
        // People, some picked.
        <>{[[10, 14], [24, 14], [38, 14], [10, 32], [24, 32], [38, 32]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" className={i % 3 === 1 ? "fill-current" : c} />)}</>
      ) : type === "relations" ? (
        // A small family tree: a couple, then two children.
        <><circle cx="15" cy="12" r="4.5" className={c} /><circle cx="33" cy="12" r="4.5" className={c} /><path d="M19.5 12h9M24 12v10M12 22h24M12 22v8M36 22v8" className={c} /><circle cx="12" cy="35" r="4.5" className="fill-current" /><circle cx="36" cy="35" r="4.5" className={c} /></>
      ) : type === "clocks" ? (
        // A clock face at ten past ten.
        <><circle cx="24" cy="24" r="17" className={c} /><path d="M24 24 17 18M24 24l10-7" className={c} /><circle cx="24" cy="24" r="2" className="fill-current" /></>
      ) : type === "tournament" ? (
        <path d="M5 8h10v8H5M5 32h10v8H5M15 12h8v24h-8M23 24h8M31 18h10v12H31" className={c} />
      ) : (
        <><rect x="5" y="8" width="38" height="32" rx="3" className={c} /><path d="M5 18.5h38M5 29h38M17.5 8v32M30.5 8v32" className={c} /></>
      )}
    </svg>
  );
}
