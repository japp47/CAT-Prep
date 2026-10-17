import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Field, LogList, LogRow, Meta, Page, PageHeader, Section, useDeleteWithUndo } from "../components/kit";
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
  const remove = useDeleteWithUndo();
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
    <Page>
      <PageHeader title="Words">Add words you meet in passages. Cards you miss come back the same day. Cards you know come back after 1, 3, 7, 14 and 30 days.</PageHeader>

      <div className="flex min-h-64 flex-col items-center justify-center gap-5 rounded-lg bg-card px-6 py-10 text-center" aria-live="polite">
        {!state.vocab.length ? <p className="text-base text-muted-foreground">No words yet. Add the first one below, from today's reading.</p>
          : !card ? <><p className="font-serif text-title font-semibold">All caught up</p><p className="text-base text-muted-foreground">The next card is due on {shortDate(next)}.</p></>
          : (
            <>
              <Meta>{due.length} due</Meta>
              <p className="font-serif text-[clamp(2rem,1.5rem+2vw,2.75rem)] leading-tight font-semibold break-words">{card.w}</p>
              {shown ? (
                <>
                  <p className="measure text-lg">{card.m}</p>
                  {card.s && <Meta>Seen in {card.s}</Meta>}
                  <div className="flex flex-wrap justify-center gap-3"><Button variant="secondary" onClick={() => answer(false)}>Again</Button><Button onClick={() => answer(true)}>I knew it</Button></div>
                </>
              ) : <Button onClick={() => setShown(true)}>Show meaning</Button>}
            </>
          )}
      </div>

      <Section title="Add a word">
        <form className="grid items-end gap-4 rounded-lg bg-card p-5 sm:grid-cols-[1fr_1.5fr_1.5fr_auto] sm:p-6" onSubmit={add} autoComplete="off">
          <Field label="Word"><Input name="w" required placeholder="ostensibly" /></Field>
          <Field label="Meaning"><Input name="m" required placeholder="apparently, but not actually" /></Field>
          <Field label="Seen in"><Input name="s" placeholder="Aeon essay on complex systems" /></Field>
          <Button type="submit">Add word</Button>
        </form>
      </Section>

      <Section title={state.vocab.length ? `Your words (${state.vocab.length})` : "Your words"}>
        <LogList empty="Your word list shows here.">
          {state.vocab.slice().reverse().map((v) => (
            <LogRow key={v.id} label={"Delete " + v.w} onDelete={() => remove("vocab", v.id, "“" + v.w + "”")}>
              <span className="flex flex-wrap items-center gap-3">
                <b className="font-serif text-lg font-semibold">{v.w}</b>
                <span className="inline-flex gap-1" role="img" title={`Box ${v.b} of 5`} aria-label={`Box ${v.b} of 5`}>{[0, 1, 2, 3, 4].map((i) => <i key={i} className={cn("size-1.5 rounded-full", i < v.b ? "bg-primary" : "bg-secondary")} />)}</span>
              </span>
              <span className="text-base">{v.m}</span>
              {v.s && <Meta>{v.s}</Meta>}
            </LogRow>
          ))}
        </LogList>
      </Section>
    </Page>
  );
}
