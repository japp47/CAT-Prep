import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A home page section heading in two tones (D42): the claim in full ink, the detail muted, as one sentence pair. An
 * aside (a link, a badge) sits at the right on a wide screen.
 */
export function Head({ id, lead, rest, aside, className }: { id: string; lead: ReactNode; rest?: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-4", className)}>
      <h2 id={id} className="max-w-[30ch] text-[clamp(1.875rem,1.05rem+2.3vw,3.25rem)] leading-[1.06] font-extrabold tracking-[-0.035em] text-balance">
        {lead}{rest && <span className="font-bold text-muted-foreground"> {rest}</span>}
      </h2>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
