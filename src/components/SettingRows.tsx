import type { ReactNode } from "react";

/** A Settings card: a heading and its rows, set apart by tone (docs/design/info-pages.md). */
export function Card({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} aria-label={title} className="flex scroll-mt-24 flex-col gap-6 rounded-2xl bg-card p-5 sm:p-7">
      <h2 className="text-heading font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** One setting: what it is and what it does on the left, its control on the right (below on a phone). */
export function Row({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {hint && <div className="text-base text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
