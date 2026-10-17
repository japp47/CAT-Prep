import { useEffect, useMemo, useState } from "react";
import { todayIso } from "../../lib/date";
import { useStore } from "../../lib/store";
import { activityDays, computeStreak } from "../../practice/streak";

export function useStreak() {
  const { state } = useStore();
  return useMemo(() => computeStreak(activityDays(state), todayIso()), [state]);
}

export function StreakBadge() {
  const s = useStreak();
  const title = s.days
    ? `${s.days}-day streak${s.activeToday ? "" : ". Practise today to keep it going"}. ${s.shieldsLeft} of 2 shields left this month; a shield covers one missed day.`
    : "Practise or tick a timetable block to start a streak.";
  return (
    <span className="streak" title={title}>
      <b aria-hidden="true">●</b>{s.days ? `${s.days}-day streak` : "No streak yet"}
      {s.days > 0 && <span className="muted">· {s.shieldsLeft} shield{s.shieldsLeft === 1 ? "" : "s"}</span>}
    </span>
  );
}

/** Seconds since the component mounted, ticking once a second while `running`. */
export function useElapsed(running: boolean, startAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  return Math.max(0, Math.floor((now - startAt) / 1000));
}
