import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Readable pages (F102, D96, docs/design/readable-pages.md), in the site's desk idiom: paper, a blue pen, a highlighter.
 * The device that does the layering is the two-tone line the home page uses (D42): what to do in full ink, the reason
 * after it in muted ink, so a student who scans reads only the ink and nothing waits behind a click. Only bulky things
 * (a table) fold away, in a Fold. Kept out of `kit.tsx`, which is in every page's first download.
 */

/** A claim in ink and its reason muted, as one paragraph. */
export function Two({ lead, rest, className }: { lead: ReactNode; rest?: ReactNode; className?: string }) {
  return <p className={cn("measure text-base", className)}>{lead}{rest && <span className="text-muted-foreground"> {rest}</span>}</p>;
}

/** The tab's one main thing: a sheet with a two-tone statement in the home page's heading voice, and its action. */
export function Lead({ id, lead, rest, note, action, className }: { id: string; lead: ReactNode; rest?: ReactNode; note?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col items-start gap-6 rounded-2xl bg-card p-6 sm:p-8", className)}>
      <h2 id={id} className="max-w-[34ch] text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance">
        {lead}{rest && <span className="font-bold text-muted-foreground"> {rest}</span>}
      </h2>
      {note && <p className="measure -mt-2 text-base text-muted-foreground">{note}</p>}
      {action}
    </section>
  );
}

/**
 * A note in the margin, on the brand's accent tint (set apart by tone, no border): an icon chip beside the heading,
 * and inside it numbers and years as card-toned chips, which stand out on the tint in both themes.
 */
export function Note({ title, icon, children, className }: { title: ReactNode; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-5 rounded-2xl bg-accent p-5 sm:p-6", className)}>
      <h2 className="flex items-center gap-3 text-heading font-semibold">
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary [&_svg]:size-[1.125rem]" aria-hidden>{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A real sequence, numbered in pen: each step in ink, its reason muted after it. */
export function Steps({ steps, className }: { steps: { text: ReactNode; why?: ReactNode }[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col gap-4", className)}>
      {steps.map((s, i) => (
        <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
          <span className="grid size-7 place-items-center rounded-lg bg-card text-base font-bold text-primary tabular-nums" aria-hidden>{i + 1}</span>
          <Two lead={s.text} rest={s.why} />
        </li>
      ))}
    </ol>
  );
}

/** Stages or years against what to do in them; the detail muted after each line. */
export function Timeline({ rows, className }: { rows: { when: ReactNode; what: ReactNode; more?: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("@container flex flex-col gap-4", className)}>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-x-5 gap-y-1.5 @md:grid-cols-[8rem_minmax(0,1fr)] @md:items-baseline">
          <dt className="w-fit rounded-md bg-card px-2.5 py-0.5 text-base font-semibold text-primary tabular-nums">{r.when}</dt>
          <dd><Two lead={r.what} rest={r.more} /></dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Stages of a plan along a road, as on the home page's road (D42): four in a row from 1280 px and two by two from
 * 1024 px, with a bar over each stage; top to bottom on a phone, with the bar at the side.
 */
export function Stages({ rows, className }: { rows: { when: ReactNode; what: ReactNode; more?: ReactNode }[]; className?: string }) {
  return (
    <ol className={cn("grid gap-6 lg:grid-cols-2 lg:gap-x-3 lg:gap-y-8 xl:grid-cols-4", className)}>
      {rows.map((r, i) => (
        <li key={i} className="grid grid-cols-[0.375rem_minmax(0,1fr)] gap-x-4 lg:flex lg:flex-col lg:gap-4">
          <span aria-hidden className="rounded-full bg-primary/45 lg:h-1.5 lg:w-full" />
          <div className="flex min-w-0 flex-col gap-1 lg:pr-5">
            <span className="text-base font-semibold">{r.when}</span>
            <Two lead={r.what} rest={r.more} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Something bulky (a table) folded away, named by what it holds. The browser's own <details>: no script. */
export function Fold({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={cn("group", className)}>
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-base font-medium text-primary marker:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="flex flex-col gap-3 pt-2">{children}</div>
    </details>
  );
}

/** Gap kept between the margin and the screen's top or bottom edge, in px. */
const EDGE = 32;

/**
 * Two columns from the large breakpoint: the main column, and a margin of notes a student glances at while working
 * down the page. On a phone the margin comes after `lead` and before the rest.
 *
 * The margin stays in view while the page scrolls. When it is taller than the screen, it first scrolls along with the
 * page until its own end is in view, and only then holds still, so every note can be read (a sticky element pinned to
 * the top would hide its bottom until the page ran out).
 */
export function Split({ lead, margin, children, className }: { lead?: ReactNode; margin: ReactNode; children?: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const place = () => { el.style.top = `${Math.min(EDGE, window.innerHeight - el.offsetHeight - EDGE)}px`; };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    window.addEventListener("resize", place);
    return () => { ro.disconnect(); window.removeEventListener("resize", place); };
  }, []);
  return (
    <div className={cn("grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-x-16", className)}>
      {lead && <div className="flex min-w-0 flex-col gap-12 lg:col-start-1">{lead}</div>}
      <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div ref={box} className="flex flex-col gap-10 lg:sticky">{margin}</div>
      </aside>
      {children && <div className="flex min-w-0 flex-col gap-14 lg:col-start-1">{children}</div>}
    </div>
  );
}
