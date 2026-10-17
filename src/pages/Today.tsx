import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LinkButtons, Ext } from "../components/Links";
import { daysLeft, examLine, phaseCaption } from "../components/Countdown";
import { EXAM_CONFIRMED, PHASES, phaseOf } from "../data/exam";
import { addDays, clamp, DOW, dow, isWeekend, longDate, shortDate, todayIso, uid, weekStart, mediumDate } from "../lib/date";
import { useStore } from "../lib/store";
import type { AppState } from "../lib/state";
import { buildDay, budgetFor, carryInfo, defaultMin, doneKey, doneMinutes, coreOf, markBlockDone, type PlacedBlock } from "../planner/engine";
import { useFocus } from "../lib/focus";
import { LIVE_SECTIONS, SECTIONS } from "../sections";
import type { SectionDef } from "../sections/types";
import { rcOfDay } from "../practice/daily";
import { dueRedo } from "../practice/redo";
import { GENRES } from "../practice/types";
import { DAILY_MIX } from "../practice/va/build";
import { StreakBadge } from "./practice/common";

const CHIP_MINS = [0, 30, 45, 60, 90, 120, 150, 180];

function useToday() {
  const [t, setT] = useState(todayIso);
  useEffect(() => {
    const on = () => { if (!document.hidden) setT(todayIso()); };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return t;
}

function markDone(st: AppState, d: string, b: PlacedBlock, sec: SectionDef) {
  markBlockDone(st, d, sec.id, b.key, b.mins, b.carryFrom);
}

function LogForm({ sec, b, d }: { sec: SectionDef; b: PlacedBlock; d: string }) {
  const { update } = useStore();
  const [err, setErr] = useState("");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (b.kind === "practice") {
      const a = parseInt(String(fd.get("a")), 10), c = parseInt(String(fd.get("c")), 10);
      if (isNaN(a) || isNaN(c) || a < 1 || c < 0 || c > a) { setErr("Correct must be between 0 and the number attempted."); return; }
      update((st) => { st.practice.push({ id: uid(), d, sec: sec.short, t: String(fd.get("t")), a, c, src: b.name }); markDone(st, d, b, sec); });
    } else {
      const n = String(fd.get("n") ?? "").trim(), c = parseInt(String(fd.get("c")), 10), w = parseInt(String(fd.get("w")), 10);
      if (!n || isNaN(c) || isNaN(w) || c < 0 || w < 0 || c + w > sec.maxQ) { setErr("Add a name. Correct plus wrong cannot be more than " + sec.maxQ + "."); return; }
      update((st) => { st.mocks.push({ id: uid(), d, sec: sec.short, n, k: b.pkind || "Past paper", c, w }); markDone(st, d, b, sec); });
    }
  };
  if (b.kind === "practice") {
    return (
      <form className="mini" onSubmit={submit}>
        <label className="f w2">Type<select name="t" defaultValue={b.ptype}>{sec.practiceTypes.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="f">Attempted<input name="a" type="number" inputMode="numeric" min={1} max={200} required /></label>
        <label className="f">Correct<input name="c" type="number" inputMode="numeric" min={0} max={200} required /></label>
        <button className="btn sm" type="submit">Log and finish</button>
        {err && <p className="err" role="alert" style={{ flexBasis: "100%" }}>{err}</p>}
      </form>
    );
  }
  return (
    <form className="mini" onSubmit={submit}>
      <label className="f w2">Paper or mock<input name="n" type="text" defaultValue={b.paper || ""} placeholder="Cracku mock 3" required /></label>
      <label className="f">Correct<input name="c" type="number" inputMode="numeric" min={0} max={sec.maxQ} required /></label>
      <label className="f">Wrong MCQ<input name="w" type="number" inputMode="numeric" min={0} max={sec.maxQ} required /></label>
      <button className="btn sm" type="submit">Log and finish</button>
      {err && <p className="err" role="alert" style={{ flexBasis: "100%" }}>{err}</p>}
    </form>
  );
}

function SectionDay({ sec, d, today }: { sec: SectionDef; d: string; today: string }) {
  const { state, update } = useStore();
  const focus = useFocus();
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const isToday = d === today;
  const rec = state.days[d];
  const has = typeof rec?.min?.[sec.id] === "number";
  const budget = budgetFor(sec, state, d), def = defaultMin(sec, state, d);
  const dm = rec?.done ?? {};
  const carry = isToday ? carryInfo(sec, state, today) : null;
  const blocks = buildDay(sec, state, d, budget, { today });
  const ph = phaseOf(d);
  const canTick = d <= today;
  const usualLabel = isWeekend(d) ? "weekend" : "weekday";

  const setMin = (m: number | null) => update((st) => {
    const r = (st.days[d] ??= {});
    r.min ??= {};
    if (m === null || m === defaultMin(sec, st, d)) delete r.min[sec.id]; else r.min[sec.id] = m;
  });
  const toggle = (b: PlacedBlock, on: boolean) => update((st) => {
    if (on) markDone(st, d, b, sec);
    else {
      const r = st.days[d];
      if (r?.done) delete r.done[b.key];
      if (b.carryFrom && st.days[b.carryFrom]?.carried) delete st.days[b.carryFrom].carried![sec.id];
    }
  });

  let body: React.ReactNode;
  if (ph.kind !== "phase") {
    body = <li className="rest"><b>{ph.kind === "exam" ? "Exam day." : ph.kind === "after" ? "CAT 2027 is over." : "The plan starts on " + mediumDate(PHASES[0].start) + "."}</b>
      {ph.kind === "exam" && <span className="muted">Eat well, reach early, and trust your attempt order.</span>}</li>;
  } else if (!blocks.length) {
    body = <li className="rest"><b>Rest day.</b><span className="muted">Nothing is planned. The core task moves to your next session. Pick a time above if you can study after all.</span></li>;
  } else {
    body = blocks.map((b) => {
      const done = !!dm[b.key];
      const timed = rec?.spent?.[b.key] ?? 0;
      const running = focus.run?.key === b.key && focus.run.d === d;
      return (
        <li key={b.key} className={"blk" + (done ? " done" : "")}>
          {canTick ? <input type="checkbox" checked={done} onChange={(e) => toggle(b, e.target.checked)} aria-label={"Done: " + b.name} /> : <span />}
          <div className="blk-main">
            <div className="blk-top">
              <span className="blk-name">{b.name}</span>
              <span className="mins">{b.mins} min</span>
              {b.pri === 1 && <span className="tag t-must">Core</span>}
              {b.pri === 9 && <span className="tag t-good">Extra time</span>}
            </div>
            <p className="blk-desc">{b.desc}</p>
            <LinkButtons links={b.links} />
            {isToday && !done && (
              <div className="row small">
                {running ? <span className="ok">Focus timer running</span>
                  : <button type="button" className="link" disabled={!!focus.run} title={focus.run ? "Another block's timer is running" : undefined}
                      onClick={() => focus.start({ key: b.key, name: sec.short + ": " + b.name, sec: sec.id, d, target: b.mins, log: !!b.kind, carryFrom: b.carryFrom })}>
                      Start focus timer</button>}
                {timed > 0 && <span className="muted">Timed {timed} of {b.mins} min</span>}
              </div>
            )}
            {done && timed > 0 && <p className="muted small">Timed {timed} of {b.mins} min.</p>}
            {canTick && !done && b.kind && <LogForm sec={sec} b={b} d={d} />}
            {done && b.kind && <p className="logged">Logged and done.</p>}
          </div>
        </li>
      );
    });
  }
  const total = blocks.reduce((s, b) => s + b.mins, 0);
  const doneCount = blocks.filter((b) => dm[b.key]).length;
  const timedTotal = blocks.reduce((s, b) => s + (rec?.spent?.[b.key] ?? 0), 0);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>{sec.short}</h3>
        <Link className="link" to={"/" + sec.id}>Resources</Link>
      </div>
      <div className="timebox">
        <span className="eyebrow">{sec.short} time for this day</span>
        <div className="chips">
          {CHIP_MINS.map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={budget === m} onClick={() => setMin(m)}>
              {m === 0 ? "Rest" : m + " min"}{m === def && <span>usual</span>}
            </button>
          ))}
        </div>
        <div className="custom">
          <label className="muted small" htmlFor={"custom-" + sec.id}>Other</label>
          <input id={"custom-" + sec.id} type="number" inputMode="numeric" min={0} max={600} step={5} placeholder="minutes" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button type="button" className="btn ghost sm" onClick={() => {
            const v = parseInt(custom, 10);
            if (isNaN(v) || v < 0 || v > 600) { setNote("Enter a number of minutes from 0 to 600."); return; }
            setNote(""); setCustom(""); setMin(Math.round(v));
          }}>Set</button>
          {has && <button type="button" className="link" onClick={() => setMin(null)}>Use my usual time</button>}
        </div>
        <p className="muted small">{note || (has
          ? "Set to " + budget + " min for this day. Your usual " + usualLabel + " time is " + def + " min."
          : "Using your usual " + DOW[dow(d)] + " time, " + def + " min. Change usual times in Plan.")}</p>
      </div>
      {carry && (
        <div className="carry">
          <span>Catch-up added from {shortDate(carry.date)}: {carry.block.name}.</span>
          <button type="button" className="link" onClick={() => update((st) => { ((st.days[carry.date] ??= {}).dismiss ??= {})[sec.id] = 1; })}>Skip it</button>
        </div>
      )}
      <div className="tt-head">
        <h3>{ph.kind === "phase" ? (blocks.length ? "Timetable, " + ph.phase.name + " phase" : "Rest day") : ph.kind === "exam" ? "Exam day" : "Timetable"}</h3>
        {blocks.length > 0 && <span className="muted small">{blocks.length} block{blocks.length === 1 ? "" : "s"} · {total} min · {doneCount} done{timedTotal > 0 ? ` · ${timedTotal} min timed` : ""}</span>}
      </div>
      <ul className="blks">{body}</ul>
    </div>
  );
}

function Week({ d, today, onPick }: { d: string; today: string; onPick: (d: string) => void }) {
  const { state } = useStore();
  const ws = weekStart(d);
  let target = 0, done = 0, studied = 0;
  const cells = Array.from({ length: 7 }, (_, i) => {
    const x = addDays(ws, i);
    const b = phaseOf(x).kind !== "phase" ? 0 : LIVE_SECTIONS.reduce((s, sec) => s + budgetFor(sec, state, x), 0);
    const dn = doneMinutes(state, x);
    target += b; done += dn; if (dn > 0) studied++;
    const f = b > 0 ? clamp(dn / b, 0, 1) * 100 : dn > 0 ? 100 : 0;
    return (
      <button key={x} type="button" className={"wd" + (x === d ? " sel" : "") + (x === today ? " today" : "")} onClick={() => onPick(x)}
        aria-label={longDate(x) + ", " + b + " minutes planned, " + dn + " done"}>
        <b>{DOW[dow(x)].slice(0, 3)}</b><span>{+x.slice(8)}</span><span>{b === 0 ? "rest" : b + "m"}</span><i><u style={{ width: f.toFixed(0) + "%" }} /></i>
      </button>
    );
  });
  return (
    <div className="card">
      <h3>This week</h3>
      <p className="summary"><span>Done <b>{done}</b> of <b>{target}</b> min</span><span>Studied <b>{studied}</b> of 7 days</span></p>
      <div className="meter" style={{ marginTop: 10 }}><i style={{ width: (target ? clamp(done / target, 0, 1) * 100 : 0).toFixed(1) + "%" }} /></div>
      <div className="week">{cells}</div>
    </div>
  );
}

function MustDo() {
  const { state } = useStore();
  const items = LIVE_SECTIONS.flatMap((s) => (s.resources ?? []).map((r) => ({ r, s }))).filter(({ r }) => r.p === "must" && !state.ticks[r.id]).slice(0, 5);
  return (
    <div className="card">
      <h3>Must-do resources not yet ticked</h3>
      <ul className="plain next">
        {items.length ? items.map(({ r, s }) => {
          const cat = s.categories?.find((c) => c.id === r.c)?.n ?? "";
          return (
            <li key={r.id}>
              <div style={{ minWidth: 0 }}><span className="ct">{s.short} · {cat}</span><Ext className="res-name" href={r.u}>{r.n}</Ext></div>
              <Ext className="go" href={r.u}>{r.find ? "Find" : "Open"} ↗</Ext>
            </li>
          );
        }) : <li className="muted">Every must-do resource is ticked.</li>}
      </ul>
    </div>
  );
}

export default function Today() {
  const today = useToday();
  const [d, setD] = useState(today);
  const { state } = useStore();
  const isToday = d === today, past = d < today;
  const coreLeft = LIVE_SECTIONS.filter((s) => { const c = coreOf(s, state, today); return c && !state.days[today]?.done?.[doneKey(s, c.id)]; }).length;
  const ph = phaseOf(today);
  const goal = ph.kind === "phase" ? LIVE_SECTIONS[0]?.phaseText?.[ph.phase.id]?.goal : undefined;

  return (
    <div className="page">
      <div className="view-head">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="eyebrow">{Math.max(daysLeft(), 0)} days to CAT 2027 · {examLine(EXAM_CONFIRMED)}</span>
          <StreakBadge />
        </div>
        <h1>Today's timetable</h1>
        <p>{phaseCaption(goal)}</p>
      </div>

      <div className="card">
        <div className="daybar">
          <div className="daynav">
            <button type="button" aria-label="Previous day" onClick={() => setD(addDays(d, -1))}>‹</button>
            <div><span className="eyebrow">{isToday ? "Today" : past ? "Past day" : "Planning ahead"}</span><br /><strong>{longDate(d)}</strong></div>
            <button type="button" aria-label="Next day" onClick={() => setD(addDays(d, 1))}>›</button>
          </div>
          {!isToday && <button type="button" className="link" onClick={() => setD(today)}>Back to today</button>}
          {isToday && coreLeft > 0 && <span className="tag t-must">{coreLeft} core task{coreLeft > 1 ? "s" : ""} left</span>}
        </div>
      </div>

      {LIVE_SECTIONS.map((s) => <SectionDay key={s.id} sec={s} d={d} today={today} />)}

      {isToday && <PracticeToday today={today} />}

      {SECTIONS.filter((s) => s.status === "soon").length > 0 && (
        <p className="muted small">
          {SECTIONS.filter((s) => s.status === "soon").map((s) => s.short).join(" and ")} timetables are coming soon. You can already log their mock scores in Progress and mistakes in the Error log.
        </p>
      )}

      <div className="grid2">
        <Week d={d} today={today} onPick={setD} />
        <MustDo />
      </div>
    </div>
  );
}

/** The two daily sets, so the timetable's RC and VA blocks have something to open on this site. */
function PracticeToday({ today }: { today: string }) {
  const { state } = useStore();
  const rc = rcOfDay(today);
  const rcTry = state.rcAttempts.filter((a) => a.set === rc.id && a.d === today).pop();
  const vaTry = state.vaAttempts.filter((a) => a.mode === "daily" && a.d === today).pop();
  const redo = dueRedo(state.redo, today).length;
  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}><h3>Practise here today</h3><Link className="link" to="/practice">All practice</Link></div>
      <ul className="plain next">
        <li>
          <div style={{ minWidth: 0 }}><span className="ct">RC of the day · {GENRES[rc.genre]}</span><Link className="res-name" to={`/practice/rc/${rc.id}`}>{rc.title}</Link>
            {rcTry && <span className="ok small"> · {rcTry.c} of {rc.questions} correct</span>}</div>
          <Link className="go" to={rcTry ? `/practice/rc/${rc.id}?review=${rcTry.id}` : `/practice/rc/${rc.id}`}>{rcTry ? "Review" : "Start"}</Link>
        </li>
        <li>
          <div style={{ minWidth: 0 }}><span className="ct">Daily VA drill</span><Link className="res-name" to="/practice/va">{DAILY_MIX.length} questions: para summary, sentence insertion, odd sentence out, para jumbles</Link>
            {vaTry && <span className="ok small"> · {vaTry.items.filter((i) => i.ok).length} of {vaTry.items.length} correct</span>}</div>
          <Link className="go" to="/practice/va">{vaTry ? "Review" : "Start"}</Link>
        </li>
        {redo > 0 && (
          <li>
            <div style={{ minWidth: 0 }}><span className="ct">Redo queue</span><Link className="res-name" to="/practice/redo">{redo} question{redo > 1 ? "s" : ""} you missed earlier</Link></div>
            <Link className="go" to="/practice/redo">Start</Link>
          </li>
        )}
      </ul>
      <p className="muted small">Scores log themselves in Progress. Tick the matching timetable block when you are done.</p>
    </div>
  );
}
