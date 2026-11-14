import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { articleJob } from "../lib/ai";
import { readPending, setJobState, setPending } from "../lib/articleJobs";
import { todayIso } from "../lib/date";
import { useStore } from "../lib/store";
import { saveArticleText } from "../practice/articleSet";
import { words } from "../practice/types";

const ARTICLE_PAGE = "/practice/article";
const UNTITLED = "Your article";

/**
 * Watches the article set being made, on any page (F34). When it is ready it is saved; on the article page the
 * student goes straight to it, elsewhere a message says it is ready with a Start button, and a tab in the background
 * shows "(1) Ready" in its title until it is looked at. Loaded only while a set is being made.
 */
export default function ArticleWatcher() {
  const { update } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const where = useRef(loc.pathname);
  where.current = loc.pathname;

  useEffect(() => {
    let live = true;
    const done = (id: string, title: string) => {
      setPending(null);
      setJobState(null);
      if (where.current === ARTICLE_PAGE) { nav(ARTICLE_PAGE + "/" + encodeURIComponent(id)); return; }
      toast(title === UNTITLED ? "Your RC is ready." : `Your RC from "${title}" is ready.`, { duration: 20_000, action: { label: "Start", onClick: () => nav(ARTICLE_PAGE + "/" + encodeURIComponent(id)) } });
      if (document.hidden) markTab();
    };
    const tick = async () => {
      const p = readPending();
      if (!live || !p) return;
      const r = await articleJob(p.job);
      if (!live) return;
      if (!r.ok) {
        // A job that is not there any more (a different account, or cleared): stop waiting for it.
        if (r.status === 404) { setPending(null); setJobState({ phase: "failed", msg: "That set could not be found. Your article is still here; try again." }); return; }
        setTimeout(tick, 6000);
        return;
      }
      const j = r.data;
      if (j.state === "done" && j.set) {
        const id = "art-" + p.job;
        const title = p.title || j.set.title || UNTITLED;
        update((st) => {
          if (st.articles.some((a) => a.id === id)) return;
          // The student's title, else the one written with the set, else a plain fallback.
          st.articles.push({ id, job: p.job, d: todayIso(), updatedAt: Date.now(), title, origin: p.origin ?? "paste", ...(p.file ? { file: p.file } : {}), ...(p.site ? { site: p.site } : {}), ...(p.link ? { link: p.link } : {}),
            words: p.paras.reduce((t, x) => t + words(x), 0), dropped: j.set!.dropped, questions: j.set!.questions.map((q) => ({ ...q, lines: q.lines ?? [] })), summary: j.set!.summary });
        });
        saveArticleText(id, p.paras);
        done(id, title);
        return;
      }
      if (j.state === "failed") {
        setPending(null);
        setJobState({ phase: "failed", msg: j.error });
        if (where.current !== ARTICLE_PAGE) toast(j.error ?? "The set could not be made.", { duration: 12_000, action: { label: "Open", onClick: () => nav(ARTICLE_PAGE) } });
        return;
      }
      setJobState({ phase: j.state === "running" ? "running" : "queued", stage: j.stage, ahead: j.ahead });
      setTimeout(tick, 3000);
    };
    void tick();
    return () => { live = false; };
  }, [nav, update]);
  return null;
}

/** "(1) Ready" in a background tab's title until the student comes back to it. */
function markTab() {
  const was = document.title;
  document.title = "(1) Ready · " + was;
  const back = () => { if (!document.hidden) { document.title = was; document.removeEventListener("visibilitychange", back); } };
  document.addEventListener("visibilitychange", back);
}
