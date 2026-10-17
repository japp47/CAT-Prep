import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BREAK_EVERY, focusMs, useFocus } from "../lib/focus";
import { fmtSecs } from "../practice/record";

/** The running focus timer, pinned to the bottom of every page. */
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
    <div className="focusbar" role="region" aria-label="Focus timer">
      <div className="fb-main">
        <span className={"fb-dot" + (run.since ? " on" : "")} aria-hidden="true" />
        <div className="fb-name">
          <span className="eyebrow">{run.since ? "Focus" : "Paused"}</span>
          <Link to="/today">{run.name}</Link>
        </div>
        <span className={"timer" + (over ? " over" : "")} aria-live="off">{fmtSecs(secs)} / {run.target}:00</span>
      </div>
      {breakDue ? (
        <div className="fb-acts">
          <span className="small">{BREAK_EVERY * (run.breaks + 1)} minutes in. A 5-minute break helps you stay sharp.</span>
          <button type="button" className="btn sm" onClick={() => ackBreak(true)}>Take a break</button>
          <button type="button" className="btn ghost sm" onClick={() => ackBreak(false)}>Keep going</button>
        </div>
      ) : confirm ? (
        <div className="fb-acts">
          <span className="small">Stop without saving this time?</span>
          <button type="button" className="btn ghost sm" onClick={() => { cancel(); setConfirm(false); }}>Discard</button>
          <button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>Keep it</button>
        </div>
      ) : (
        <div className="fb-acts">
          {over && <span className="small">Planned time reached.</span>}
          {run.since
            ? <button type="button" className="btn ghost sm" onClick={pause}>Pause</button>
            : <button type="button" className="btn ghost sm" onClick={resume}>Resume</button>}
          <button type="button" className="btn sm" onClick={finish}>{run.log ? "Stop and save time" : "Finish block"}</button>
          <button type="button" className="x" aria-label="Discard timer" onClick={() => setConfirm(true)}>✕</button>
        </div>
      )}
    </div>
  );
}
