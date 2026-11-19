import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../../components/kit";
import { useAiStatus, wordMeaning } from "../../lib/ai";
import { shortDate, todayIso, uid } from "../../lib/date";
import { useInbox } from "../../lib/panel";
import { useStore } from "../../lib/store";

const LINK = "font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary";

/** "Seen in": the sentence the word came from and where, kept short for the review card. */
export function seenIn(sentence: string, from: string): string {
  const s = sentence.length > 240 ? sentence.slice(0, 237).trimEnd() + "…" : sentence;
  return s ? (from ? `“${s}” (${from})` : `“${s}”`) : from;
}

/** Etymonline, for a word's roots: one word opens its page, more than one its search. */
export const etymonline = (w: string) => w.includes(" ")
  ? "https://www.etymonline.com/search?q=" + encodeURIComponent(w)
  : "https://www.etymonline.com/word/" + encodeURIComponent(w.toLowerCase());

/** The word inside its sentence, in bold, so the meaning can be guessed from the context first. */
function inSentence(sentence: string, word: string): ReactNode {
  const i = sentence.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return sentence;
  return <>{sentence.slice(0, i)}<b className="font-semibold text-foreground">{sentence.slice(i, i + word.length)}</b>{sentence.slice(i + word.length)}</>;
}

/**
 * Save a word from the page (F53, D110, D113): the word in its sentence, ways to find what it means there (the small
 * model, cached for everyone who asks about that sentence, and Etymonline for its roots), and at the foot of the panel
 * the student's own meaning and Save. Writing it yourself is what makes it stick; the help sits above, a tap away.
 */
export default function PanelWords() {
  const inbox = useInbox();
  const ai = useAiStatus(true);
  const { state, update } = useStore();
  const item = inbox?.type === "word" ? inbox : null;
  const [meaning, setMeaning] = useState("");
  const [saved, setSaved] = useState(false);
  const [help, setHelp] = useState<{ busy?: boolean; text?: string; error?: string } | null>(null);
  useEffect(() => { setMeaning(""); setSaved(false); setHelp(null); }, [item]);

  if (!item) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-heading font-semibold">Save a word</h1>
        <p className="text-base text-foreground/85">Select a word on the page and click “Add to my words” beside it, or right-click it.</p>
      </div>
    );
  }

  const w = item.word.toLowerCase();
  const had = state.vocab.find((v) => v.w.toLowerCase() === w);
  const from = item.site || item.title;
  const canAsk = ai.on && ai.signedIn && ai.words && item.sentence.length >= 8;
  const save = () => {
    const m = meaning.trim();
    if (!m) return;
    update((st) => { if (!st.vocab.some((v) => v.w.toLowerCase() === w)) st.vocab.push({ id: uid(), w, m, s: seenIn(item.sentence, from), b: 0, due: todayIso() }); });
    setSaved(true);
  };
  const ask = async () => {
    setHelp({ busy: true });
    const r = await wordMeaning({ word: item.word, sentence: item.sentence });
    setHelp(r.ok ? { text: r.data.meaning } : { error: r.message });
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex min-w-0 flex-col gap-1">
        {from && <p className="text-sm text-muted-foreground">From {from}</p>}
        <h1 className="font-serif text-[2rem] leading-tight font-semibold break-words">{item.word}</h1>
      </header>

      {item.sentence && <p className="rounded-lg bg-card px-4 py-3.5 text-reading text-foreground/85">{inSentence(item.sentence, item.word)}</p>}

      {/* Help with the meaning: the AI's reading of this sentence, and the word's roots. */}
      {!saved && !had && (
        <section className="flex flex-col gap-3" aria-label="Find the meaning">
          {help?.text ? (
            <div className="flex flex-col gap-2 rounded-lg bg-muted/60 px-4 py-3.5" role="status">
              <p className="text-sm text-muted-foreground">In this sentence</p>
              <p className="text-lg leading-snug font-medium">{help.text}</p>
              <button type="button" onClick={() => setMeaning(help.text!)} className={`w-fit text-sm ${LINK}`}>Use this as my meaning</button>
            </div>
          ) : canAsk ? (
            <Button variant="secondary" className="w-full" onClick={ask} disabled={help?.busy}>
              <Sparkles data-icon="inline-start" />{help?.busy ? "Finding the meaning…" : "Show the meaning here"}
            </Button>
          ) : null}
          {help?.error && <p className="text-sm text-muted-foreground" role="alert">{help.error}</p>}
          <p className="text-sm text-muted-foreground">
            Its roots: <a href={etymonline(w)} target="_blank" rel="noreferrer noopener" className={LINK}>{w} on Etymonline</a>
          </p>
        </section>
      )}

      {/* The student's own meaning and Save, at the foot of the panel. */}
      <div className="mt-auto flex flex-col gap-3 pt-4">
        {saved ? (
          <div className="flex flex-col gap-2" role="status">
            <p className="text-base font-medium">Saved to Words. It comes up for review today.</p>
            <p className="text-base"><Link to="/words" className={LINK}>Review your words</Link></p>
          </div>
        ) : had ? (
          <div className="flex flex-col gap-2">
            <p className="text-base">Already in your Words{had.due > todayIso() ? `, next due ${shortDate(had.due)}` : ", due now"}.</p>
            {had.m && <p className="text-base text-muted-foreground">Your meaning: {had.m}</p>}
            <p className="text-base"><Link to="/words" className={LINK}>Review your words</Link></p>
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
    </div>
  );
}
