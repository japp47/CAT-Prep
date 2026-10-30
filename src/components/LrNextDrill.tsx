import type { LrAttempt } from "../lib/state";
import { useContent } from "../practice/content";
import { firstMoveSets, firstMoveStep, isGrid, moveReason, openOf } from "../practice/lrdrill";
import { CLUE_KIND, kindOfExpr } from "../practice/lrlogic";
import type { LrSet } from "../practice/types";
import { LinkButton } from "./kit";

/**
 * What to practise after a set (D48), from the student's own post-mortem: the clue they opened with against the best
 * start (First move on this set), a misread clue to the Clue translator on clues of that kind, a missed case to Must,
 * could, cannot on this set. Each drill leads back to this review. Renders nothing until the post-mortem says something.
 */
export function LrNextDrill({ set, attempt }: { set: LrSet; attempt: LrAttempt }) {
  const pm = attempt.pm ?? {};
  const asks = !!pm.key || pm.slip === "misread" || pm.slip === "missed-case";
  // The drills' content loads only once there is something to suggest.
  const { content } = useContent(asks ? { drills: true } : {});
  if (!asks) return null;
  const d = content?.lrDrills;
  if (!d) return null;
  const model = d.models.find((m) => m.set === set.id);
  const firstOk = !!model && firstMoveSets([model]).length > 0;
  const mcc = d.mcc.find((x) => x.set === set.id);
  const back = encodeURIComponent(`/practice/lr/${set.id}?review=${attempt.id}`);
  const rows: { text: string; to: string; cta: string }[] = [];

  if (pm.key && model && firstOk) {
    const start = firstMoveStep(model, []);
    const n = openOf(model, [pm.key]);
    const best = start.counts.filter((c) => c.n === start.best).map((c) => c.clue);
    const ways = (x: number) => (x === 1 ? "1 way" : `${x} ways`);
    rows.push(n === start.best
      ? { text: `You opened with clue ${pm.key}, a best start. It leaves ${ways(n)}: ${moveReason(model, [], pm.key, n)}. See if your next two moves were as good.`, to: `/practice/first-move?set=${set.id}&back=${back}`, cta: "First move on this set" }
      : { text: `You opened with clue ${pm.key}, which leaves ${ways(n)}. Clue ${best[0]} leaves ${ways(start.best)}: ${moveReason(model, [], best[0], start.best)}. Practise choosing where to start.`, to: `/practice/first-move?set=${set.id}&back=${back}`, cta: "First move on this set" });
  }
  if (pm.slip === "misread") {
    // The translator's kinds are seating clues; a grid set's clue has none.
    const kind = pm.slipClue && model && !isGrid(model) ? kindOfExpr(model.clues[pm.slipClue - 1]) : undefined;
    rows.push(kind
      ? { text: `Clue ${pm.slipClue} is of the kind "${CLUE_KIND[kind].toLowerCase()}". Eight clues of that kind, each read onto a small board, show where the reading slips.`, to: `/practice/clues?kind=${kind}&back=${back}`, cta: `Practise ${CLUE_KIND[kind].toLowerCase()} clues` }
      : { text: "A misread clue is the commonest LR error. Eight clues, each read onto a small board, name the misreading when there is one.", to: `/practice/clues?back=${back}`, cta: "Clue translator" });
  }
  if (pm.slip === "missed-case") {
    rows.push(mcc
      ? { text: "A missed case usually means a statement was judged from one case. Sort statements as must, could or cannot across every case this set leaves.", to: `/practice/must-could?d=${mcc.id}&back=${back}`, cta: "Must, could, cannot on this set" }
      : { text: "A missed case usually means a statement was judged from one seating. Practise checking every seating before answering.", to: `/practice/must-could?back=${back}`, cta: "Must, could, cannot" });
  }
  if (!rows.length) return null;
  return (
    <section aria-label="What to practise next" className="flex flex-col gap-3 rounded-2xl bg-card p-5 sm:p-6">
      <h2 className="text-heading font-semibold">What to practise next</h2>
      <ul className="flex flex-col gap-4">
        {rows.map((r) => (
          <li key={r.to} className="flex flex-col items-start gap-2.5">
            <p className="measure text-base">{r.text}</p>
            <LinkButton to={r.to} variant="secondary" size="sm">{r.cta}</LinkButton>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">Each drill takes a few minutes and brings you back to this review. Your wrong questions are already in the redo queue.</p>
    </section>
  );
}
