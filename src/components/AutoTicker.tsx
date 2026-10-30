import { useEffect, useMemo } from "react";
import { todayIso } from "../lib/date";
import { useStore } from "../lib/store";
import { applyAutoTicks, autoTicks } from "../planner/auto";

/**
 * Ticks today's plan blocks that on-site work already covers (D57), wherever the student is, so the day ring, the
 * streak and the week count work done here without an extra tap. Renders nothing.
 */
export function AutoTicker() {
  const { state, update } = useStore();
  const today = todayIso();
  const due = useMemo(() => autoTicks(state, today).length, [state, today]);
  useEffect(() => { if (due) update((st) => applyAutoTicks(st, today)); }, [due, today, update]);
  return null;
}
