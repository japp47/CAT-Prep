import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ArticleProgress from "../../components/ArticleProgress";
import { startArticle, useAi } from "../../lib/ai";
import { readPending, setJobState, setPending, useJobState, type Pending } from "../../lib/articleJobs";
import { setInbox, toExtension, useInbox } from "../../lib/panel";
import { PanelFoot } from "./PanelFoot";
import { signInUrl } from "../../lib/sync/runner";
import { chooseWindow, cleanArticle, fitCheck, headline, MAX_WORDS, MIN_WORDS, safeLink, siteOf, toSentences, type ArticleOrigin } from "../../practice/articleText";
import { words } from "../../practice/types";

const MAX_CHARS = 200_000;
const n = (x: number) => x.toLocaleString("en-IN");

/**
 * The article in the extension's side panel (F53, D110): what the extension read from the page, whether it is a good
 * CAT read, which paragraphs will be used, and one button to make the set. The set is made by the site's own job and
 * opens here when it is ready. A page the extension cannot read gets a paste box instead.
 */
export default function PanelArticle() {
  const ai = useAi(true);
  const nav = useNavigate();
  const inbox = useInbox();
  const incoming = inbox?.type === "article" ? inbox : null;
  const [raw, setRaw] = useState(incoming?.text ?? "");
  const [range, setRange] = useState<[number, number] | null>(null);
  const [note, setNote] = useState("");
  const shared = useJobState();
  const [starting, setStarting] = useState<{ msg?: string } | null>(null);
  const job = starting && !starting.msg ? { phase: "starting" as const } : starting?.msg ? { phase: "failed" as const, msg: starting.msg } : shared;

  // A new article from the extension replaces the one shown.
  useEffect(() => { if (incoming) { setRaw(incoming.text); setRange(null); setStarting(null); } }, [incoming]);

  const paras = useMemo(() => cleanArticle(raw), [raw]);
  const win = range && range[1] < paras.length ? range : paras.length ? chooseWindow(paras) : null;
  const chosen = win ? paras.slice(win[0], win[1] + 1) : [];
  const fit = chosen.length ? fitCheck(chosen) : null;
  const whole = paras.reduce((t, p) => t + words(p), 0);
  const ready = !!fit && fit.words >= MIN_WORDS && fit.words <= MAX_WORDS;
  const title = incoming?.title || headline(raw) || "Your article";
  const link = safeLink(incoming?.link ?? "");
  const site = incoming?.site || siteOf(link);
  const origin: ArticleOrigin = incoming ? "extension" : "paste";

  // The passage is read on the article's own page: mark the paragraphs in use there, again when they change.
  const used = incoming ? chosen.join("\n\n") : "";
  useEffect(() => { if (used) toExtension({ type: "mark", paras: used.split("\n\n") }); }, [used]);

  const shift = (d: number) => {
    if (!win) return;
    const a = win[0] + d, b = win[1] + d;
    if (a >= 0 && b < paras.length) setRange([a, b]);
  };
  const paste = async () => {
    try { const t = (await navigator.clipboard.readText()).slice(0, MAX_CHARS); if (t.trim()) { setRaw(t); setRange(null); setNote(""); } else setNote("The clipboard is empty. Copy the article first."); }
    catch { setNote("The browser did not allow reading the clipboard. Click the box below and paste with Ctrl+V."); }
  };
  // Drop the parts gathered on the page (and their marks); the panel waits for a new selection.
  const startOver = () => { toExtension({ type: "clear-parts" }); setInbox(null); nav("/panel"); };

  const make = async () => {
    if (!fit || !win) return;
    setStarting({});
    setJobState(null);
    const r = await startArticle({ title: incoming?.title ?? headline(raw), site, link, paras: toSentences(chosen) });
    if (!r.ok) { setStarting({ msg: r.message }); return; }
    const p: Pending = { job: r.data.job, title: incoming?.title ?? headline(raw), site, link, paras: chosen, at: Date.now(), origin };
    setStarting(null);
    setPending(p);
    // The set is made from these parts: the next selection starts a new passage.
    if (incoming?.selection) toExtension({ type: "clear-parts", keepMarks: true });
  };

  if (job && job.phase !== "failed") {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">Making a set from</p>
          <h1 className="line-clamp-2 text-heading leading-snug font-semibold break-words">{readPending()?.title || title}</h1>
        </header>
        <ArticleProgress job={job} note="Keep reading. The set opens here when it is ready." />
      </div>
    );
  }

  // Nothing read yet: the page could not be read, or the panel was opened without an article.
  if (!paras.length) {
    return (
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-2">
          <h1 className="text-heading font-semibold">{inbox?.type === "unreadable" ? "This page can't be read" : "Paste an article"}</h1>
          <p className="text-base text-foreground/85">
            {inbox?.type === "unreadable"
              ? "Chrome keeps its own pages, PDFs and Google Docs out of reach of extensions. Copy the text there and paste it here."
              : "Copy an essay or editorial and paste it here, or open one and click the 99ile icon."}
          </p>
        </header>
        <Button variant="secondary" onClick={paste} className="w-fit"><ClipboardPaste data-icon="inline-start" /> Paste</Button>
        <Textarea value={raw} onChange={(e) => { setRaw(e.target.value.slice(0, MAX_CHARS)); setRange(null); }} rows={8} aria-label="Article text"
          className="field-sizing-fixed h-48 resize-y bg-card text-base leading-relaxed" placeholder="Paste the article here." />
        {note && <p className="text-sm text-muted-foreground" role="status">{note}</p>}
      </div>
    );
  }

  const wholePage = !!win && win[0] === 0 && win[1] === paras.length - 1;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex min-w-0 flex-col gap-1.5">
        <p className="text-sm text-muted-foreground">{[site, incoming?.parts && incoming.parts > 1 ? `${incoming.parts} parts, ${n(whole)} words` : `${n(whole)} words${incoming?.selection ? " selected" : ""}`].filter(Boolean).join(", ")}</p>
        <h1 className="line-clamp-3 text-heading leading-snug font-semibold break-words">{title}</h1>
      </header>

      {fit && win && (
        <section className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4" aria-label="Is this a good CAT read?">
          {fit.verdict === "good" ? (
            <div className="flex flex-col gap-1">
              <p className="text-base"><mark className="hl font-semibold text-foreground">A good CAT read</mark></p>
              <p className="text-base">It argues a point. About {fit.minutes} minutes at CAT pace.</p>
            </div>
          ) : <p className="text-base">{fit.line}</p>}
          {incoming?.selection && (fit.verdict === "short"
            ? <p className="text-sm text-muted-foreground">Select more and add it: parts add up to one passage. Or click the 99ile icon with nothing selected to use the whole article.</p>
            : <p className="text-sm text-muted-foreground">Select more to add it to this passage, or make the set now.</p>)}
          {incoming?.selection && (
            <button type="button" onClick={startOver}
              className="w-fit text-sm font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              Start over
            </button>
          )}
          {!wholePage && (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-sm text-muted-foreground">Paragraphs {win[0] + 1} to {win[1] + 1} of {paras.length}, {n(fit.words)} words</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => shift(-1)} disabled={win[0] === 0}>Earlier</Button>
                <Button variant="ghost" size="sm" onClick={() => shift(1)} disabled={win[1] >= paras.length - 1}>Later</Button>
              </div>
            </div>
          )}
          {incoming && <p className="text-sm text-muted-foreground">The passage is highlighted on the page. Read it there; the questions come here.</p>}
        </section>
      )}

      <PanelFoot>
        {job?.phase === "failed" && <p className="text-base" role="alert">{job.msg}</p>}
        {ai === "ask" ? (
          <>
            <Button size="lg" className="w-full" onClick={make} disabled={!ready}>Make my set</Button>
            <p className="text-sm text-muted-foreground">Two new sets a day. An article practised before by anyone is ready at once and free.</p>
          </>
        ) : ai === "signin" ? (
          <>
            <Button size="lg" className="w-full" onClick={() => window.open(signInUrl("/extension"), "_blank", "noopener")}>Sign in with Google</Button>
            <p className="text-sm text-muted-foreground">Sign-in opens in a tab. Your sets, mistakes and words are saved to your account, so you can review them on your phone too.</p>
          </>
        ) : (
          <p className="text-base text-muted-foreground">Article sets are not switched on yet.</p>
        )}
        {incoming && <p className="text-sm text-muted-foreground">Only the highlighted paragraphs are sent, to make your set. They stay private.</p>}
      </PanelFoot>
    </div>
  );
}
