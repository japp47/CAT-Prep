import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** The streak badge as a button that opens its note. Loaded on demand, so the popover code stays out of the first download. */
export default function StreakNote({ note, className, children, defaultOpen }: { note: string; className: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={className}>{children}</button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,20rem)] border-0 text-base">{note}</PopoverContent>
    </Popover>
  );
}
