import { useStore } from "../lib/store";
import type { Category, Resource } from "../sections/types";
import { Ext } from "./Links";

const PRI = { must: ["Must-do", "t-must"], good: ["Good", "t-good"], opt: ["Optional", "t-opt"] } as const;

function Row({ x }: { x: Resource }) {
  const { state, update } = useStore();
  const done = !!state.ticks[x.id];
  const [label, cls] = PRI[x.p];
  const go = x.find ? "Find" : "Open";
  return (
    <li className={"res" + (done ? " done" : "")}>
      <input type="checkbox" checked={done} aria-label={"Done: " + x.n}
        onChange={(e) => update((st) => { if (e.target.checked) st.ticks[x.id] = 1; else delete st.ticks[x.id]; })} />
      <div className="res-main">
        <div className="res-top"><Ext className="res-name" href={x.u}>{x.n}</Ext><span className={"tag " + cls}>{label}</span></div>
        <p className="res-why">{x.w}</p>
        <p className="res-meta">{x.t}</p>
        {x.flag && <p className="res-flag">This link was not opened during research. Check it once.</p>}
      </div>
      <div className="res-side">
        <a className="go" href={x.u} target="_blank" rel="noopener noreferrer" aria-label={go + " " + x.n}>{go} ↗</a>
        {x.alt && <Ext className="go" href={x.alt.u}>{x.alt.l} ↗</Ext>}
      </div>
    </li>
  );
}

export function CategoryBlock({ cat, items, all }: { cat: Category; items: Resource[]; all: Resource[] }) {
  const { state } = useStore();
  const inCat = all.filter((r) => r.c === cat.id);
  const done = inCat.filter((r) => state.ticks[r.id]).length;
  return (
    <section className="cat">
      <div className="cat-h"><h3>{cat.n}</h3><span className="cnt">{done} of {inCat.length} done</span></div>
      {cat.note && <p className="cat-note">{cat.note}</p>}
      <ul className="res-list">{items.map((x) => <Row key={x.id} x={x} />)}</ul>
    </section>
  );
}
