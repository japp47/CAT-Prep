import { lazy, Suspense, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ENABLED } from "../lib/api";

const ReminderPanel = lazy(() => import("./ReminderPanel"));

/**
 * Study reminders from the sidebar (F65): the one thing a student changes often — on, off, and where they go — a tap
 * away, with the time, days and quiet hours left in Settings. The panel and its request wait until it is opened, and
 * the bell is absent from builds without the API, so it never opens on nothing.
 */
export default function ReminderBell({ className }: { className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // Stays mounted after the first open, so the panel can animate closed.
  const [loaded, setLoaded] = useState(false);
  if (!API_ENABLED) return null;
  return (
    <>
      <button ref={ref} type="button" aria-label="Study reminders" title="Study reminders" aria-haspopup="dialog" aria-expanded={open}
        onPointerEnter={() => { void import("./ReminderPanel"); }}
        onClick={() => { setLoaded(true); setOpen((o) => !o); }}
        className={cn("grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-foreground/75 transition-colors hover:bg-card hover:text-foreground active:bg-card active:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none", open && "bg-card text-foreground", className)}>
        <Bell className="size-5" aria-hidden />
      </button>
      {loaded && <Suspense fallback={null}><ReminderPanel open={open} onOpenChange={setOpen} anchor={ref} /></Suspense>}
    </>
  );
}

/**
 * The bell on a phone (D97, docs/design/notifications.md §15.4): the phone header has no room, so it sits in the menu
 * sheet beside the account row and opens Settings at the reminders card, where the same controls are. Absent from
 * builds without the API, like the desktop bell.
 */
export function ReminderLink({ onPick, className }: { onPick?: () => void; className?: string }) {
  if (!API_ENABLED) return null;
  return (
    <Link to="/settings#reminders" onClick={onPick} aria-label="Study reminders" title="Study reminders"
      className={cn("grid size-11 shrink-0 place-items-center rounded-md text-foreground/75 transition-colors hover:bg-card hover:text-foreground active:bg-card active:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none", className)}>
      <Bell className="size-5" aria-hidden />
    </Link>
  );
}
