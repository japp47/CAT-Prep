import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../../components/kit";
import { shortDate, todayIso, uid } from "../../lib/date";
import { useInbox } from "../../lib/panel";
import { useStore } from "../../lib/store";

/** "Seen in": the sentence the word came from and where, kept short for the review card. */
export function seenIn(sentence: string, from: string): string {
  const s = sentence.length > 240 ? sentence.slice(0, 237).trimEnd() + "…" : sentence;
  return s ? (from ? `“${s}” (${from})` : `“${s}”`) : from;
}

/** The word inside its sentence, in bold, so the meaning can be guessed from the context first. */
function inSentence(sentence: string, word: string): ReactNode {
  const i = sentence.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return sentence;
  return <>{sentence.slice(0, i)}<b className="font-semibold text-foreground">{sentence.slice(i, i + word.length)}</b>{sentence.slice(i + word.length)}</>;
}

/**
 * Save a word from the page (F53, D110): right-click a word, "Add to my words". The word, its sentence and a meaning
 * in the student's own words go to Words for spaced review, as a word saved from a passage does. No AI: a meaning is
 * the same for every student, and writing it yourself is what makes it stick.
 */
export default function PanelWords() {
  const inbox = useInbox();
  const { state, update } = useStore();
  const item = inbox?.type === "word" ? inbox : null;
  const [meaning, setMeaning] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setMeaning(""); setSaved(false); }, [item]);

  if (!item) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-heading font-semibold">Save a word</h1>
        <p className="text-base text-foreground/85">Select a word on the page, right-click it and choose “Add to my words”.</p>
      </div>
    );
  }

  const w = item.word.toLowerCase();
  const had = state.vocab.find((v) => v.w.toLowerCase() === w);
  const from = item.site || item.title;
  const save = () => {
    const m = meaning.trim();
    if (!m) return;
    update((st) => { if (!st.vocab.some((v) => v.w.toLowerCase() === w)) st.vocab.push({ id: uid(), w, m, s: seenIn(item.sentence, from), b: 0, due: todayIso() }); });
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex min-w-0 flex-col gap-1">
        {from && <p className="text-sm text-muted-foreground">From {from}</p>}
        <h1 className="font-serif text-[2rem] leading-tight font-semibold break-words">{w}</h1>
      </header>

      {item.sentence && <p className="rounded-lg bg-card px-4 py-3.5 text-reading text-foreground/85">{inSentence(item.sentence, item.word)}</p>}

      {saved ? (
        <div className="flex flex-col gap-2" role="status">
          <p className="text-base font-medium">Saved to Words. It comes up for review today.</p>
          <p className="text-base"><Link to="/words" className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Review your words</Link></p>
        </div>
      ) : had ? (
        <div className="flex flex-col gap-2">
          <p className="text-base">Already in your Words{had.due > todayIso() ? `, next due ${shortDate(had.due)}` : ", due now"}.</p>
          {had.m && <p className="text-base text-muted-foreground">Your meaning: {had.m}</p>}
          <p className="text-base"><Link to="/words" className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Review your words</Link></p>
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save(); }} autoComplete="off">
          <Field label="Meaning, in your own words" hint="Guess it from the sentence first; it sticks better than a copied definition.">
            <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} maxLength={200} autoFocus className="bg-card text-base" placeholder="What it means here" />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={!meaning.trim()}>Save to Words</Button>
        </form>
      )}
    </div>
  );
}
