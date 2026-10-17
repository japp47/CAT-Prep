import { useEffect, type ReactNode } from "react";
import { useStore } from "../lib/store";
import { loadContent, useContent, type Content } from "../practice/content";
import { seedRedo } from "../practice/redo";

/**
 * Renders its children once the practice content has loaded, with a short message until then.
 * `inline` drops the page wrapper, for a gate inside a page that is already showing.
 */
export function ContentGate({ children, inline }: { children: (c: Content) => ReactNode; inline?: boolean }) {
  const { content, failed, retry } = useContent();
  if (content) return <>{children(content)}</>;
  return (
    <div className={inline ? "stack" : "page"}>
      {failed ? (
        <div className="card stack" role="alert">
          <p><b>The practice questions did not load.</b> Check your connection and try again. Once they have loaded, they also work offline.</p>
          <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={retry}>Try again</button>
        </div>
      ) : <div className="empty" aria-live="polite">Loading practice questions…</div>}
    </div>
  );
}

/** Saves from before the redo queue get one built from their past attempts, once the answer keys have loaded. */
export function RedoSeeder() {
  const { state, update } = useStore();
  const need = !state.redoSeeded;
  useEffect(() => {
    if (!need) return;
    let live = true;
    loadContent().then((c) => {
      if (live) update((st) => { if (!st.redoSeeded) { seedRedo(st, c); st.redoSeeded = true; } });
    }, () => { /* try again next time the app opens */ });
    return () => { live = false; };
  }, [need, update]);
  return null;
}
