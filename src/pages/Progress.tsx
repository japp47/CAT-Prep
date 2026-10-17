import { useState, type FormEvent } from "react";
import { MockChart } from "../components/Chart";
import { shortDate, todayIso, uid } from "../lib/date";
import { useStore } from "../lib/store";
import { SECTIONS, sectionByLabel } from "../sections";

const KINDS = ["Past paper", "Full mock", "Sectional", "Official IIM mock"];
const sortDesc = <T extends { d: string }>(a: T, b: T) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0);

export default function Progress() {
  const { state, update } = useStore();
  const [sec, setSec] = useState("VARC");
  const def = sectionByLabel(sec);

  // practice form
  const [pErr, setPErr] = useState("");
  const addPractice = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    const d = String(fd.get("d")), a = parseInt(String(fd.get("a")), 10), c = parseInt(String(fd.get("c")), 10);
    if (!d) { setPErr("Pick the date."); return; }
    if (isNaN(a) || isNaN(c) || a < 1 || c < 0) { setPErr("Enter how many you attempted and how many were correct."); return; }
    if (c > a) { setPErr("Correct cannot be more than attempted."); return; }
    setPErr("");
    update((st) => { st.practice.push({ id: uid(), d, sec, t: String(fd.get("t")), a, c, src: String(fd.get("src") ?? "").trim() }); });
    (f.elements.namedItem("a") as HTMLInputElement).value = "";
    (f.elements.namedItem("c") as HTMLInputElement).value = "";
    (f.elements.namedItem("src") as HTMLInputElement).value = "";
  };

  // mock form
  const [mErr, setMErr] = useState("");
  const addMock = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    const d = String(fd.get("d")), c = parseInt(String(fd.get("c")), 10), w = parseInt(String(fd.get("w")), 10);
    if (!d) { setMErr("Pick the date of the test."); return; }
    if (isNaN(c) || isNaN(w) || c < 0 || w < 0) { setMErr("Enter the number correct and the number wrong. Use 0 if there are none."); return; }
    if (c + w > def.maxQ) { setMErr(sec + " has " + def.maxQ + " questions, so correct plus wrong cannot be more than " + def.maxQ + "."); return; }
    setMErr("");
    update((st) => { st.mocks.push({ id: uid(), d, sec, n: String(fd.get("n") ?? "").trim(), k: String(fd.get("k")), c, w }); });
    (f.elements.namedItem("n") as HTMLInputElement).value = "";
    (f.elements.namedItem("c") as HTMLInputElement).value = "";
    (f.elements.namedItem("w") as HTMLInputElement).value = "";
  };

  // accuracy by type
  const by: Record<string, { a: number; c: number }> = {};
  state.practice.filter((p) => p.sec === sec).forEach((p) => { (by[p.t] ??= { a: 0, c: 0 }); by[p.t].a += p.a; by[p.t].c += p.c; });
  const types = [...def.practiceTypes, ...Object.keys(by).filter((k) => !def.practiceTypes.includes(k))];
  const totA = Object.values(by).reduce((s, x) => s + x.a, 0), totC = Object.values(by).reduce((s, x) => s + x.c, 0);

  const practice = state.practice.filter((p) => p.sec === sec).sort(sortDesc).slice(0, 30);
  const mocksAsc = state.mocks.map((x, i) => ({ x, i })).filter((o) => o.x.sec === sec)
    .sort((a, b) => (a.x.d < b.x.d ? -1 : a.x.d > b.x.d ? 1 : a.i - b.i)).map((o) => o.x);
  const n = mocksAsc.length;
  const best = mocksAsc.reduce((m, x) => Math.max(m, x.c), 0);
  const last3 = mocksAsc.slice(-3), avg = last3.length ? last3.reduce((a, x) => a + x.c, 0) / last3.length : 0;
  const band: [number, number] = sec === "VARC" ? [15, 17] : [Math.round(def.maxQ * 0.55), Math.round(def.maxQ * 0.68)];
  const hit = mocksAsc.filter((x) => x.c >= band[0] && x.w <= 3).length;

  return (
    <div className="page">
      <div className="view-head">
        <h1>Progress</h1>
        <p>Practice sets show your accuracy by question type. Timed papers and mocks show whether you are on track.</p>
      </div>
      <div className="seg" role="group" aria-label="Section" style={{ alignSelf: "flex-start" }}>
        {SECTIONS.map((s) => <button key={s.id} type="button" aria-pressed={sec === s.short} onClick={() => setSec(s.short)}>{s.short}</button>)}
      </div>

      <p className="stats">Questions Practiced <b>{totA}</b> · Accuracy <b>{totA ? Math.round((totC / totA) * 100) + "%" : "none yet"}</b> · Papers and mocks <b>{n}</b> · Errors logged <b>{state.errors.filter((e) => e.sec === sec).length}</b></p>

      <div className="card">
        <h3>Accuracy by question type</h3>
        <ul className="bars">
          {types.map((t) => {
            const x = by[t] ?? { a: 0, c: 0 }, pct = x.a ? Math.round((x.c / x.a) * 100) : 0;
            return <li key={t}><span>{t}</span><span className="bar"><i className={x.a && pct < 60 ? "lo" : ""} style={{ width: pct + "%" }} /></span><span className="n">{x.a ? pct + "%" : "–"}<small>{x.a} Qs</small></span></li>;
          })}
        </ul>
        <p className="muted small" style={{ marginTop: 10 }}>Bars under 60% are red. Spend more drill time on those.</p>
      </div>

      <form className="card" onSubmit={addPractice} autoComplete="off">
        <h3>Log a {sec} practice set</h3>
        <div className="form">
          <label className="f">Date<input name="d" type="date" defaultValue={todayIso()} required /></label>
          <label className="f">Question type<select name="t" key={sec}>{def.practiceTypes.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="f">Attempted<input name="a" type="number" inputMode="numeric" min={1} max={200} required placeholder="8" /></label>
          <label className="f">Correct<input name="c" type="number" inputMode="numeric" min={0} max={200} required placeholder="6" /></label>
          <label className="f wide">Source<input name="src" type="text" placeholder="Cracku RC bank, CAT 2019 Slot 2" /></label>
          <button className="btn" type="submit">Add set</button>
        </div>
        <p className="err" role="alert">{pErr}</p>
      </form>

      <div className="card">
        <h3>Recent practice</h3>
        <ul className="log">
          {practice.length ? practice.map((p) => (
            <li key={p.id}>
              <div>
                <div className="l1"><span className="d">{shortDate(p.d)}</span><b>{p.t}</b>{p.src && <span className="muted small">{p.src}</span>}</div>
                <div className="nums">Correct <b>{p.c}</b> of <b>{p.a}</b> · {Math.round((p.c / Math.max(p.a, 1)) * 100)}%</div>
              </div>
              <button type="button" className="x" aria-label="Delete this set" onClick={() => update((st) => { st.practice = st.practice.filter((x) => x.id !== p.id); })}>Delete</button>
            </li>
          )) : <li style={{ display: "block" }}><div className="empty">Practice sets you log from the timetable or the form above show here.</div></li>}
        </ul>
      </div>

      <form className="card" onSubmit={addMock} autoComplete="off">
        <h3>Log a timed {sec} paper or mock section</h3>
        <div className="form">
          <label className="f">Date<input name="d" type="date" defaultValue={todayIso()} required /></label>
          <label className="f">Type<select name="k">{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
          <label className="f">Name<input name="n" type="text" placeholder="CAT 2017 Slot 1" /></label>
          <label className="f">Correct<input name="c" type="number" inputMode="numeric" min={0} max={def.maxQ} required placeholder="14" /></label>
          <label className="f">Wrong MCQ<input name="w" type="number" inputMode="numeric" min={0} max={def.maxQ} required placeholder="3" /></label>
          <button className="btn" type="submit">Add result</button>
        </div>
        <p className="err" role="alert">{mErr}</p>
      </form>

      <div className="card">
        <h3>{sec} correct answers over time</h3>
        <div className="legend">
          <span><i style={{ background: "var(--accent)" }} />Correct</span>
          <span><i style={{ background: "var(--bad)", opacity: 0.55 }} />Wrong MCQ</span>
          <span><i style={{ background: "var(--good)", opacity: 0.3 }} />Target, {band[0]} to {band[1]} correct</span>
        </div>
        <MockChart data={mocksAsc.slice(-20)} max={def.maxQ} band={band} />
        <p className="summary">{n ? (<>
          <span>Results <b>{n}</b></span><span>Best <b>{best}</b> correct</span><span>Last 3 average <b>{avg.toFixed(1)}</b></span><span>On target <b>{hit} of {n}</b></span>
        </>) : <span>No {sec} results yet.</span>}</p>
        {sec !== "VARC" && <p className="muted small">The {sec} target band is a rough placeholder until the {sec} plan launches.</p>}
      </div>

      <div className="card">
        <h3>Papers and mocks</h3>
        <ul className="log">
          {n ? [...mocksAsc].reverse().map((x) => (
            <li key={x.id}>
              <div>
                <div className="l1"><span className="d">{shortDate(x.d)}</span><b>{x.n || x.k}</b><span className="tag t-opt">{x.k}</span></div>
                <div className="nums">Correct <b>{x.c}</b> · Wrong <b>{x.w}</b> · Raw <b>{3 * x.c - x.w}</b></div>
              </div>
              <button type="button" className="x" aria-label={"Delete result from " + shortDate(x.d)} onClick={() => update((st) => { st.mocks = st.mocks.filter((m) => m.id !== x.id); })}>Delete</button>
            </li>
          )) : <li style={{ display: "block" }}><div className="empty">Timed papers you log from the timetable or the form above show here.</div></li>}
        </ul>
      </div>
    </div>
  );
}
