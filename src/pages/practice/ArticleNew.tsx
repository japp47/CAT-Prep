import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardPaste, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Field, Page, PageHeader, Section } from "../../components/kit";
import { NativeSelect } from "../../components/Select";
import { articleJob, startArticle, useAi } from "../../lib/ai";
import { todayIso } from "../../lib/date";
import { startSignIn } from "../../lib/sync/runner";
import { useStore } from "../../lib/store";
import { articleLine, saveArticleText } from "../../practice/articleSet";
import { chooseWindow, cleanArticle, fitCheck, headline, MAX_WORDS, MIN_WORDS, safeLink, siteOf, toSentences, type ArticleOrigin } from "../../practice/articleText";
import { words } from "../../practice/types";

/** Limits before anything is read: a 10 MB file, and 200,000 characters of text (a long article is about 10,000). */
const MAX_FILE = 10 * 1048576, MAX_CHARS = 200_000;

/** A job still being made, kept across a reload so the student can leave the page (D104). */
const PENDING = "cat-prep-article-pending";
interface Pending { job: string; title: string; site: string; link: string; paras: string[]; at: number; origin: ArticleOrigin; file?: string }
const readPending = (): Pending | null => { try { return JSON.parse(localStorage.getItem(PENDING) ?? "null") as Pending | null; } catch { return null; } };
const writePending = (p: Pending | null) => { try { if (p) localStorage.setItem(PENDING, JSON.stringify(p)); else localStorage.removeItem(PENDING); } catch { /* the job still runs */ } };

/**
 * Practise an article (F34, D104, D107; docs/design/article-to-rc.md): paste or upload an article, see whether it is
 * a good CAT read and which paragraphs will be used, then make a CAT-style set, checked by a second AI before it is
 * shown. The extension (F53) will open this page with the article already in.
 */
export default function ArticleNew() {
  const ai = useAi();
  const nav = useNavigate();
  const { state, update } = useStore();
  const [raw, setRaw] = useState("");
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [range, setRange] = useState<[number, number] | null>(null);
  const [origin, setOrigin] = useState<{ kind: ArticleOrigin; file?: string }>({ kind: "paste" });
  const [job, setJob] = useState<{ phase: "starting" | "queued" | "running" | "failed"; msg?: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const paras = useMemo(() => cleanArticle(raw), [raw]);
  const win = range && range[1] < paras.length ? range : paras.length ? chooseWindow(paras) : null;
  const chosen = win ? paras.slice(win[0], win[1] + 1) : [];
  const fit = chosen.length ? fitCheck(chosen) : null;
  const whole = paras.reduce((t, p) => t + words(p), 0);
  const ready = !!fit && fit.words >= MIN_WORDS && fit.words <= MAX_WORDS;

  // A set being made when the page was left: carry on waiting for it.
  useEffect(() => { const p = readPending(); if (p && Date.now() - p.at < 30 * 60_000) { setRaw(p.paras.join("\n\n")); setTitle(p.title); setSite(p.site); setLink(p.link); poll(p); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function poll(p: Pending) {
    setJob({ phase: "queued" });
    for (let i = 0; i < 200; i++) {
      const r = await articleJob(p.job);
      if (!r.ok) { setJob({ phase: "failed", msg: r.message }); return; }
      const j = r.data;
      if (j.state === "done" && j.set) {
        const id = "art-" + p.job;
        update((st) => {
          if (st.articles.some((a) => a.id === id)) return;
          // The student's title, else the one written with the set, else a plain fallback.
          st.articles.push({ id, job: p.job, d: todayIso(), updatedAt: Date.now(), title: p.title || j.set!.title || "Your article", origin: p.origin ?? "paste", ...(p.file ? { file: p.file } : {}), ...(p.site ? { site: p.site } : {}), ...(p.link ? { link: p.link } : {}),
            words: p.paras.reduce((t, x) => t + words(x), 0), dropped: j.set!.dropped, questions: j.set!.questions, summary: j.set!.summary });
        });
        saveArticleText(id, p.paras);
        writePending(null);
        nav("/practice/article/" + encodeURIComponent(id));
        return;
      }
      if (j.state === "failed") { writePending(null); setJob({ phase: "failed", msg: j.error }); return; }
      setJob({ phase: j.state === "running" ? "running" : "queued" });
      await new Promise((res) => setTimeout(res, 3000));
    }
    setJob({ phase: "failed", msg: "This is taking too long. Your article is still here; try again in a few minutes." });
  }

  const make = async () => {
    if (!fit || !win) return;
    setJob({ phase: "starting" });
    const web = safeLink(link), from = site.trim() || siteOf(web);
    const r = await startArticle({ title: title.trim(), site: from, link: web, paras: toSentences(chosen) });
    if (!r.ok) { setJob({ phase: "failed", msg: r.message }); return; }
    const p: Pending = { job: r.data.job, title: title.trim(), site: from, link: web, paras: chosen, at: Date.now(), origin: origin.kind, ...(origin.file ? { file: origin.file } : {}) };
    writePending(p);
    void poll(p);
  };

  const mine = [...state.articles].sort((a, b) => b.updatedAt - a.updatedAt);
  const tried = (id: string) => { const all = state.rcAttempts.filter((a) => a.set === id); return all[all.length - 1]; };
  const busy = job && job.phase !== "failed";

  return (
    <Page width="read">
      <PageHeader title="Practise an article" back={{ to: "/varc/practice", label: "VARC practice" }}>
        Paste an essay or editorial you are reading. 99ile turns it into a CAT-style RC set: four questions with close options, each answered by a second AI before you see it, so a doubtful question is left out.
      </PageHeader>

      {busy ? (
        <section className="flex flex-col gap-3 rounded-lg bg-card p-5" aria-live="polite">
          <h2 className="text-lg font-semibold">{job.phase === "running" ? "Writing and checking your questions" : "Your set is in the queue"}</h2>
          <p className="text-base text-muted-foreground">
            {job.phase === "running" ? "One AI writes four questions; a second answers them without the key, and any it gets wrong are left out. About half a minute."
              : "The free AI takes a few requests a minute, so sets are made one at a time. It starts shortly."}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-full animate-pulse rounded-full bg-primary/60 motion-reduce:animate-none" /></div>
          <p className="text-sm text-muted-foreground">You can leave this page: the set waits here for 30 minutes.</p>
        </section>
      ) : (
        <>
          <Section title="Your article">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={paste}><ClipboardPaste data-icon="inline-start" /> Paste</Button>
              <Button variant="secondary" onClick={() => file.current?.click()}><FileUp data-icon="inline-start" /> Upload .txt or .pdf</Button>
              <input ref={file} type="file" accept=".txt,.pdf,text/plain,application/pdf" className="sr-only" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            <Textarea value={raw} onChange={(e) => { const t = e.target.value.slice(0, MAX_CHARS); if (!raw.trim() && t.trim()) take(t, { kind: "paste" }); else { setRaw(t); setRange(null); } }} rows={8} aria-label="Article text"
              className="field-sizing-fixed h-48 max-h-64 min-h-48 resize-y overflow-y-auto bg-card text-base leading-relaxed sm:h-56" placeholder="Paste the article here." />
            <p className="text-sm text-muted-foreground">{note || "On a phone: open the article in Reader view, Select all, Copy, then Paste. Ads, links and captions are removed for you."}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Title (optional)"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="bg-card text-base" /></Field>
              <Field label="Source (optional)"><Input value={site} onChange={(e) => setSite(e.target.value)} maxLength={100} placeholder="Aeon, The Hindu…" className="bg-card text-base" /></Field>
              <Field label="Link (optional)"><Input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} inputMode="url" className="bg-card text-base" /></Field>
            </div>
            <p className="text-sm text-muted-foreground">
              What happens to your article: a file is read on your device and never uploaded. Only the paragraphs you choose are sent. They are kept privately for 90 days so you can review the set on any of your devices; no one else can read them. The set, its title, source and date stay in your history.
            </p>
          </Section>

          {fit && win && (
            <Section title="What will be used">
              <div className="flex flex-col gap-3 rounded-lg bg-card p-5">
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

          <div className="flex flex-col gap-2">
            {job?.phase === "failed" && <p className="text-base" role="alert">{job.msg}</p>}
            {ai === "ask" ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button onClick={make} disabled={!ready}>Make my set</Button>
                <span className="text-sm text-muted-foreground">Two new sets a day. An article practised before by anyone is ready at once and free.</span>
              </div>
            ) : ai === "signin" ? (
              <p className="text-base"><button type="button" onClick={() => startSignIn("/practice/article")} className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Sign in with Google</button> to make a set from your article.</p>
            ) : (
              <p className="text-base text-muted-foreground">Article sets are not switched on yet. Meanwhile, the <Link to="/practice/library" className="font-medium text-primary underline underline-offset-4">RC library</Link> has 55 sets.</p>
            )}
          </div>
        </>
      )}

      {mine.length > 0 && (
        <Section title="Your articles">
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

