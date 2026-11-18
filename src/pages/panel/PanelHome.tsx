import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiStatus } from "../../lib/ai";
import { todayIso } from "../../lib/date";
import { useStore } from "../../lib/store";
import { signInUrl } from "../../lib/sync/runner";
import { articleLine } from "../../practice/articleSet";
import { rcOfDay } from "../../practice/daily";
import { dueWords } from "../Words";

const BASE = import.meta.env.BASE_URL;
const KEY = "rounded-md bg-background px-1.5 py-0.5 font-sans text-sm font-medium";
const LINK = "font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary";

/**
 * The panel before an article is read (F53, D111): guide first, then the student's own things. A student with no
 * article sets yet gets the whole panel as a short guide, with a drawing of what to do on the page; a returning one
 * gets a line on how to start, then recent sets, words due, sets left today and today's RC. Sign-in, when missing,
 * is the one filled button: nothing can be made without it.
 */
export default function PanelHome() {
  const { state } = useStore();
  const ai = useAiStatus(true);
  const recent = [...state.articles].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const last = (id: string) => { const all = state.rcAttempts.filter((a) => a.set === id); return all[all.length - 1]; };
  const due = dueWords(state.vocab).length;
  const daily = rcOfDay(todayIso());
  const signIn = ai.on && !ai.signedIn;

  const bottom = (
    <div className="mt-auto flex flex-col gap-3 pt-8">
      {signIn && (
        <>
          <Button size="lg" className="w-full" onClick={() => window.open(signInUrl("/extension"), "_blank", "noopener")}>Sign in with Google</Button>
          <p className="text-sm text-muted-foreground">Once, in a tab. Your sets, mistakes and words are saved to your account.</p>
        </>
      )}
      <p className="text-base">Page can't be read? <Link to="/panel/article" className={LINK}>Paste the text instead</Link></p>
    </div>
  );

  if (!recent.length) {
    return (
      <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight">Make an RC set from what you're reading</h1>
          <p className="text-base text-foreground/85">Any essay or editorial becomes four CAT-style questions, answered here while the article stays open beside them.</p>
        </header>
        <Drawing />
        <ol className="flex flex-col gap-4">
          <Step n={1} title="Select a passage">Four or more paragraphs work best.</Step>
          <Step n={2} title="Click “Add to RC set” beside it">Or right-click it. Add more parts the same way. For the whole article, click the 99ile icon or press <kbd className={KEY}>Alt</kbd> <kbd className={KEY}>Shift</kbd> <kbd className={KEY}>R</kbd>.</Step>
          <Step n={3} title="Answer here">The passage stays highlighted on the page, where you read it.</Step>
        </ol>
        {bottom}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col gap-7">
      <header className="flex flex-col gap-2">
        <h1 className="text-heading font-semibold">Practise what you're reading</h1>
        <p className="text-base text-foreground/85">Select a passage and click “Add to RC set” beside it, or click the 99ile icon for the whole article.</p>
        {ai.signedIn && ai.articlesLeft !== undefined && (
          <p className="text-sm text-muted-foreground">
            {ai.articlesLeft > 0 ? `${ai.articlesLeft} of 2 new sets left today.` : "No new sets left today; more after midnight. An article practised before is free."}
          </p>
        )}
      </header>

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

      <ul className="flex flex-col gap-px overflow-hidden rounded-lg" aria-label="On 99ile">
        <Row to="/words" title={due ? `${due} ${due === 1 ? "word" : "words"} due for review` : "Your words"}>{due ? "Two minutes, from the words you saved." : "Nothing due; saved words come back here."}</Row>
        {daily && <Row to={"/practice/rc/" + daily.id} title="Today's RC on 99ile">{daily.title}</Row>}
      </ul>

      {bottom}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{n}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-base font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{children}</span>
      </div>
    </li>
  );
}

/** A link out to the site; the panel's frame opens it in a tab. */
function Row({ to, title, children }: { to: string; title: string; children: ReactNode }) {
  return (
    <li>
      <a href={BASE + to.replace(/^\//, "")} className="flex items-center gap-3 bg-card px-4 py-3 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-semibold">{title}</span>
          <span className="line-clamp-1 text-sm text-muted-foreground">{children}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </a>
    </li>
  );
}

/**
 * What to do on the page, drawn: lines of an article, three of them selected, and the "Add to RC set" button beside
 * the selection. Bars, not words, so it reads as a picture at any width; hidden from screen readers, which get the
 * steps.
 */
function Drawing() {
  const line = (w: string, sel = false) => <span className={sel ? "block h-2.5 rounded-sm bg-highlight/80" : "block h-2.5 rounded-sm bg-foreground/12"} style={{ width: w }} />;
  return (
    <div aria-hidden className="flex flex-col gap-2.5 rounded-lg bg-card px-5 pt-5 pb-5">
      {line("92%")}{line("86%")}{line("95%", true)}{line("90%", true)}{line("62%", true)}
      <span className="flex w-fit items-center gap-2 self-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
        <img src={BASE + "favicon.svg"} alt="" className="size-4" width={16} height={16} />Add to RC set · 212 words
      </span>
      {line("88%")}{line("70%")}
    </div>
  );
}
