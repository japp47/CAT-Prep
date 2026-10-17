import { useState, type FormEvent } from "react";
import { addDays, shortDate, todayIso, uid } from "../lib/date";
import { useStore } from "../lib/store";
import type { Word } from "../lib/state";

/** Days until the next review for each box. Box 0 comes back the same day. */
const INTERVALS = [0, 1, 3, 7, 14, 30];

export function dueWords(vocab: Word[], t = todayIso()) {
  return vocab.filter((v) => v.due <= t).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.b - b.b));
}

export default function Words() {
  const { state, update } = useStore();
  const [shown, setShown] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const due = dueWords(state.vocab);
  const card = due.find((v) => v.id !== last) ?? due[0];

  const answer = (knew: boolean) => {
    if (!card) return;
    const t = todayIso();
    update((st) => {
      const w = st.vocab.find((x) => x.id === card.id);
      if (!w) return;
      if (knew) { w.b = Math.min(w.b + 1, 5); w.due = addDays(t, INTERVALS[w.b]); } else { w.b = 0; w.due = t; }
    });
    setLast(card.id); setShown(false);
  };
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    const w = String(fd.get("w") ?? "").trim(), m = String(fd.get("m") ?? "").trim(), s = String(fd.get("s") ?? "").trim();
    if (!w || !m) return;
    update((st) => { st.vocab.push({ id: uid(), w, m, s, b: 0, due: todayIso() }); });
    f.reset();
  };
  const next = state.vocab.reduce((m, v) => (v.due < m ? v.due : m), "9999-99-99");

  return (
    <div className="page">
      <div className="view-head">
        <h1>Words</h1>
        <p>Add words you meet in passages. Cards you miss come back the same day. Cards you know come back after 1, 3, 7, 14 and 30 days.</p>
      </div>
      <div className="card" aria-live="polite">
        {!state.vocab.length ? <div className="empty">No words yet. Add the first one below, from today's reading.</div>
          : !card ? <div className="flash"><div className="w">All caught up</div><p className="muted">The next card is due on {shortDate(next)}.</p></div>
          : (
            <div className="flash">
              <span className="eyebrow">{due.length} due</span>
              <div className="w">{card.w}</div>
              {shown ? (
                <>
                  <p className="m">{card.m}</p>
                  {card.s && <p className="muted small">Seen in {card.s}</p>}
                  <div className="acts"><button type="button" className="btn ghost" onClick={() => answer(false)}>Again</button><button type="button" className="btn" onClick={() => answer(true)}>I knew it</button></div>
                </>
              ) : <div className="acts"><button type="button" className="btn" onClick={() => setShown(true)}>Show meaning</button></div>}
            </div>
          )}
      </div>
      <form className="card" onSubmit={add} autoComplete="off">
        <div className="form">
          <label className="f">Word<input name="w" type="text" required placeholder="ostensibly" /></label>
          <label className="f">Meaning<input name="m" type="text" required placeholder="apparently, but not actually" /></label>
          <label className="f">Seen in<input name="s" type="text" placeholder="Aeon essay on complex systems" /></label>
          <button className="btn" type="submit">Add word</button>
        </div>
      </form>
      <div className="card">
        <h3>{state.vocab.length ? "Your words (" + state.vocab.length + ")" : "Your words"}</h3>
        <ul className="log">
          {state.vocab.length ? state.vocab.slice().reverse().map((v) => (
            <li key={v.id}>
              <div>
                <div className="l1"><b>{v.w}</b><span className="pips" title={"Box " + v.b + " of 5"}>{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < v.b ? "on" : ""} />)}</span></div>
                <p className="tx">{v.m}{v.s ? " · " + v.s : ""}</p>
              </div>
              <button type="button" className="x" aria-label={"Delete " + v.w} onClick={() => update((st) => { st.vocab = st.vocab.filter((x) => x.id !== v.id); })}>Delete</button>
            </li>
          )) : <li style={{ display: "block" }}><div className="empty">Your word list shows here.</div></li>}
        </ul>
      </div>
    </div>
  );
}
