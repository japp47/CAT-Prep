import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { catByYear, catChoices, defaultCat, type CatExam } from "../data/exam";
import { diffDays, shortDate, todayIso } from "../lib/date";
import { useStore } from "../lib/store";
import { TextLink } from "./kit";
import { SWITCH, type SwitchProps } from "./YearSwitch";

/**
 * The panel behind YearSwitch (D93): three CATs with their days to go; a tap saves. Loaded only when a student first
 * taps the year, so the popover and the toast never join the first download.
 */
export default function YearMenu({ children, label, className, align = "start" }: SwitchProps) {
  const { state, update } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(true); // it mounts on the tap that opens it
  const today = todayIso();
  const mine = catByYear(state.about.exam) ?? defaultCat(state.since);
  const choices = catChoices(today, mine);

  const pick = (e: CatExam) => {
    setOpen(false);
    if (e.year === mine.year) return;
    update((st) => { st.about.exam = e.year; });
    toast(`Your plan now leads to CAT ${e.year}.`, { action: { label: "See your road", onClick: () => nav("/you#cat") } });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label ?? `Your exam: CAT ${mine.year}. Change it`} className={cn(SWITCH, className)}>
          {children ?? `CAT ${mine.year}`}
          <ChevronDown aria-hidden className={cn("size-4 shrink-0 self-center transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} collisionPadding={12} className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-2">
        <p className="px-3 pt-2 pb-1 text-base font-semibold">Which CAT are you preparing for?</p>
        <div role="radiogroup" aria-label="Which CAT are you preparing for?" className="flex flex-col">
          {choices.map((e) => {
            const on = e.year === mine.year;
            return (
              <button key={e.year} type="button" role="radio" aria-checked={on} onClick={() => pick(e)}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "bg-accent/85 text-accent-foreground" : "hover:bg-foreground/[0.06]")}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-heading leading-tight font-bold">CAT {e.year}</span>
                  <span className={cn("text-sm", on ? "text-accent-foreground/80" : "text-muted-foreground")}>{shortDate(e.date)}, {e.confirmed ? "announced" : "expected"}</span>
                </span>
                <span className="text-base font-semibold whitespace-nowrap">{diffDays(today, e.date).toLocaleString("en-IN")} days</span>
                <Check aria-hidden className={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-0")} />
              </button>
            );
          })}
        </div>
        <p className="px-3 pt-2 pb-2 text-sm text-muted-foreground">
          Your days so far stay as they are. <TextLink to="/you#cat" className="text-sm">Compare the roads first</TextLink>
        </p>
      </PopoverContent>
    </Popover>
  );
}
