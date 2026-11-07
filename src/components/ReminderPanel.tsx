import { type RefObject } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { LinkButton, Switch } from "./kit";
import { ChannelList, silent } from "./ReminderControls";
import { mediumDate } from "../lib/date";
import { pausedUntil, whenLine } from "../lib/notify";
import { useReminderPrefs } from "../lib/reminders";

/**
 * The bell's panel (F65): the promise in a sentence, the switch, and one row per channel — the same rows as the
 * Settings card (components/ReminderControls.tsx), so the two never drift. Everything else lives in Settings, one
 * link away. It only sits under the sidebar, which starts at the lg breakpoint, so a popover is the only shape needed.
 */
export default function ReminderPanel({ open, onOpenChange, anchor }: { open: boolean; onOpenChange: (o: boolean) => void; anchor: RefObject<HTMLButtonElement | null> }) {
  const r = useReminderPrefs(open);
  const { phase, prefs } = r;
  const close = () => onOpenChange(false);
  const paused = prefs && pausedUntil(prefs);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent side="top" align="start" sideOffset={10} aria-label="Study reminders" className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-4"
        // The bell toggles the panel itself; a press on it is not a press outside.
        onInteractOutside={(e) => { if (anchor.current?.contains(e.target as Node)) e.preventDefault(); }}
        onCloseAutoFocus={(e) => { e.preventDefault(); anchor.current?.focus(); }}>
        <div className="flex flex-col gap-4">
          {phase === "loading" && <p className="text-base text-muted-foreground">Loading your reminders…</p>}
          {phase === "unavailable" && <p className="text-base text-muted-foreground">Reminders are not available right now.</p>}
          {phase === "no-sync" && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-base font-semibold">Study reminders</p>
              <p className="text-sm text-muted-foreground">A nudge on days you haven&rsquo;t practised. They need sync, so we know when you have practised and stay quiet then.</p>
              <LinkButton to="/you#sync" variant="secondary" size="sm">Turn on sync</LinkButton>
            </div>
          )}
          {phase === "ready" && prefs && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-base font-semibold">Study reminders</span>
                  <span className="text-sm text-muted-foreground">{prefs.on ? whenLine(prefs) : "Off. One nudge a day, only when you haven't practised."}</span>
                </div>
                <Switch label="Study reminders" checked={prefs.on} onChange={(on) => void r.setOn(on)} />
              </div>
              {prefs.on && paused && <p className="rounded-lg bg-highlight-soft px-3 py-2 text-sm" role="status">Paused until {mediumDate(paused.slice(0, 10))}.</p>}
              {prefs.on && silent(prefs) && <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm" role="status">Nothing will arrive yet. Turn on this device, or email.</p>}
              {prefs.on && <ChannelList r={r} prefs={prefs} onLink={close} />}
              {r.msg && <p role="status" className="rounded-lg bg-warning-soft px-3 py-2 text-sm">{r.msg}</p>}
            </>
          )}
          <Link to="/settings#reminders" onClick={close}
            className="group flex min-h-11 items-center justify-between gap-3 rounded-lg px-1 text-base font-medium text-primary transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none">
            Time, days and quiet hours
            <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
