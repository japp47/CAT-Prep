import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePref } from "../lib/prefs";
import { LR_CATALOG } from "../practice/catalog.gen";
import type { LrType } from "../practice/types";
import type { LrGuide } from "../sections/dilr/guides";
import { ContentGate } from "./Content";
import { LinkButton } from "./kit";
import { LrWalkthrough } from "./LrDiagram";
import { LrThumb } from "./LrThumb";
import { GuideLinks, GuideSteps, GuideTraps } from "./TypeGuide";

/**
 * The worked example of an LR guide: one of our own sets. Solve it first; then the walkthrough of its real solution
 * plays here, picture and all. The set loads only when the student asks to see it.
 */
function WorkedSet({ g }: { g: LrGuide }) {
  const meta = LR_CATALOG.find((m) => m.id === g.example.set);
  const [shown, setShown] = useState(false);
  if (!meta) return null;
  return (
    <section aria-label="Worked example" className="flex flex-col gap-4 rounded-2xl bg-muted/70 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Worked example, {meta.minutes} minutes, {meta.questions} questions</span>
        <h4 className="text-heading font-semibold">{meta.title}</h4>
      </div>
      <p className="measure text-base">{g.example.note}</p>
      <div className="flex flex-wrap gap-3">
        <LinkButton to={`/practice/lr/${meta.id}`} variant="secondary">Solve it first</LinkButton>
        {!shown && <Button variant="ghost" onClick={() => setShown(true)}>Show how it is solved</Button>}
      </div>
      {shown && (
        <ContentGate inline need={{ lr: [meta.id] }}>
          {(c) => { const set = c.lrById(meta.id); return set ? <LrWalkthrough steps={set.solution.steps} g={set.solution.diagram} /> : null; }}
        </ContentGate>
      )}
    </section>
  );
}

/** One LR set type's guide (F21), as the DILR Learn tab's explorer shows it (D46). */
export function LrGuideBody({ g }: { g: LrGuide }) {
  const [, setOpen] = usePref<LrType[] | null>("lrOpen", null);
  const n = LR_CATALOG.filter((m) => m.type === g.id).length;
  return (
    <div className="flex flex-col gap-8">
      <p className="measure text-lg leading-relaxed">{g.what}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex gap-4 rounded-2xl bg-muted/60 p-5">
          <LrThumb type={g.id} className="size-12" />
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold">Draw this first</span>
            <p className="text-base text-foreground/85">{g.draw}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-highlight-soft p-5">
          <span className="text-base font-semibold">Where to start</span>
          <p className="text-base">{g.start}</p>
        </div>
      </div>
      <div className="grid gap-8 xl:grid-cols-2 xl:gap-10">
        <GuideSteps steps={g.method} />
        <GuideTraps traps={g.traps} />
      </div>
      <WorkedSet g={g} />
      <GuideLinks links={g.links} />
      {n > 0 && (
        <div>
          {/* Opens the DILR practice list on this type's group. */}
          <Button asChild variant="secondary" onClick={() => setOpen([g.id])}>
            <Link to="/dilr/practice">Practise the {n} {g.h.toLowerCase()} sets here</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
