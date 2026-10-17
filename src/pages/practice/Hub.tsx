import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDays, shortDate, todayIso, uid } from "../../lib/date";
import { usePref } from "../../lib/prefs";
import { useStore } from "../../lib/store";
import { RC_CATALOG } from "../../practice/catalog.gen";
import { DAILY_EPOCH, dayNumber, rcOfDay } from "../../practice/daily";
import { dueRedo } from "../../practice/redo";
import { GENRES, type Genre, type RcMeta } from "../../practice/types";
import { DAILY_MIX, VA_KIND, type VaKind } from "../../practice/va/build";
import { StreakBadge } from "./common";

function useBest() {
  const { state } = useStore();
  return (set: RcMeta) => {
    const tries = state.rcAttempts.filter((a) => a.set === set.id);
    if (!tries.length) return null;
    const last = tries[tries.length - 1];
    return { tries: tries.length, best: Math.max(...tries.map((a) => 3 * a.c - a.w)), last };
  };
}

function RcRow({ set, label }: { set: RcMeta; label?: string }) {
  const best = useBest()(set);
  return (
    <li>
      <div style={{ minWidth: 0 }}>
        {label && <span className="eyebrow">{label}</span>}
        <div><Link className="res-name" to={`/practice/rc/${set.id}`}>{set.title}</Link></div>
        <span className="meta">{GENRES[set.genre]} · {set.difficulty} · {set.words} words{best ? ` · best ${best.best > 0 ? "+" : ""}${best.best}/${3 * set.questions}` : ""}</span>
      </div>
      <div className="row">
        {best && <Link className="link" to={`/practice/rc/${set.id}?review=${best.last.id}`}>Review</Link>}
        <Link className="go" to={`/practice/rc/${set.id}`}>{best ? "Retake" : "Start"}</Link>
      </div>
    </li>
  );
}

export default function PracticeHub() {
  const { state } = useStore();
  const navigate = useNavigate();
  const today = todayIso();
  const daily = rcOfDay(today);
  const dailyTry = state.rcAttempts.filter((a) => a.set === daily.id && a.d === today).pop();
  const vaToday = state.vaAttempts.filter((a) => a.mode === "daily" && a.d === today).pop();
  const best = state.speedRuns.filter((r) => r.recall === 2).reduce((m, r) => Math.max(m, r.wpm), 0);
  const redoDue = dueRedo(state.redo, today).length;
  const redoOpen = state.redo.filter((r) => !r.cleared).length;

  const [genre, setGenre] = usePref<Genre | "all">("libGenre", "all");
  const [diff, setDiff] = usePref<"all" | "easy" | "medium" | "hard">("libDiff", "all");
  const [hideDone, setHideDone] = usePref("libHideDone", false);
  const [kind, setKind] = useState<VaKind | "mix">("mix");
  const [count, setCount] = useState(6);

  const tried = new Set(state.rcAttempts.map((a) => a.set));
  const lib = RC_CATALOG.filter((s) => (genre === "all" || s.genre === genre) && (diff === "all" || s.difficulty === diff) && !(hideDone && tried.has(s.id)));
  const archiveDays = Array.from({ length: 14 }, (_, i) => addDays(today, -i - 1)).filter((d) => d >= DAILY_EPOCH);

  return (
    <div className="page">
      <div className="view-head">
        <div className="row" style={{ justifyContent: "space-between" }}><span className="eyebrow">VARC practice</span><StreakBadge /></div>
        <h1>Practice</h1>
        <p>Exam-style RC sets with an explanation for every option, a daily VA drill, a redo queue for your mistakes and a reading speed test. Everything you do here goes into Progress, and one tap sends a mistake to your Error log.</p>
      </div>

      <div className="grid2">
        <div className="card stack accent">
          <span className="eyebrow">RC of the day · day {dayNumber(today)}</span>
          <h3>{daily.title}</h3>
          <p className="muted small">{GENRES[daily.genre]} · {daily.difficulty} · {daily.words} words · {daily.questions} questions · about 7 minutes</p>
          {dailyTry
            ? <p className="ok">Done today: {dailyTry.c} of {daily.questions} correct.</p>
            : <p className="muted small">The same passage for everyone today. A new one tomorrow.</p>}
          <div className="row">
            {dailyTry
              ? <><Link className="btn" to={`/practice/rc/${daily.id}?review=${dailyTry.id}`}>Review</Link><Link className="btn ghost" to={`/practice/rc/${daily.id}`}>Retake</Link></>
              : <Link className="btn" to={`/practice/rc/${daily.id}`}>Start</Link>}
          </div>
        </div>
        <div className="card stack">
          <span className="eyebrow">Daily VA drill</span>
          <h3>{DAILY_MIX.length} questions, about 12 minutes</h3>
          <p className="muted small">2 each of para summary, sentence insertion, odd sentence out and para jumbles, the mix CAT used in 2023 and 2025, marked the way CAT marks them.</p>
          {vaToday && <p className="ok">Done today: {vaToday.items.filter((i) => i.ok).length} of {vaToday.items.length} correct.</p>}
          <div className="row"><Link className="btn" to="/practice/va">{vaToday ? "Review" : "Start"}</Link></div>
        </div>
      </div>

      <div className={"card stack" + (redoDue ? " accent" : "")}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="eyebrow">Redo queue</span>
          {redoOpen > 0 && <span className="muted small">{redoOpen} open</span>}
        </div>
        <h3>{redoDue ? `${redoDue} question${redoDue > 1 ? "s" : ""} to redo today` : redoOpen ? "Nothing to redo today" : "No mistakes to redo yet"}</h3>
        <p className="muted small">Questions you miss come back after 1, 3 and 7 days, until you get them right three times in a row.</p>
        {(redoDue > 0 || redoOpen > 0) && <div className="row"><Link className={redoDue ? "btn" : "btn ghost"} to="/practice/redo">{redoDue ? "Start" : "See the queue"}</Link></div>}
      </div>

      <div className="grid2">
        <div className="card stack">
          <span className="eyebrow">Free tool</span>
          <h3>Reading speed test</h3>
          <p className="muted small">One timed passage, then two recall questions. CAT needs about 200 words a minute.</p>
          <p className="summary"><span>Your best <b>{best ? best + " wpm" : "not tested yet"}</b></span></p>
          <div className="row"><Link className="btn ghost" to="/practice/speed">Take the test</Link></div>
        </div>
        <div className="card stack">
          <span className="eyebrow">Custom VA drill</span>
          <h3>Drill one type</h3>
          <div className="form">
            <label className="f">Type
              <select value={kind} onChange={(e) => setKind(e.target.value as VaKind | "mix")}>
                <option value="mix">Mixed</option>
                {(Object.keys(VA_KIND) as VaKind[]).map((k) => <option key={k} value={k}>{VA_KIND[k].label}</option>)}
              </select>
            </label>
            <label className="f">Questions
              <select value={count} onChange={(e) => setCount(+e.target.value)}>{[4, 6, 8, 10].map((n) => <option key={n}>{n}</option>)}</select>
            </label>
            <button type="button" className="btn" onClick={() => navigate(`/practice/va?type=${kind}&n=${count}&seed=${uid()}`)}>Start drill</button>
          </div>
          <p className="muted small">Items you have not seen yet come first.</p>
        </div>
      </div>

      <section className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}><h2>RC library</h2><span className="muted small">{tried.size} of {RC_CATALOG.length} tried</span></div>
        <div className="controls">
          <select aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value as Genre | "all")} style={{ width: "auto" }}>
            <option value="all">All genres</option>
            {(Object.keys(GENRES) as Genre[]).map((g) => <option key={g} value={g}>{GENRES[g]}</option>)}
          </select>
          <div className="seg" role="group" aria-label="Difficulty">
            {(["all", "easy", "medium", "hard"] as const).map((d) => <button key={d} type="button" aria-pressed={diff === d} onClick={() => setDiff(d)}>{d === "all" ? "Any level" : d[0].toUpperCase() + d.slice(1)}</button>)}
          </div>
          <label className="tog"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide tried</label>
        </div>
        {lib.length ? <ul className="lib">{lib.map((s) => <RcRow key={s.id} set={s} />)}</ul> : <div className="empty">Nothing matches. Change the filters.</div>}
      </section>

      {archiveDays.length > 0 && (
        <section className="stack">
          <h2>Past RCs of the day</h2>
          <ul className="lib">{archiveDays.map((d) => <RcRow key={d} set={rcOfDay(d)} label={`${shortDate(d)} · day ${dayNumber(d)}`} />)}</ul>
        </section>
      )}

      <p className="foot">All passages, questions and VA paragraphs here are original practice material written for this site, not real CAT questions. For real past papers, see the Practice tab on the <Link to="/varc">VARC page</Link>.</p>
    </div>
  );
}
