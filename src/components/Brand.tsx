import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * fit: in a row that may run out of room (the phone header at a large text size or on a 360 px phone), the wordmark
 * wraps onto a second line that is clipped, so only the logo stays; no width is measured.
 */
export default function Brand({ compact = false, fit = false }: { compact?: boolean; fit?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 rounded-md text-foreground", fit && "h-9 min-w-0 flex-wrap gap-y-4 overflow-hidden")} aria-label="99ile home">
      <img src={import.meta.env.BASE_URL + "favicon.svg"} alt="" className="size-9 shrink-0" width={36} height={36} />
      {!compact && <span className="text-[1.375rem] leading-none font-bold tracking-tight">99ile</span>}
    </Link>
  );
}
