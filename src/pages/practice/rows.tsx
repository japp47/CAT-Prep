import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LinkButton } from "../../components/kit";
import { NativeSelect } from "../../components/Select";
import { PAPER_PDFS } from "../../data/papers";

/** Rows on one sheet, set apart by a hairline of the page's own tone rather than as separate cards. */
export function Rows({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-px overflow-hidden rounded-xl bg-background">{children}</ul>;
}

/**
 * One way to practise: what it is on the left, its action on the right. `next` marks the one thing to do now with the
 * highlighter. On a phone the action drops below the text, except in `side` rows, whose text is short and whose action
 * is one small button.
 */
export function Row({ title, children, action, next, side }: { title: ReactNode; children?: ReactNode; action: ReactNode; next?: boolean; side?: boolean }) {
  return (
    <li className={cn("relative grid gap-y-3 bg-card px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-8 sm:px-6", side && "grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4", next && "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-highlight")}>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-heading font-semibold">{title}</h3>
        {children && <div className="measure flex flex-col gap-1 text-base text-muted-foreground">{children}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{action}</div>
    </li>
  );
}

/** Real CAT papers: a picker and a download. Each section's page says how to use them for that section. */
export function PaperRow({ children }: { children: ReactNode }) {
  const [paper, setPaper] = useState(PAPER_PDFS[0][1]);
  return (
    <Row title="Real CAT papers"
      action={<>
        <NativeSelect aria-label="Past paper" value={paper} onChange={(e) => setPaper(e.target.value)} className="w-auto">
          {PAPER_PDFS.map(([n, u]) => <option key={u} value={u}>{n}</option>)}
        </NativeSelect>
        <LinkButton to={paper} variant="secondary" arrow>Download PDF</LinkButton>
      </>}>
      {children}
    </Row>
  );
}
