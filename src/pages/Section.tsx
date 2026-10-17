import { Link, useParams } from "react-router-dom";
import { CategoryBlock } from "../components/Resources";
import { Ext } from "../components/Links";
import { BENCHMARKS, PASSAGE_SOURCES, TOPPERS } from "../data/stories";
import { dow } from "../lib/date";
import { todayIso } from "../lib/date";
import { usePref } from "../lib/prefs";
import { useStore } from "../lib/store";
import { SECTION_BY_ID } from "../sections";
import type { SectionDef, SectionId } from "../sections/types";
import { FORMAT, TAB_NOTES, TOPICS, VTABS } from "../sections/varc/learn";
import { ROTATION } from "../sections/varc/resources";
import NotFound from "./NotFound";

function Soon({ sec }: { sec: SectionDef }) {
  return (
    <div className="page">
      <div className="view-head"><span className="soon" style={{ alignSelf: "flex-start" }}>Coming soon</span><h1>{sec.short}</h1><p>{sec.name}. {sec.tagline}</p></div>
      <div className="card stack">
        <p>This section will get the same treatment as VARC: concepts, question banks, past papers, videos and its own phase plan with time settings.</p>
        <p className="muted">You can already log {sec.short} mock scores in <Link to="/progress">Progress</Link> and {sec.short} mistakes in the <Link to="/errors">Error log</Link>.</p>
        <div className="row"><Link className="btn" to="/varc">Go to VARC</Link><Link className="btn ghost" to="/roadmap">See what's coming</Link></div>
      </div>
    </div>
  );
}

function Topic({ t }: { t: (typeof TOPICS)[number] }) {
  return (
    <details className="qa" open={t.open}>
      <summary>{t.h}</summary>
      <div className="read">
        {t.p?.map((p, i) => <p key={i}>{p}</p>)}
        {t.ol && <ol>{t.ol.map((x, i) => <li key={i}>{x}</li>)}</ol>}
        {t.ul && <ul>{t.ul.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      </div>
    </details>
  );
}

function Rotation() {
  const today = dow(todayIso());
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="stack">
      <h3>Weekly reading rotation</h3>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Day</th><th>Sources</th><th>Genre</th><th>Write down</th></tr></thead>
          <tbody>
            {order.map((g) => {
              const x = ROTATION[g];
              return (
                <tr key={g} className={g === today ? "now" : ""}>
                  <td>{x.d}</td>
                  <td>{x.src.map(([n, u], i) => <span key={u}>{i > 0 && ", "}<Ext href={u}>{n}</Ext></span>)}</td>
                  <td>{x.genre}</td><td>{x.out}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">Today's row also appears in your timetable. Bharath's Reading List works on any day.</p>
    </div>
  );
}

function Toppers() {
  return (
    <>
      <div className="stack">
        <h3>How 99+ scorers prepared</h3>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Name</th><th>Result</th><th>What they did</th></tr></thead>
          <tbody>{TOPPERS.map((t) => <tr key={t.name}><td>{t.link ? <Ext href={t.link}>{t.name}</Ext> : t.name}</td><td>{t.result}</td><td>{t.what}</td></tr>)}</tbody>
        </table></div>
      </div>
      <div className="stack">
        <h3>Score benchmarks</h3>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Year</th><th className="num">99 percentile</th><th className="num">99.9 percentile</th><th>Source</th></tr></thead>
          <tbody>{BENCHMARKS.map((b) => <tr key={b.year}><td>{b.year}</td><td className="num">{b.p99}</td><td className="num">{b.p999}</td><td>{b.src}</td></tr>)}</tbody>
        </table></div>
        <p className="muted small">Scaled VARC scores from coaching institutes. They differ by 1 to 2 marks and shift each year.</p>
      </div>
      <div className="stack">
        <h3>Where CAT passages come from</h3>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Year</th><th>Topics and sources</th></tr></thead>
          <tbody>{PASSAGE_SOURCES.map((p) => <tr key={p.year}><td>{p.year}</td><td>{p.text}</td></tr>)}</tbody>
        </table></div>
        <p className="muted small">In 2025, Slot 1 was rated moderate to difficult and Slots 2 and 3 easy to moderate. Every slot had 2 each of para jumbles, para summary, para completion and odd sentence out.</p>
      </div>
    </>
  );
}

function Live({ sec }: { sec: SectionDef }) {
  const { state } = useStore();
  const [vtab, setVtab] = usePref("vtab", "learn");
  const [pri, setPri] = usePref<"all" | "must">("pri", "all");
  const [hideDone, setHideDone] = usePref("hideDone", false);
  const [q, setQ] = usePref("q:" + sec.id, "");
  const all = sec.resources ?? [], cats = sec.categories ?? [];
  const query = q.trim().toLowerCase();
  const mustAll = all.filter((r) => r.p === "must");
  const doneAll = all.filter((r) => state.ticks[r.id]).length;
  const mustDone = mustAll.filter((r) => state.ticks[r.id]).length;

  const filter = (catId: string, withQuery: boolean) => all.filter((x) =>
    x.c === catId && (pri !== "must" || x.p === "must") && !(hideDone && state.ticks[x.id]) &&
    (!withQuery || (x.n + " " + x.w + " " + x.t).toLowerCase().includes(query)));
  const cats4 = (tab: string | null) => cats.filter((c) => tab === null || c.tab === tab)
    .map((c) => ({ c, items: filter(c.id, tab === null) })).filter((x) => x.items.length);
  const list = (tab: string | null, emptyMsg: string) => {
    const blocks = cats4(tab);
    return blocks.length ? blocks.map(({ c, items }) => <CategoryBlock key={c.id} cat={c} items={items} all={all} />) : <div className="empty">{emptyMsg}</div>;
  };
  const tabValid = VTABS.some((t) => t.id === vtab) ? vtab : "learn";

  return (
    <div className="page">
      <div className="view-head">
        <span className="live" style={{ alignSelf: "flex-start" }}>Live</span>
        <h1>{sec.short}</h1>
        <p>{sec.name}. {doneAll} of {all.length} resources done. Must-do: {mustDone} of {mustAll.length}.</p>
      </div>
      <div className="controls">
        <input className="search" type="search" placeholder={"Search all " + sec.short + " resources"} aria-label={"Search all " + sec.short + " resources"} autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg" role="group" aria-label="Priority filter">
          <button type="button" aria-pressed={pri === "all"} onClick={() => setPri("all")}>All</button>
          <button type="button" aria-pressed={pri === "must"} onClick={() => setPri("must")}>Must-do only</button>
        </div>
        <label className="tog"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide done</label>
      </div>
      <div className="subnav" role="tablist">
        {VTABS.map((t) => (
          <button key={t.id} type="button" aria-current={!query && tabValid === t.id ? "page" : undefined} onClick={() => { setQ(""); setVtab(t.id); }}>{t.label}</button>
        ))}
      </div>

      {query ? (
        <div className="vsec">{list(null, "Nothing matches \"" + q + "\". Try a site name or a question type.")}</div>
      ) : (
        <div className="vsec">
          {tabValid === "learn" && (
            <>
              <div className="card"><h3>The section</h3><dl className="kv">{FORMAT.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>
              {TOPICS.map((t) => <Topic key={t.h} t={t} />)}
            </>
          )}
          {tabValid === "read" && <Rotation />}
          {tabValid === "toppers" && <Toppers />}
          {TAB_NOTES[tabValid] && <div className="card read">{TAB_NOTES[tabValid].map((p, i) => <p key={i}>{p}</p>)}
            {tabValid === "vocab" && <p><Link className="go" to="/words">Open your flashcards</Link></p>}</div>}
          {list(tabValid, "Everything here is ticked or filtered out. Switch off Hide done or Must-do only.")}
        </div>
      )}
    </div>
  );
}

export default function Section() {
  const { id } = useParams();
  const sec = SECTION_BY_ID[id as SectionId];
  if (!sec) return <NotFound />;
  return sec.status === "live" ? <Live sec={sec} /> : <Soon sec={sec} />;
}
