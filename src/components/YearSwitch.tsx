import { lazy, Suspense, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { catByYear, defaultCat } from "../data/exam";
import { useStore } from "../lib/store";

/**
 * The CAT year where a student meets it (D93, docs/design/your-cat-year.md): the year shown on Home and Today opens
 * three choices with their days to go. Picking one saves it at once; the days already studied never change, and
 * You → Your CAT shows the whole road for anyone who wants to compare first. Until the first tap this is a plain
 * button: the panel (popover, toast) loads then, so Home's first download stays within its budget.
 */
export interface SwitchProps { children?: ReactNode; label?: string; className?: string; align?: "start" | "center" | "end" }

/** The year looks like text with a dotted underline and a chevron: clearly something to tap, quiet beside the words. */
export const SWITCH = "inline-flex items-baseline gap-1 rounded-sm font-semibold text-foreground underline decoration-foreground/30 decoration-dotted underline-offset-4 outline-none transition-colors hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring";

const YearMenu = lazy(() => import("./YearMenu"));
const preload = () => void import("./YearMenu");

export function YearSwitch(props: SwitchProps) {
  const { state } = useStore();
  const [used, setUsed] = useState(false);
  const year = (catByYear(state.about.exam) ?? defaultCat(state.since)).year;
  const button = (
    <button type="button" aria-label={props.label ?? `Your exam: CAT ${year}. Change it`} aria-haspopup="dialog" className={cn(SWITCH, props.className)}
      onClick={() => setUsed(true)} onPointerEnter={preload} onFocus={preload}>
      {props.children ?? `CAT ${year}`}
      <ChevronDown aria-hidden className="size-4 shrink-0 self-center" />
    </button>
  );
  if (!used) return button;
  return <Suspense fallback={button}><YearMenu {...props} /></Suspense>;
}
