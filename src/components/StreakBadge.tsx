import { lazy, Suspense, useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayIso } from "../lib/date";
import { useStore } from "../lib/store";
import { activityDays, computeStreak } from "../practice/streak";

// Its own file, because Home shows it: importing it from practice/common.tsx pulled that whole file
// (dialogs, timers, score cards) into the first download.

export function useStreak() {
  const { state } = useStore();
  return useMemo(() => computeStreak(activityDays(state), todayIso()), [state]);
}

const loadNote = () => import("./StreakNote");
const StreakNote = lazy(loadNote);

export function StreakBadge() {
  const s = useStreak();
  const [armed, setArmed] = useState(false);
  const note = s.days
    ? `${s.days}-day streak${s.activeToday ? "" : ". Practice today to keep it going"}. ${s.shieldsLeft} of 2 shields left this month; a shield covers one missed day.`
    : "Practice or tick a timetable block to start a streak.";
  const cls = "inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors hover:bg-card/70";
  const face = (
    <>
      <Flame className={cn("size-4", s.days ? "text-warning" : "text-muted-foreground")} aria-hidden />
      {/* One span, so the badge's flex gap does not open a space before the comma. */}
      <span>{s.days ? `${s.days}-day streak` : "No streak yet"}{s.days > 0 && <span className="text-muted-foreground">, {s.shieldsLeft} shield{s.shieldsLeft === 1 ? "" : "s"}</span>}</span>
    </>
  );
  // A tap opens the note, so it reaches phones too, not only a mouse hover. The popover code loads only when the badge
  // is first touched, hovered or focused; until then it is a plain button that looks the same.
  if (!armed) return <button type="button" className={cls} onPointerEnter={() => void loadNote()} onFocus={() => void loadNote()} onPointerDown={() => void loadNote()} onClick={() => setArmed(true)}>{face}</button>;
  return <Suspense fallback={<span className={cls}>{face}</span>}><StreakNote note={note} className={cls} defaultOpen>{face}</StreakNote></Suspense>;
}
