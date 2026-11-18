import { Link } from "react-router-dom";
import { MousePointerClick, TextSelect, Keyboard } from "lucide-react";
import { useStore } from "../../lib/store";
import { articleLine } from "../../practice/articleSet";
import { dueWords } from "../Words";

const WAYS = [
  { Icon: MousePointerClick, title: "Click the 99ile icon", body: "Uses the text you selected, or the whole article when nothing is." },
  { Icon: TextSelect, title: "Right-click a selection", body: "Choose “Make an RC set from this”, or “Add to my words” for a word." },
  { Icon: Keyboard, title: <>Press <kbd className="rounded-md bg-background px-1.5 py-0.5 font-sans text-sm font-medium">Alt</kbd> <kbd className="rounded-md bg-background px-1.5 py-0.5 font-sans text-sm font-medium">Shift</kbd> <kbd className="rounded-md bg-background px-1.5 py-0.5 font-sans text-sm font-medium">R</kbd></>, body: "The same as the icon, from the keyboard." },
];

/** The panel before anything is read (F53, D110): the ways to start, the student's recent sets and words due. */
export default function PanelHome() {
  const { state } = useStore();
  const recent = [...state.articles].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const last = (id: string) => { const all = state.rcAttempts.filter((a) => a.set === id); return all[all.length - 1]; };
  const due = dueWords(state.vocab).length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-heading font-semibold">Practise what you're reading</h1>
        <p className="text-base text-foreground/85">Open an essay or editorial, then turn it into a CAT-style RC set right here, beside it.</p>
      </header>

      <ul className="flex flex-col gap-px overflow-hidden rounded-lg" aria-label="Ways to start">
        {WAYS.map(({ Icon, title, body }, i) => (
          <li key={i} className="flex gap-3 bg-card px-4 py-3.5">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-base font-semibold">{title}</span>
              <span className="text-sm text-muted-foreground">{body}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-base">Page can't be read? <Link to="/panel/article" className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Paste the text instead</Link></p>

      {recent.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="recent-h">
          <h2 id="recent-h" className="text-base font-semibold">Your recent sets</h2>
          <ul className="flex flex-col gap-px overflow-hidden rounded-lg">
            {recent.map((a) => (
              <li key={a.id}>
                <Link to={"/panel/article/" + encodeURIComponent(a.id)} className="flex flex-col gap-0.5 bg-card px-4 py-3 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <span className="line-clamp-2 text-base font-semibold">{a.title}</span>
                  <span className="text-sm text-muted-foreground">{articleLine(a, last(a.id)?.c)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {due > 0 && (
        <p className="text-base">{due} {due === 1 ? "word is" : "words are"} due for review. <Link to="/words" className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Review them</Link></p>
      )}
    </div>
  );
}
