import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BREAK_EVERY, focusMs, useFocus } from "../lib/focus";
import { fmtSecs } from "../practice/record";

const BAR = "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-foreground px-4 py-3 text-background shadow-xl lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[min(560px,calc(100vw-248px-48px))] lg:rounded-lg"; // taste-skill-ignore: the timer bar floats over the page

/** The running focus timer, pinned above the bottom bar on phones and to the corner on desktop. */
export default function FocusBar() {
  const { run, pause, resume, ackBreak, finish, cancel } = useFocus();
  const [, tick] = useState(0);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!run?.since) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [run?.since]);
  if (!run) return null;

  const secs = Math.floor(focusMs(run) / 1000);
  const over = secs >= run.target * 60;
  const breakDue = !!run.since && Math.floor(secs / 60 / BREAK_EVERY) > run.breaks;

  return (
    <div role="region" aria-label="Focus timer" className={BAR}>
      <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
        <span className={cn("size-2.5 shrink-0 rounded-full", run.since ? "bg-success" : "bg-background/40")} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm text-background/70">{run.since ? "Focus" : "Paused"}</span>
          <Link to="/today" className="truncate text-base font-semibold text-background">{run.name}</Link>
        </div>
        <span className={cn("text-base font-semibold tabular-nums", over && "text-highlight")} aria-live="off">{fmtSecs(secs)} / {run.target}:00</span>
      </div>
      {breakDue ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{BREAK_EVERY * (run.breaks + 1)} minutes in. A 5-minute break helps you stay sharp.</span>
          <Button size="sm" variant="secondary" onClick={() => ackBreak(true)}>Take a break</Button>
          <Button size="sm" variant="ghost" className="text-background hover:bg-background/10" onClick={() => ackBreak(false)}>Keep going</Button>
        </div>
      ) : confirm ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Stop without saving this time?</span>
          <Button size="sm" variant="secondary" onClick={() => { cancel(); setConfirm(false); }}>Discard</Button>
          <Button size="sm" variant="ghost" className="text-background hover:bg-background/10" onClick={() => setConfirm(false)}>Keep it</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {over && <span className="text-sm">Planned time reached.</span>}
          {run.since
            ? <Button size="sm" variant="ghost" className="text-background hover:bg-background/10" onClick={pause}>Pause</Button>
            : <Button size="sm" variant="ghost" className="text-background hover:bg-background/10" onClick={resume}>Resume</Button>}
          <Button size="sm" variant="secondary" onClick={finish}>{run.log ? "Stop and save time" : "Finish block"}</Button>
          <Button size="icon-sm" variant="ghost" className="text-background hover:bg-background/10" aria-label="Discard timer" onClick={() => setConfirm(true)}><X /></Button>
        </div>
      )}
    </div>
  );
}
