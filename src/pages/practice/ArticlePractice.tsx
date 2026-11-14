import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Page, PageHeader } from "../../components/kit";
import { articleTextFrom } from "../../lib/ai";
import { API_ENABLED } from "../../lib/api";
import { useStore } from "../../lib/store";
import { articleRcSet, articleText, saveArticleText } from "../../practice/articleSet";
import { safeLink } from "../../practice/articleText";
import NotFound from "../NotFound";
import { Player } from "./RcPlayer";

/**
 * A student's article set (F34) in the normal RC player: timer, Prove it, summary and review, saved like any RC
 * attempt. The text comes from this device's store, else from private storage (D107) for the student who made it.
 */
export default function ArticlePractice() {
  const { id = "" } = useParams();
  const [sp] = useSearchParams();
  const { state } = useStore();
  const entry = state.articles.find((a) => a.id === id);
  const [paras, setParas] = useState<string[] | null | "loading">(() => articleText(id) ?? (API_ENABLED && entry ? "loading" : null));
  // Not on this device: fetch it once from private storage and keep it here for review.
  useEffect(() => {
    if (paras !== "loading" || !entry) return;
    let live = true;
    void articleTextFrom(entry.job).then((r) => {
      if (!live) return;
      if (r.ok && r.data.paras.length) { saveArticleText(id, r.data.paras); setParas(r.data.paras); } else setParas(null);
    });
    return () => { live = false; };
  }, [paras, entry, id]);
  if (!entry) return <NotFound />;
  const link = safeLink(entry.link ?? "");
  if (paras === "loading") return <Page width="read"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-96 w-full" /></Page>;
  if (!paras) {
    return (
      <Page width="read">
        <PageHeader title={entry.title} back={{ to: "/practice/article", label: "Your articles" }}>
          The article's text is not on this device, and it is not kept any more (texts are kept 90 days). Your questions, score and mistakes are still in your history{link ? <>, or read it at <a href={link} target="_blank" rel="noreferrer noopener" className="font-medium text-primary underline underline-offset-4">the source</a></> : null}.
        </PageHeader>
        <p className="text-base"><Link to="/practice/article" className="font-medium text-primary underline underline-offset-4">Practise another article</Link></p>
      </Page>
    );
  }
  const set = articleRcSet(entry, paras);
  const review = sp.get("review");
  return <Player key={set.id + ":" + (review ?? "") + ":" + (sp.get("n") ?? "")} set={set} reviewId={review} />;
}
