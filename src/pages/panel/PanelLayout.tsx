import { lazy, Suspense, useEffect, type MouseEvent } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTheme } from "../../components/Layout";
import { API_ENABLED } from "../../lib/api";
import { useHasPending } from "../../lib/articleJobs";
import { EXTENSION_ORIGINS, PanelContext, readMessage, setInbox, toExtension } from "../../lib/panel";

const Toaster = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
const ArticleWatcher = lazy(() => import("../../components/ArticleWatcher"));
const Background = lazy(() => import("../../components/Background"));

const BASE = import.meta.env.BASE_URL;

/** Why "Show me in the article" could not mark the line, in the student's terms. */
const HIGHLIGHT_FAILED: Record<string, string> = {
  missing: "That line was not found on this page. Is the article's tab the one beside the panel?",
  access: "99ile can't reach this page now. Turn on “Add to RC set as you select” below, or click the 99ile icon on the article, then try again.",
  tab: "Open the article's tab beside the panel, then try again.",
};

/**
 * The frame of the extension's side panel (F53, D110): no sidebar and no bottom bar, a slim header, and the same
 * store, sync and article watcher as the site. Links to the rest of 99ile open in a new tab, so the panel stays beside
 * the article.
 */
export default function PanelLayout() {
  useTheme();
  const nav = useNavigate();
  const making = useHasPending();

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!EXTENSION_ORIGINS.includes(e.origin)) return;
      const d = e.data as { src?: string; type?: string; ok?: boolean; reason?: string } | null;
      if (d?.src === "99ile-ext" && d.type === "highlighted") {
        if (!d.ok) toast(HIGHLIGHT_FAILED[d.reason ?? "missing"] ?? HIGHLIGHT_FAILED.missing, { duration: 8000 });
        return;
      }
      const m = readMessage(e.origin, e.data);
      if (!m) return;
      setInbox(m);
      nav(m.type === "word" ? "/panel/words" : "/panel/article");
    };
    window.addEventListener("message", onMessage);
    toExtension({ type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, [nav]);

  // Any link out of the panel (a guide, Words, the error log) opens in a tab instead of replacing the panel.
  const outward = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a.target || e.defaultPrevented) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname.startsWith(BASE + "panel")) return;
    e.preventDefault();
    e.stopPropagation();
    window.open(u.href, "_blank", "noopener");
  };

  return (
    <PanelContext.Provider value={true}>
      <div className="min-h-dvh bg-background" onClickCapture={outward}>
        <header className="flex h-14 items-center justify-between gap-3 px-gutter">
          <Link to="/panel" className="flex items-center gap-2 rounded-md text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="99ile panel home">
            <img src={BASE + "favicon.svg"} alt="" className="size-8 shrink-0" width={32} height={32} />
            <span className="text-lg leading-none font-bold tracking-tight">99ile</span>
          </Link>
          <a href={BASE} className="grid size-10 place-items-center rounded-md text-foreground/70 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Open 99ile in a new tab" title="Open 99ile in a new tab">
            <ExternalLink className="size-5" aria-hidden />
          </a>
        </header>
        <main id="main" className="min-w-0 px-gutter pt-2 pb-10">
          <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40 w-full" /></div>}><Outlet /></Suspense>
        </main>
        <Suspense fallback={null}><Background /></Suspense>
        <Suspense fallback={null}><Toaster /></Suspense>
        {API_ENABLED && making && <Suspense fallback={null}><ArticleWatcher /></Suspense>}
      </div>
    </PanelContext.Provider>
  );
}
