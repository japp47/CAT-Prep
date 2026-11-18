import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardPaste, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import ArticleProgress from "../../components/ArticleProgress";
import { Field, Page, PageHeader, Section } from "../../components/kit";
import { NativeSelect } from "../../components/Select";
import { startArticle, useAi } from "../../lib/ai";
import { readPending, setJobState, setPending, useJobState, type Pending } from "../../lib/articleJobs";
import { startSignIn } from "../../lib/sync/runner";
import { useStore } from "../../lib/store";
import { articleLine } from "../../practice/articleSet";
import { chooseWindow, cleanArticle, fitCheck, headline, MAX_WORDS, MIN_WORDS, safeLink, siteOf, toSentences, type ArticleOrigin } from "../../practice/articleText";
import { words } from "../../practice/types";

/** Limits before anything is read: a 10 MB file, and 200,000 characters of text (a long article is about 10,000). */
const MAX_FILE = 10 * 1048576, MAX_CHARS = 200_000;

/**
 * Practise an article (F34, D104, D107; docs/design/article-to-rc.md): paste or upload an article, see whether it is
 * a good CAT read and which paragraphs will be used, then make a CAT-style set, checked by a second AI before it is
 * shown. The extension (F53) will open this page with the article already in.
 */
export default function ArticleNew() {
  const ai = useAi();
  const { state } = useStore();
  const [raw, setRaw] = useState("");
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [range, setRange] = useState<[number, number] | null>(null);
  const [origin, setOrigin] = useState<{ kind: ArticleOrigin; file?: string }>({ kind: "paste" });
  // Progress lives in lib/articleJobs.ts: the watcher in the site's frame finishes the set on any page (F34).
  const shared = useJobState();
  const [starting, setStarting] = useState<{ msg?: string } | null>(null);
  const job = starting && !starting.msg ? { phase: "starting" as const } : starting?.msg ? { phase: "failed" as const, msg: starting.msg } : shared;
  const file = useRef<HTMLInputElement>(null);

  const paras = useMemo(() => cleanArticle(raw), [raw]);
  const win = range && range[1] < paras.length ? range : paras.length ? chooseWindow(paras) : null;
  const chosen = win ? paras.slice(win[0], win[1] + 1) : [];
  const fit = chosen.length ? fitCheck(chosen) : null;
  const whole = paras.reduce((t, p) => t + words(p), 0);
  const ready = !!fit && fit.words >= MIN_WORDS && fit.words <= MAX_WORDS;

  // A set being made when the page was left: show its article again; the watcher is still waiting for it.
  useEffect(() => { const p = readPending(); if (p) { setRaw(p.paras.join("\n\n")); setTitle(p.title); setSite(p.site); setLink(p.link); } }, []);

  /** New text in: its origin, and a title from its headline (or the file's name) when the student has not typed one. */
  const take = (text: string, from: { kind: ArticleOrigin; file?: string }, fallbackTitle = "") => {
    setRaw(text); setRange(null); setOrigin(from);
    if (!title.trim()) setTitle(headline(text) || fallbackTitle);
  };
  const paste = async () => {
    try { const t = (await navigator.clipboard.readText()).slice(0, MAX_CHARS); if (t.trim()) { take(t, { kind: "paste" }); setNote(""); } else setNote("The clipboard is empty. Copy the article first."); }
    catch { setNote("This browser did not allow reading the clipboard. Long-press the box below and paste."); }
  };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    // Checked before anything is read: a huge file would freeze a phone, and only .txt and .pdf are read at all.
    const pdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!pdf && !(f.type === "text/plain" || f.name.toLowerCase().endsWith(".txt"))) { setNote("Only .txt and .pdf files can be read."); return; }
    if (f.size > MAX_FILE) { setNote(`This file is ${(f.size / 1048576).toFixed(1)} MB; the limit is ${MAX_FILE / 1048576} MB. Copy the article's text instead.`); return; }
    setNote("Reading the file…");
    try {
      const text = (pdf ? await (await import("../../practice/pdfText")).pdfText(f) : await f.text()).slice(0, MAX_CHARS);
      if (!text.trim()) { setNote("No text found. A scanned PDF has only pictures of the page; copy the text instead."); return; }
      take(text, { kind: pdf ? "pdf" : "txt", file: f.name.slice(0, 200) }, f.name.replace(/\.(pdf|txt)$/i, ""));
      setNote(`Read ${f.name}. The file stays on your device and is not uploaded.`);
    } catch { setNote("This file could not be read. Try copying the text instead."); }
  };

  const make = async () => {
    if (!fit || !win) return;
    setStarting({});
    setJobState(null);
    const web = safeLink(link), from = site.trim() || siteOf(web);
    const r = await startArticle({ title: title.trim(), site: from, link: web, paras: toSentences(chosen) });
    if (!r.ok) { setStarting({ msg: r.message }); return; }
    const p: Pending = { job: r.data.job, title: title.trim(), site: from, link: web, paras: chosen, at: Date.now(), origin: origin.kind, ...(origin.file ? { file: origin.file } : {}) };
    setStarting(null);
    setPending(p);
  };

  const mine = [...state.articles].sort((a, b) => b.updatedAt - a.updatedAt);
  const tried = (id: string) => { const all = state.rcAttempts.filter((a) => a.set === id); return all[all.length - 1]; };
  const busy = job && job.phase !== "failed";

  return (
    <Page width="wide">
      <PageHeader title="Practise an article" back={{ to: "/varc/practice", label: "VARC practice" }}>
        Turn an essay or editorial into CAT-style practice: four close questions, checked before they reach you.
      </PageHeader>

      {busy ? (
        <div className="max-w-[760px]"><ArticleProgress job={job} /></div>
      ) : (
        <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]">
          <div className="flex min-w-0 flex-col gap-8">
            <Section title="Your article" className="rounded-lg bg-card p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={paste}><ClipboardPaste data-icon="inline-start" /> Paste</Button>
                <Button variant="secondary" onClick={() => file.current?.click()}><FileUp data-icon="inline-start" /> Upload .txt or .pdf</Button>
                <input ref={file} type="file" accept=".txt,.pdf,text/plain,application/pdf" className="sr-only" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
              <Textarea value={raw} onChange={(e) => { const t = e.target.value.slice(0, MAX_CHARS); if (!raw.trim() && t.trim()) take(t, { kind: "paste" }); else { setRaw(t); setRange(null); } }} rows={8} aria-label="Article text"
                className="field-sizing-fixed h-48 max-h-64 min-h-48 resize-y overflow-y-auto bg-background text-base leading-relaxed sm:h-56" placeholder="Paste the article here." />
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <p className="max-w-prose text-sm text-muted-foreground">{note || "On a phone: open the article in Reader view, select all, copy, then paste. Ads, links and captions are removed for you."}</p>
                {whole > 0 && <span className="shrink-0 text-sm text-muted-foreground">{whole.toLocaleString("en-IN")} words</span>}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Title (optional)"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="bg-background text-base" /></Field>
                <Field label="Source (optional)"><Input value={site} onChange={(e) => setSite(e.target.value)} maxLength={100} placeholder="Aeon, The Hindu…" className="bg-background text-base" /></Field>
                <Field label="Link (optional)"><Input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} inputMode="url" className="bg-background text-base" /></Field>
              </div>
            </Section>

            {fit && win && (
              <Section title="What will be used">
                <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-muted/60 p-5">
                  <p className={cn("text-base", fit.verdict === "good" && "font-medium")}>
                    {fit.verdict === "good" ? <mark className="hl text-foreground">{fit.line}</mark> : fit.line}
                  </p>
                  {paras.length > 1 && (
                    <div className="flex flex-wrap items-end gap-3">
                      <Field label="From paragraph" className="w-36">
                        <NativeSelect value={win[0]} onChange={(e) => { const a = +e.target.value; setRange([a, Math.max(a, win[1])]); }}>
                          {paras.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
                        </NativeSelect>
                      </Field>
                      <Field label="To paragraph" className="w-36">
                        <NativeSelect value={win[1]} onChange={(e) => { const b = +e.target.value; setRange([Math.min(win[0], b), b]); }}>
                          {paras.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
                        </NativeSelect>
                      </Field>
                      <p className="pb-2 text-sm text-muted-foreground">{fit.words} of {whole} words; a CAT passage is 400 to 900.</p>
                    </div>
                  )}
                  <ol className="flex flex-col gap-1.5" start={win[0] + 1}>
                    {chosen.map((p, i) => <li key={i} className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{win[0] + i + 1}.</span> {p.split(/\s+/).slice(0, 14).join(" ")}…</li>)}
                  </ol>
                </div>
              </Section>
            )}

            <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              {job?.phase === "failed" && <p className="text-base" role="alert">{job.msg}</p>}
              {ai === "ask" ? (
                <>
                  <Button onClick={make} disabled={!ready}>Make my set</Button>
                  <span className="text-sm text-muted-foreground">Two new sets a day. An article practised before by anyone is ready at once and free.</span>
                </>
              ) : ai === "signin" ? (
                <p className="text-base"><button type="button" onClick={() => startSignIn("/practice/article")} className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Sign in with Google</button> to make a set from your article.</p>
              ) : (
                <p className="text-base text-muted-foreground">Article sets are not switched on yet. Meanwhile, the <Link to="/practice/library" className="font-medium text-primary underline underline-offset-4">RC library</Link> has 55 sets.</p>
              )}
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <section className="rounded-lg bg-muted/60 p-5 sm:p-6">
              <h2 className="text-heading font-semibold">From article to practice</h2>
              <ol className="mt-5 flex flex-col gap-5">
                <li className="flex gap-3">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-foreground">1</span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">Bring a read</h3>
                    <p className="text-sm text-muted-foreground">Paste an essay or upload a text file or PDF.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-foreground">2</span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">Choose the passage</h3>
                    <p className="text-sm text-muted-foreground">We find a useful stretch of paragraphs; you can adjust it.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-foreground">3</span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">Practise and review</h3>
                    <p className="text-sm text-muted-foreground">A second AI checks the questions before you answer them.</p>
                  </div>
                </li>
              </ol>
            </section>
            {/* Computers only: phones cannot run extensions, and paste is the way there. */}
            <section className="hidden rounded-lg bg-card p-5 sm:p-6 lg:block">
              <h2 className="text-base font-semibold">Reading on a computer?</h2>
              <p className="mt-2 text-sm text-muted-foreground">Skip the copy and paste: the 99ile Chrome extension makes the set from the page you are on, in a panel beside it, with the passage highlighted where you read it.</p>
              <p className="mt-3 text-sm"><Link to="/extension" className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Get the extension</Link></p>
            </section>
            <section className="rounded-lg bg-card p-5 sm:p-6">
              <h2 className="text-base font-semibold">Your text stays private</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A text or PDF file is read on your device and never uploaded. Only the paragraphs you choose are sent; they stay private for 90 days so you can review the set on any device. No one else can read them.
              </p>
            </section>
          </aside>
        </div>
      )}

      {mine.length > 0 && (
        <Section title="Your articles" className="max-w-[760px]">
          <ul className="flex flex-col gap-px overflow-hidden rounded-lg bg-background">
            {mine.map((a) => {
              const last = tried(a.id);
              return (
                <li key={a.id}>
                  <Link to={"/practice/article/" + encodeURIComponent(a.id)} className="flex flex-col gap-0.5 bg-card px-4 py-3.5 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <span className="text-base font-semibold">{a.title}</span>
                    <span className="text-sm text-muted-foreground">{articleLine(a, last?.c)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </Page>
  );
}

