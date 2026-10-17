import { useState } from "react";
import { PHASES, phaseOf } from "../data/exam";
import { addDays, diffDays, DOW, mediumDate, todayIso } from "../lib/date";
import { useStore } from "../lib/store";
import { buildDay, sampleDate } from "../planner/engine";
import { LIVE_SECTIONS } from "../sections";
import type { SectionDef } from "../sections/types";

const PRESETS = [
  { label: "Light", wd: 30, we: 90, note: "30 min weekdays, 1.5 h weekends" },
  { label: "Standard", wd: 60, we: 120, note: "1 h weekdays, 2 h weekends" },
  { label: "Serious", wd: 90, we: 150, note: "1.5 h weekdays, 2.5 h weekends" },
  { label: "Intense", wd: 120, we: 240, note: "2 h weekdays, 4 h weekends" },
];
const parseMin = (v: string) => { const n = parseInt(v, 10); return isNaN(n) || n < 0 || n > 600 ? null : n; };
const hours = (m: number) => (m / 60).toFixed(1).replace(/\.0$/, "") + " h";

function TimeCard({ sec }: { sec: SectionDef }) {
  const { state, update } = useStore();
  const s = state.settings[sec.id];
  const [err, setErr] = useState("");
  const [showDow, setShowDow] = useState(s.dow.some((x) => x !== null));
  const week = [0, 1, 2, 3, 4, 5, 6].reduce((t, g) => t + (s.dow[g] ?? (g === 0 || g === 6 ? s.we : s.wd)), 0);

  const set = (k: "wd" | "we", v: string) => {
    const n = parseMin(v);
    if (n === null) { setErr("Enter minutes from 0 to 600."); return; }
    setErr(""); update((st) => { st.settings[sec.id][k] = n; });
  };
  const setDow = (g: number, v: string) => {
    if (v === "") { update((st) => { st.settings[sec.id].dow[g] = null; }); return; }
    const n = parseMin(v);
    if (n === null) { setErr("Enter minutes from 0 to 600."); return; }
    setErr(""); update((st) => { st.settings[sec.id].dow[g] = n; });
  };

  return (
    <div className="card stack">
      <h3>Your usual {sec.short} time</h3>
      <div className="presets" role="group" aria-label="Presets">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip" aria-pressed={s.wd === p.wd && s.we === p.we && !s.dow.some((x) => x !== null)} title={p.note}
            onClick={() => update((st) => { st.settings[sec.id] = { wd: p.wd, we: p.we, dow: [null, null, null, null, null, null, null] }; })}>
            {p.label}<span>{p.wd}/{p.we}</span>
          </button>
        ))}
      </div>
      <div className="form">
        <label className="f">Monday to Friday, minutes<input key={"wd" + s.wd} type="number" inputMode="numeric" min={0} max={600} step={5} defaultValue={s.wd} onBlur={(e) => set("wd", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") set("wd", e.currentTarget.value); }} /></label>
        <label className="f">Saturday and Sunday, minutes<input key={"we" + s.we} type="number" inputMode="numeric" min={0} max={600} step={5} defaultValue={s.we} onBlur={(e) => set("we", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") set("we", e.currentTarget.value); }} /></label>
      </div>
      <button type="button" className="link" style={{ alignSelf: "flex-start" }} onClick={() => setShowDow(!showDow)}>{showDow ? "Hide" : "Set a different time for"} individual days of the week</button>
      {showDow && (
        <div className="dowgrid">
          {[1, 2, 3, 4, 5, 6, 0].map((g) => (
            <label className="f" key={g}>{DOW[g].slice(0, 3)}
              <input key={g + ":" + s.dow[g]} type="number" inputMode="numeric" min={0} max={600} step={5} placeholder={String(g === 0 || g === 6 ? s.we : s.wd)} defaultValue={s.dow[g] ?? ""} onBlur={(e) => setDow(g, e.target.value)} />
            </label>
          ))}
        </div>
      )}
      <p className="err" role="alert">{err}</p>
      <p className="muted small">That is {week} minutes, about {hours(week)}, of {sec.short} a week. A day you change on Today keeps its own time.</p>
    </div>
  );
}

function RangeCard() {
  const { update } = useStore();
  const t = todayIso();
  const [from, setFrom] = useState(t);
  const [to, setTo] = useState(addDays(t, 6));
  const [min, setMin] = useState("30");
  const [sec, setSec] = useState(LIVE_SECTIONS[0]?.id ?? "varc");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const apply = (reset: boolean) => {
    const n = parseMin(min);
    if (!from || !to || to < from) { setMsg({ ok: false, text: "Pick a start date and an end date after it." }); return; }
    if (!reset && n === null) { setMsg({ ok: false, text: "Enter minutes from 0 to 600." }); return; }
    const days = diffDays(from, to) + 1;
    if (days > 120) { setMsg({ ok: false, text: "Pick a range of 120 days or less." }); return; }
    update((st) => {
      for (let i = 0; i < days; i++) {
        const d = addDays(from, i), r = (st.days[d] ??= {});
        r.min ??= {};
        if (reset) delete r.min[sec]; else r.min[sec] = n!;
      }
    });
    setMsg({ ok: true, text: reset ? "Usual times restored for " + days + " days." : "Set " + n + " min for " + days + " days, " + mediumDate(from) + " to " + mediumDate(to) + "." });
  };
  return (
    <div className="card stack">
      <h3>Set time for a date range</h3>
      <p className="muted small">For an exam week, a trip or a work deadline, lower or raise every day at once. Use 0 for rest days.</p>
      <div className="form">
        <label className="f">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="f">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {LIVE_SECTIONS.length > 1 && (
          <label className="f">Section<select value={sec} onChange={(e) => setSec(e.target.value as typeof sec)}>{LIVE_SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}</select></label>
        )}
        <label className="f">Minutes a day<input type="number" inputMode="numeric" min={0} max={600} step={5} value={min} onChange={(e) => setMin(e.target.value)} /></label>
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={() => apply(false)}>Apply to range</button>
        <button type="button" className="btn ghost" onClick={() => apply(true)}>Restore usual times</button>
      </div>
      {msg && <p className={msg.ok ? "ok" : "err"} role="status">{msg.text}</p>}
    </div>
  );
}

function PhaseCard({ id, sec }: { id: number; sec: SectionDef }) {
  const { state } = useStore();
  const t = todayIso();
  const p = PHASES.find((x) => x.id === id)!;
  const cur = phaseOf(t);
  const isNow = cur.kind === "phase" && cur.phase.id === id;
  const s = state.settings[sec.id];
  const wd = buildDay(sec, state, sampleDate(id, false, t), s.wd, { today: t, noCarry: true });
  const we = buildDay(sec, state, sampleDate(id, true, t), s.we, { today: t, noCarry: true });
  const text = sec.phaseText?.[id];
  const list = (bl: typeof wd) => bl.length
    ? bl.map((b) => <li key={b.key}><span>{b.name.replace(/: CAT \d{4} Slot \d$/, "")}</span><span>{b.mins} min</span></li>)
    : <li><span>Rest</span><span /></li>;
  return (
    <div className={"card phase" + (isNow ? " accent" : "")}>
      <div className="phase-h">
        <h3>{p.id}. {p.name} {isNow && <span className="tag t-must">Now</span>}</h3>
        <span className="eyebrow">{mediumDate(p.start)} to {mediumDate(p.end)}</span>
      </div>
      {text && <p>{text.goal}</p>}
      <div className="tmpl">
        <div><span className="eyebrow">A typical weekday, {s.wd} min</span><ul>{list(wd)}</ul></div>
        <div><span className="eyebrow">A typical {id >= 2 && id <= 4 ? "Saturday" : "weekend day"}, {s.we} min</span><ul>{list(we)}</ul></div>
      </div>
      {text && <p className="check"><b>Suggested checkpoint.</b> {text.check}</p>}
    </div>
  );
}

export default function Plan() {
  const t = todayIso();
  const lateStart = phaseOf(t).kind === "phase" && t > PHASES[0].end;
  return (
    <div className="page">
      <div className="view-head">
        <h1>Plan and time</h1>
        <p>Five phases to CAT 2027. Each day's timetable is built from the phase you are in and the time you have that day. Change your usual time here, or change a single day on Today.</p>
      </div>
      {lateStart && (
        <div className="notice">Starting after January? You join the plan at the current phase. Spend your first two weeks on the Foundation reading routine alongside it, and use the Learn tab to cover the question types you missed.</div>
      )}
      {LIVE_SECTIONS.map((s) => <TimeCard key={s.id} sec={s} />)}
      <RangeCard />
      <div className="card read">
        <p><b>How the timetable adapts.</b> Every block has a usual length and a minimum. With less time, low-priority blocks drop out first and the core task stays. With more time, blocks grow to their usual length, then extra blocks are added.</p>
        <p><b>Mock and paper analysis rule.</b> Spend 1.5 to 2 times the test time on analysis. For each wrong or skipped question, add an error log entry with the question type, why the trap worked and the correct reasoning.</p>
        <p><b>Missed days.</b> If you skip a day's core task, it moves to your next session as a catch-up block. Nothing else carries over.</p>
      </div>
      {LIVE_SECTIONS.map((sec) => (
        <div className="stack" key={sec.id}>
          <h2>{sec.short} phases</h2>
          {PHASES.map((p) => <PhaseCard key={p.id} id={p.id} sec={sec} />)}
        </div>
      ))}
    </div>
  );
}
