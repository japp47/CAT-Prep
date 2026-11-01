import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CAT's on-screen calculator (F90, D73; docs/design/di-sets.md): the basic keys the exam gives (digits, point, the four
 * operations, %, square root, reciprocal, sign, memory, backspace, C and CE), working as a simple calculator works:
 * each operation applies when the next one is pressed. Every finished calculation is passed to `onLog`, for the
 * review's calculation log (F95). On a desktop it sits at the bottom right and takes the keyboard while focused; on a
 * phone it is a sheet at the bottom of the screen.
 */

type Op = "+" | "−" | "×" | "÷";
interface Calc { show: string; acc: number | null; op: Op | null; fresh: boolean; mem: number; line: string }
const START: Calc = { show: "0", acc: null, op: null, fresh: true, mem: 0, line: "" };

/** Twelve significant digits, so 0.1 + 0.2 shows 0.3. */
const tidy = (x: number) => Number(x.toPrecision(12));
const fmt = (x: number) => (Number.isFinite(x) ? String(tidy(x)) : "Error");
const apply = (a: number, op: Op, b: number) => (op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b);

export type Key = string;

/** One key press: the next state, and the calculation it finished, if any. */
export function press(c: Calc, k: Key): [Calc, string | null] {
  const cur = Number(c.show);
  const error = (msg: string): [Calc, null] => [{ ...START, mem: c.mem, show: msg }, null];
  if (/^\d$/.test(k)) {
    if (c.fresh || c.show === "0" || !/^-?[\d.]+$/.test(c.show)) return [{ ...c, show: k, fresh: false }, null];
    return c.show.replace(/[-.]/g, "").length >= 14 ? [c, null] : [{ ...c, show: c.show + k }, null];
  }
  if (k === ".") return c.fresh || !/^-?[\d.]+$/.test(c.show) ? [{ ...c, show: "0.", fresh: false }, null] : c.show.includes(".") ? [c, null] : [{ ...c, show: c.show + "." }, null];
  if (!Number.isFinite(cur) && !["C", "CE", "MC"].includes(k)) return [c, null];
  if (k === "+" || k === "−" || k === "×" || k === "÷") {
    if (c.acc !== null && c.op && !c.fresh) {
      if (c.op === "÷" && cur === 0) return error("Cannot divide by zero");
      const r = tidy(apply(c.acc, c.op, cur));
      return [{ ...c, acc: r, op: k, show: fmt(r), fresh: true, line: `${fmt(r)} ${k}` }, `${fmt(c.acc)} ${c.op} ${fmt(cur)} = ${fmt(r)}`];
    }
    return [{ ...c, acc: cur, op: k, fresh: true, line: `${fmt(cur)} ${k}` }, null];
  }
  if (k === "=") {
    if (c.acc === null || !c.op) return [c, null];
    if (c.op === "÷" && cur === 0) return error("Cannot divide by zero");
    const r = tidy(apply(c.acc, c.op, cur));
    return [{ ...c, acc: null, op: null, show: fmt(r), fresh: true, line: "" }, `${fmt(c.acc)} ${c.op} ${fmt(cur)} = ${fmt(r)}`];
  }
  if (k === "√") {
    if (cur < 0) return error("Invalid input");
    const r = tidy(Math.sqrt(cur));
    return [{ ...c, show: fmt(r), fresh: true }, `√${fmt(cur)} = ${fmt(r)}`];
  }
  if (k === "1/x") {
    if (cur === 0) return error("Cannot divide by zero");
    const r = tidy(1 / cur);
    return [{ ...c, show: fmt(r), fresh: true }, `1/${fmt(cur)} = ${fmt(r)}`];
  }
  if (k === "%") {
    // With + or −, a percentage of the first number (200 + 10% is 200 + 20); otherwise a hundredth.
    const r = tidy(c.acc !== null && (c.op === "+" || c.op === "−") ? (c.acc * cur) / 100 : cur / 100);
    return [{ ...c, show: fmt(r), fresh: false }, null];
  }
  if (k === "±") return [{ ...c, show: fmt(-cur) }, null];
  if (k === "⌫") return c.fresh ? [c, null] : [{ ...c, show: c.show.length > 1 && c.show !== "-0" ? c.show.slice(0, -1).replace(/^-$/, "0") : "0" }, null];
  if (k === "C") return [{ ...START, mem: c.mem }, null];
  if (k === "CE") return [{ ...c, show: "0", fresh: true }, null];
  if (k === "MC") return [{ ...c, mem: 0 }, null];
  if (k === "MR") return [{ ...c, show: fmt(c.mem), fresh: true }, null];
  if (k === "MS") return [{ ...c, mem: cur, fresh: true }, null];
  if (k === "M+") return [{ ...c, mem: tidy(c.mem + cur), fresh: true }, null];
  if (k === "M−") return [{ ...c, mem: tidy(c.mem - cur), fresh: true }, null];
  return [c, null];
}

/** Runs a sequence of keys from a clear calculator: for tests. */
export function run(keys: Key[]): { show: string; log: string[] } {
  let c = START; const log: string[] = [];
  for (const k of keys) { const [n, l] = press(c, k); c = n; if (l) log.push(l); }
  return { show: c.show, log };
}

const KEYS: Key[][] = [
  ["MC", "MR", "MS", "M+", "M−"],
  ["⌫", "CE", "C", "±", "√"],
  ["7", "8", "9", "÷", "%"],
  ["4", "5", "6", "×", "1/x"],
  ["1", "2", "3", "−", "="],
  ["0", ".", "+"],
];
const NAME: Record<string, string> = { "⌫": "Backspace", "±": "Change sign", "√": "Square root", "1/x": "Reciprocal", "÷": "Divide", "×": "Multiply", "−": "Subtract", "+": "Add", "=": "Equals", "%": "Percent", MC: "Memory clear", MR: "Memory recall", MS: "Memory store", "M+": "Memory add", "M−": "Memory subtract", C: "Clear", CE: "Clear entry" };
const FROM_KEY: Record<string, Key> = { "+": "+", "-": "−", "*": "×", x: "×", "/": "÷", Enter: "=", "=": "=", Backspace: "⌫", Escape: "C", Delete: "CE", "%": "%", ".": ".", ",": "." };

export function CatCalculator({ onClose, onLog }: { onClose: () => void; onLog: (line: string) => void }) {
  const [c, setC] = useState<Calc>(START);
  const box = useRef<HTMLDivElement>(null);
  const tap = (k: Key) => setC((x) => { const [n, l] = press(x, k); if (l) queueMicrotask(() => onLog(l)); return n; });
  useEffect(() => { box.current?.focus(); }, []);
  return (
    <div ref={box} role="dialog" aria-label="Calculator" tabIndex={-1}
      onKeyDown={(e) => {
        const k = /^\d$/.test(e.key) ? e.key : FROM_KEY[e.key];
        if (e.key === "Escape" && c.show === "0" && c.acc === null) { onClose(); return; }
        if (k && !e.metaKey && !e.ctrlKey) { e.preventDefault(); tap(k); }
      }}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-3 rounded-t-2xl bg-popover p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-12px_rgb(0_0_0/0.25)] ring-1 ring-foreground/5 outline-none sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[21rem] sm:rounded-2xl sm:shadow-[0_18px_40px_-16px_rgb(0_0_0/0.3)]">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Calculator</span>
        <button type="button" onClick={onClose} aria-label="Close the calculator" className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"><X className="size-5" /></button>
      </div>
      <div className="flex flex-col items-end rounded-xl bg-muted px-4 py-2.5" aria-live="polite">
        <span className="min-h-5 text-sm text-muted-foreground tabular-nums">{c.mem !== 0 && <span className="mr-auto">M </span>}{c.line}</span>
        <output className={cn("max-w-full truncate font-semibold", c.show.length > 10 ? "text-heading" : "text-title")}>{c.show}</output>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {KEYS.flat().map((k) => {
          const digit = /^[\d.]$/.test(k), op = ["+", "−", "×", "÷"].includes(k), eq = k === "=";
          return (
            <button key={k} type="button" onClick={() => tap(k)} aria-label={NAME[k] ?? k}
              className={cn("h-11 rounded-lg text-base font-semibold tabular-nums transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none",
                eq ? "row-span-2 h-auto bg-primary/15 text-primary hover:bg-primary/25" : digit ? "bg-card text-foreground hover:bg-secondary" : op ? "bg-accent text-accent-foreground hover:bg-accent/80" : "bg-secondary text-foreground/80 hover:bg-secondary/70",
                k === "0" && "col-span-2", k.startsWith("M") && "text-sm")}>
              {k}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground max-sm:hidden">Keyboard works while it is open. Your calculations appear in the review.</p>
    </div>
  );
}
