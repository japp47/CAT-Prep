import { useState, type FormEvent } from "react";
import { Bars } from "../components/Chart";
import { TRAPS } from "../data/traps";
import { shortDate, todayIso, uid } from "../lib/date";
import { useStore } from "../lib/store";
import { SECTION_LABELS, sectionByLabel } from "../sections";


export default function Errors() {
  const { state, update } = useStore();
  const [sec, setSec] = useState("VARC");
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("All");

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    const g = (k: string) => String(fd.get(k) ?? "").trim();
    if (!g("why") && !g("fix") && !g("src")) { setErr("Add where it was from, why it went wrong, or the right reasoning."); return; }
    setErr("");
    update((st) => { st.errors.push({ id: uid(), d: todayIso(), sec, t: g("t"), trap: g("trap"), src: g("src"), why: g("why"), fix: g("fix") }); });
    ["src", "why", "fix"].forEach((k) => ((f.elements.namedItem(k) as HTMLInputElement).value = ""));
  };

  const byType: Record<string, number> = {}, byTrap: Record<string, number> = {};
  state.errors.forEach((e) => {
    const k = e.sec === "VARC" ? e.t : e.sec + ": " + e.t;
    byType[k] = (byType[k] || 0) + 1;
    if (e.trap) byTrap[e.trap] = (byTrap[e.trap] || 0) + 1;
  });
  const list = state.errors.filter((e) => filter === "All" || e.sec === filter).slice().reverse();

  return (
    <div className="page">
      <div className="view-head">
        <h1>Error log</h1>
        <p>One entry for every question you got wrong or skipped. The counts show which question types and traps cost you most.</p>
      </div>
      <form className="card" onSubmit={add} autoComplete="off">
        <div className="form">
          <label className="f">Section<select value={sec} onChange={(e) => setSec(e.target.value)}>{SECTION_LABELS.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="f">Question type<select name="t" key={sec}>{sectionByLabel(sec).errorTypes.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="f">What got you<select name="trap">{TRAPS.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="f wide">Where from<input name="src" type="text" placeholder="CAT 2019 Slot 2, RC 3, Q14" /></label>
          <label className="f wide">Why it went wrong<textarea name="why" placeholder="I picked the option that sounded most like the author." /></label>
          <label className="f wide">The right reasoning<textarea name="fix" placeholder="The passage only says X in paragraph 3, so the option that adds Y is out of scope." /></label>
          <button className="btn" type="submit">Add to log</button>
        </div>
        <p className="err" role="alert">{err}</p>
      </form>
      <div className="grid2">
        <div className="card"><h3>Weakest question types</h3><Bars counts={byType} empty="Counts appear after your first entry." /></div>
        <div className="card"><h3>Traps that got you</h3><Bars counts={byTrap} empty="Counts appear after your first entry." /></div>
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <h3>Log ({list.length})</h3>
          <div className="seg" role="group" aria-label="Filter by section">
            {["All", ...SECTION_LABELS].map((s) => <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>{s}</button>)}
          </div>
        </div>
        <ul className="log">
          {list.length ? list.map((e) => (
            <li key={e.id}>
              <div>
                <div className="l1">
                  <span className="d">{shortDate(e.d)}</span><span className="tag t-type">{e.sec}</span><span className="tag t-type">{e.t}</span>
                  {e.trap && <span className="tag t-opt">{e.trap}</span>}{e.src && <span className="muted small">{e.src}</span>}
                </div>
                {e.why && <p className="tx"><b>Went wrong.</b> {e.why}</p>}
                {e.fix && <p className="tx"><b>Right reasoning.</b> {e.fix}</p>}
              </div>
              <button type="button" className="x" aria-label="Delete this entry" onClick={() => update((st) => { st.errors = st.errors.filter((x) => x.id !== e.id); })}>Delete</button>
            </li>
          )) : <li style={{ display: "block" }}><div className="empty">No mistakes logged yet. After each timed set, add one entry per wrong or skipped question.</div></li>}
        </ul>
      </div>
    </div>
  );
}
