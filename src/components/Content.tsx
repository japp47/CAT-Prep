import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "../lib/store";
import { loadContent, useContent, type Content, type Need } from "../practice/content";
import { seedLrRedo, seedRedo } from "../practice/redo";
import { Page } from "./kit";

/**
 * Renders its children once the practice content it needs has loaded, with a skeleton until then.
 * `need` keeps the download small: one RC set loads only its own file (see practice/content.ts).
 * `inline` drops the page wrapper, for a gate inside a page that is already showing.
 */
export function ContentGate({ children, inline, need = "all" }: { children: (c: Content) => ReactNode; inline?: boolean; need?: Need }) {
  const { content, failed, retry } = useContent(need);
  if (content) return <>{children(content)}</>;
  const body = failed ? (
    <div className="flex flex-col items-start gap-3 rounded-lg bg-card p-6" role="alert">
      <p className="measure"><b>The practice questions did not load.</b> Check your connection and try again. Once they have loaded, they also work offline.</p>
      <Button onClick={retry}>Try again</Button>
    </div>
  ) : (
    <div className="flex flex-col gap-4" role="status">
      <span className="sr-only">Loading the practice questions…</span>
      <Skeleton className="h-9 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-64 w-full" />
    </div>
  );
  return inline ? body : <Page>{body}</Page>;
}

/** Saves from before the redo queue get one built from their past attempts, once the answer keys have loaded. */
export function RedoSeeder() {
  const { state, update } = useStore();
  const need = !state.redoSeeded || !state.lrRedoSeeded;
  useEffect(() => {
    if (!need) return;
    let live = true;
    loadContent().then((c) => {
      if (live) update((st) => {
        if (!st.redoSeeded) { seedRedo(st, c); st.redoSeeded = true; st.lrRedoSeeded = true; }
        if (!st.lrRedoSeeded) { seedLrRedo(st, c); st.lrRedoSeeded = true; }
      });
    }, () => { /* try again next time the app opens */ });
    return () => { live = false; };
  }, [need, update]);
  return null;
}
