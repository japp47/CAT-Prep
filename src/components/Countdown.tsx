import { EXAM_ISO, EXAM_NAME, PHASES, phaseOf } from "../data/exam";
import { clamp, diffDays, longDate, mediumDate, todayIso } from "../lib/date";

export function daysLeft(today = todayIso()) {
  return diffDays(today, EXAM_ISO);
}

export function Timeline() {
  const t = todayIso();
  const total = diffDays(PHASES[0].start, PHASES[PHASES.length - 1].end) + 1;
  return (
    <>
      <div className="tl" aria-hidden="true">
        {PHASES.map((p) => {
          const len = diffDays(p.start, p.end) + 1;
          const f = clamp((diffDays(p.start, t) + 1) / len, 0, 1) * 100;
          return <div key={p.id} className="s" style={{ flex: len }}><i style={{ width: f.toFixed(1) + "%" }} /></div>;
        })}
      </div>
      <div className="tl-lab" aria-hidden="true">
        {PHASES.map((p) => {
          const len = diffDays(p.start, p.end) + 1;
          return <span key={p.id} style={{ flex: len }}>{len / total > 0.08 ? p.name : ""}</span>;
        })}
      </div>
    </>
  );
}

export function phaseCaption(goal?: string) {
  const ph = phaseOf(todayIso());
  if (ph.kind === "pre") return "The plan starts on " + mediumDate(PHASES[0].start) + ".";
  if (ph.kind === "exam") return "Exam day. All the best.";
  if (ph.kind === "after") return EXAM_NAME + " is over. Check results on iimcat.ac.in.";
  return "Phase " + ph.phase.id + " of " + PHASES.length + ", " + ph.phase.name + ". Runs to " + mediumDate(ph.phase.end) + "." + (goal ? " " + goal : "");
}

export function CountdownNumber() {
  const left = daysLeft();
  return (
    <div className="count">
      <span className="bignum">{Math.max(left, 0)}</span>
      <span className="unit">{left > 1 ? "days to " + EXAM_NAME : left === 1 ? "day to " + EXAM_NAME : left === 0 ? EXAM_NAME + " is today" : EXAM_NAME + " is done"}</span>
    </div>
  );
}

export const examLine = (confirmed: boolean) => (confirmed ? "" : "Expected ") + longDate(EXAM_ISO) + (confirmed ? "" : " · Not announced yet");
