import { EXAM_ISO, EXAM_NAME, PHASES, phaseOf } from "../data/exam";
import { clamp, diffDays, longDate, mediumDate, todayIso } from "../lib/date";

export function daysLeft(today = todayIso()) {
  return diffDays(today, EXAM_ISO);
}

/** The year as five phases, with a marker on today. */
export function PhaseBar() {
  const t = todayIso();
  const first = PHASES[0].start, last = PHASES[PHASES.length - 1].end;
  const total = diffDays(first, last) + 1;
  const at = clamp((diffDays(first, t) + 0.5) / total, 0, 1) * 100;
  const ph = phaseOf(t);
  const cur = ph.kind === "phase" ? ph.phase.id : ph.kind === "pre" ? 0 : PHASES.length + 1;
  return (
    <div className="flex flex-col gap-2.5" aria-hidden="true">
      <div className="relative flex gap-1">
        {PHASES.map((p) => {
          const len = diffDays(p.start, p.end) + 1;
          const f = clamp((diffDays(p.start, t) + 1) / len, 0, 1) * 100;
          return <div key={p.id} className="h-1.5 overflow-hidden rounded-full bg-secondary" style={{ flex: len }}><div className="h-full bg-primary" style={{ width: f.toFixed(1) + "%" }} /></div>;
        })}
        {cur > 0 && cur <= PHASES.length && <span className="absolute top-1/2 -mt-[7px] -ml-[7px] size-3.5 rounded-full border-[3px] border-primary bg-card ring-4 ring-accent" style={{ left: at.toFixed(2) + "%" }} />}
      </div>
      {/* Names wrap rather than truncate: on a phone "Mock phase" gets two lines instead of "Mock ph…". */}
      <div className="flex gap-1 text-sm leading-tight text-muted-foreground">
        {PHASES.map((p) => {
          const len = diffDays(p.start, p.end) + 1;
          return <span key={p.id} className={"min-w-0 break-words" + (p.id === cur ? " font-semibold text-primary" : "")} style={{ flex: len }}>{len / total > 0.08 ? p.name : ""}</span>;
        })}
      </div>
    </div>
  );
}

export function phaseCaption(goal?: string) {
  const ph = phaseOf(todayIso());
  if (ph.kind === "pre") return "The plan starts on " + mediumDate(PHASES[0].start) + ".";
  if (ph.kind === "exam") return "Exam day. All the best.";
  if (ph.kind === "after") return EXAM_NAME + " is over. Check results on iimcat.ac.in.";
  return "Phase " + ph.phase.id + " of " + PHASES.length + ", " + ph.phase.name + ". Runs to " + mediumDate(ph.phase.end) + "." + (goal ? " " + goal : "");
}

export const examLine = (confirmed: boolean) => (confirmed ? "" : "Expected on ") + longDate(EXAM_ISO) + (confirmed ? "" : ", not announced yet");
