import type { ComponentProps, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "../lib/store";
import { CONTACT_EMAIL } from "../data/site";

/**
 * The app's building blocks on top of shadcn/ui. Every page is a Page with a PageHeader,
 * then Sections. Gaps between sections are larger than gaps inside them.
 * A "read" page keeps its content to a 760px measure but starts at the same left edge as a wide page,
 * so the title does not jump sideways when moving between pages.
 */
export function Page({ className, width = "wide", ...props }: ComponentProps<"div"> & { width?: "wide" | "read" }) {
  return <div className={cn("mx-auto flex w-full min-w-0 flex-col gap-10 lg:gap-12", width === "wide" ? "max-w-[1120px]" : "max-w-[1120px] [&>*:not(.bleed-gutter)]:max-w-[760px]", className)} {...props} />;
}

export function PageHeader({ title, children, aside, back }: { title: ReactNode; children?: ReactNode; aside?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <header className="flex flex-col gap-3">
      {back && <RouterLink to={back.to} className="relative w-fit text-sm font-medium after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">{back.label}</RouterLink>}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <h1 className="text-title font-bold">{title}</h1>
        {aside}
      </div>
      {children && <div className="measure text-base text-foreground/85">{children}</div>}
    </header>
  );
}

export function Section({ title, action, description, children, className, id }: { title?: ReactNode; action?: ReactNode; description?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4", className)} id={id} aria-labelledby={title && id ? id + "-h" : undefined}>
      {(title || action) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {title && <h2 id={id ? id + "-h" : undefined} className="text-heading font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {description && <p className="measure -mt-2 text-base text-muted-foreground">{description}</p>}
      {children}
    </section>
  );
}

/** A quiet, clear invitation to share feedback at the end of an information page. */
export function FeedbackInvite({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-7 sm:py-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-heading font-semibold">{title}</h2>
        <p className="measure text-base text-muted-foreground">{children}</p>
      </div>
      <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-md px-2 text-base font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        {CONTACT_EMAIL}
        <ArrowUpRight className="size-4" aria-hidden />
      </a>
    </aside>
  );
}

/** Secondary details in plain words, such as "Philosophy, medium, 382 words". */
export function Meta({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg bg-muted px-5 py-6 text-base text-muted-foreground">
      <div>{children}</div>
      {action}
    </div>
  );
}

/** A number with its label underneath, for scores and counts. */
/**
 * Digits at equal widths, so a ticking clock or a column of numbers does not jiggle.
 * Use this instead of the tabular-nums class on text with punctuation: Schibsted Grotesk's
 * tabular figures also make , . and : as wide as a digit, which reads as "13 .0" or "0 :02".
 */
export function Tnum({ children }: { children: string }) {
  return <>{children.split(/(\d+)/).map((part, i) => (i % 2 ? <span key={i} className="tabular-nums">{part}</span> : part))}</>;
}

export function Stat({ value, label, className }: { value: ReactNode; label: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-heading font-semibold">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

const NEW_TAB = <span className="sr-only"> (opens in a new tab)</span>;

export function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}{NEW_TAB}</a>;
}

/** An inline text link: inside the app, out of it in a new tab, or an email address. */
export function TextLink({ to, children, className, onClick }: { to: string; children: ReactNode; className?: string; onClick?: () => void }) {
  const cls = cn("font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary", className);
  if (to.startsWith("/")) return <RouterLink to={to} className={cls} onClick={onClick}>{children}</RouterLink>;
  // An email address opens the mail app in place, not a new tab.
  return to.startsWith("mailto:") ? <a href={to} className={cls} onClick={onClick}>{children}</a> : <Ext href={to} className={cls}>{children}</Ext>;
}

/**
 * A link that stands on its own ("All updates", "Open VARC"): ink-coloured text and an arrow, no underline at rest. On
 * hover the arrow steps forward and an underline draws in from the left. Links inside a sentence stay TextLink.
 */
export function ArrowLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const cls = cn("group inline-flex w-fit items-center gap-1.5 rounded-sm text-base font-semibold text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", className);
  const inner = (
    <>
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 [background-size:0%_1.5px] group-hover:[background-size:100%_1.5px] motion-reduce:transition-none">{children}</span>
      <ArrowRight className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden />
    </>
  );
  return to.startsWith("/") ? <RouterLink to={to} className={cls}>{inner}</RouterLink> : <Ext href={to} className={cls}>{inner}</Ext>;
}

/**
 * A button that navigates. Outside links open in a new tab. `arrow` marks a link to another site,
 * for lists of study resources where telling sites apart from pages here matters.
 */
export function LinkButton({ to, children, variant = "default", size = "default", className, arrow }: { to: string; children: ReactNode; arrow?: boolean } & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  const inside = to.startsWith("/");
  return (
    <Button asChild variant={variant} size={size} className={className}>
      {inside ? <RouterLink to={to}>{children}</RouterLink> : <a href={to} target="_blank" rel="noopener noreferrer">{children}{arrow && <ArrowUpRight aria-hidden />}{NEW_TAB}</a>}
    </Button>
  );
}

/** A row of quiet buttons for the study resources of a timetable block, as [label, href] pairs. */
export function LinkButtons({ links }: { links: [string, string][] }) {
  if (!links.length) return null;
  return <div className="flex flex-wrap gap-2">{links.map(([label, href]) => <LinkButton key={label} to={href} variant="secondary" size="sm" arrow>{label}</LinkButton>)}</div>;
}

/** A labelled form field. The label sits above the control in sentence case. */
export function Field({ label, children, className, hint }: { label: ReactNode; children: ReactNode; className?: string; hint?: ReactNode }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5 text-sm font-medium", className)}>
      <span>{label}</span>
      {children}
      {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p className="text-sm text-danger" role="alert">{children}</p> : null;
}

/**
 * A switch between parts of a page (logical reasoning or data interpretation; exams on the updates page), as tabs: equal parts, a
 * card-toned pill that slides to the chosen one (transform only, still under reduced motion), an optional count
 * beside each label, a short label on a phone (the full one stays for screen readers), and arrow keys to move. The panel it controls has the id `panel`.
 */
export function SwitchTabs<T extends string>({ value, onChange, options, label, panel, className }: {
  value: T; onChange: (v: T) => void; options: { id: T; label: string; short?: string; count?: number }[]; label: string; panel: string; className?: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.id === value));
  const move = (d: number) => onChange(options[(i + d + options.length) % options.length].id);
  return (
    <div role="tablist" aria-label={label}
      onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); move(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); } }}
      className={cn("relative grid w-full rounded-xl bg-secondary p-1 sm:w-fit", className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span aria-hidden className="absolute inset-y-1 left-1 rounded-lg bg-card shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} aria-controls={panel} tabIndex={on ? 0 : -1} onClick={() => onChange(o.id)}
            className={cn("relative z-[1] flex min-h-11 items-center justify-center rounded-lg text-base transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none sm:gap-2 sm:px-6",
              // Four or more tabs share a phone's width, so each keeps its label whole with less side room.
              options.length > 3 ? "gap-1.5 px-2" : "gap-2 px-4",
              on ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {o.short ? <><span className="truncate sm:hidden" aria-hidden>{o.short}</span><span className="truncate max-sm:sr-only">{o.label}</span></> : <span className="truncate">{o.label}</span>}
            {o.count !== undefined && (
              <span className={cn("rounded-md px-1.5 text-sm font-semibold tabular-nums transition-colors duration-200", on ? "bg-primary/10 text-primary" : "bg-foreground/[0.06] text-muted-foreground",
                // With four or more tabs a phone has room for the labels only; the counts come back from the small breakpoint.
                options.length > 3 && "max-sm:hidden")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A row of mutually exclusive choices, such as VARC, DILR and Quant. */
export function Segmented<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: (T | [T, ReactNode])[]; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex w-fit flex-wrap gap-1 rounded-lg bg-secondary p-1", className)}>
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            className={cn("h-9 rounded-md px-3.5 text-base text-muted-foreground transition-colors hover:text-foreground", value === v && "bg-card font-semibold text-primary ring-1 ring-inset ring-primary/40")}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One thing on or off, where On and Off as words would be two choices for what is really one decision (reminders,
 * a channel). The track is 48 by 44 px, so a thumb stays easy to hit on a phone. The thumb's colour carries the
 * state in both themes: a grey dot on a pale track when off, the button's own ink on blue when on.
 */
export function Switch({ checked, onChange, label, disabled, describedBy }: {
  checked: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean; describedBy?: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} aria-describedby={describedBy} disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group grid h-11 w-12 shrink-0 cursor-pointer place-items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default disabled:opacity-50">
      <span aria-hidden className={cn("flex h-7 w-12 items-center rounded-full p-1 transition-colors duration-200 motion-reduce:transition-none", checked ? "bg-primary" : "bg-foreground/15 group-hover:bg-foreground/25")}>
        {/* The thumb answers the press by shrinking: a transform, so reduced motion simply skips the ease. */}
        <span className={cn("size-5 rounded-full transition-transform duration-200 group-active:scale-90 motion-reduce:transition-none", checked ? "translate-x-5 bg-primary-foreground" : "bg-foreground/45")} />
      </span>
    </button>
  );
}

/** A list of logged entries, each with its own delete button. */
export function LogList({ children, empty }: { children: ReactNode[]; empty: ReactNode }) {
  return children.length ? <ul className="flex flex-col gap-1 rounded-lg bg-card p-1.5">{children}</ul> : <Empty>{empty}</Empty>;
}
type Logged = "practice" | "mocks" | "errors" | "vocab" | "summaries";
/** Deletes a logged entry at once and offers Undo for a few seconds, so a slip costs nothing. */
export function useDeleteWithUndo() {
  const { state, update } = useStore();
  return (key: Logged, id: string, what: string) => {
    const at = (state[key] as { id: string }[]).findIndex((x) => x.id === id);
    if (at < 0) return;
    const item = structuredClone(state[key][at]);
    update((st) => { const l = st[key] as { id: string }[]; const i = l.findIndex((x) => x.id === id); if (i >= 0) l.splice(i, 1); });
    const undo = () => update((st) => { const l = st[key] as { id: string }[]; if (!l.some((x) => x.id === id)) l.splice(Math.min(at, l.length), 0, item); });
    // sonner loads on demand, so it stays out of the first download.
    void import("sonner").then(({ toast }) => toast(what + " deleted.", { duration: 6000, action: { label: "Undo", onClick: undo } }));
  };
}
export function LogRow({ children, onDelete, label }: { children: ReactNode; onDelete: () => void; label: string }) {
  return (
    <li className="flex items-start justify-between gap-4 rounded-md px-3.5 py-3 hover:bg-muted/60">
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
      <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-danger" aria-label={label} onClick={onDelete}>Delete</Button>
    </li>
  );
}
