import type { ComponentProps, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "../lib/store";

/**
 * The app's building blocks on top of shadcn/ui. Every page is a Page with a PageHeader,
 * then Sections. Gaps between sections are larger than gaps inside them.
 */
export function Page({ className, width = "wide", ...props }: ComponentProps<"div"> & { width?: "wide" | "read" }) {
  return <div className={cn("mx-auto flex w-full min-w-0 flex-col gap-10 lg:gap-12", width === "wide" ? "max-w-[1120px]" : "max-w-[760px]", className)} {...props} />;
}

export function PageHeader({ title, children, aside, back }: { title: ReactNode; children?: ReactNode; aside?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <header className="flex flex-col gap-3">
      {back && <RouterLink to={back.to} className="w-fit text-sm font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">{back.label}</RouterLink>}
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
export function Stat({ value, label, className }: { value: ReactNode; label: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-heading font-semibold tabular-nums">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

/** An inline text link, inside the app or out of it. */
export function TextLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const cls = cn("font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary", className);
  return to.startsWith("/") ? <RouterLink to={to} className={cls}>{children}</RouterLink> : <Ext href={to} className={cls}>{children}<ArrowUpRight className="ml-0.5 inline size-3.5 align-[-1px]" aria-hidden /></Ext>;
}

/** A button that navigates. Outside links open in a new tab and carry an arrow. */
export function LinkButton({ to, children, variant = "default", size = "default", className }: { to: string; children: ReactNode } & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  const inside = to.startsWith("/");
  return (
    <Button asChild variant={variant} size={size} className={className}>
      {inside ? <RouterLink to={to}>{children}</RouterLink> : <a href={to} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight aria-hidden /></a>}
    </Button>
  );
}

/** A row of quiet buttons for [label, href] pairs. */
export function LinkButtons({ links }: { links: [string, string][] }) {
  if (!links.length) return null;
  return <div className="flex flex-wrap gap-2">{links.map(([label, href]) => <LinkButton key={label} to={href} variant="secondary" size="sm">{label}</LinkButton>)}</div>;
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

/** A native select styled like the inputs. Native keeps phones on their own picker. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40", className)} {...props} />;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p className="text-sm text-danger" role="alert">{children}</p> : null;
}

/** A row of mutually exclusive choices, such as VARC, DILR and Quant. */
export function Segmented<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: (T | [T, ReactNode])[]; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex w-fit flex-wrap gap-1 rounded-lg bg-secondary p-1", className)}>
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            className={cn("h-9 rounded-md px-3.5 text-base text-muted-foreground transition-colors hover:text-foreground", value === v && "bg-card font-semibold text-foreground")}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

/** A list of logged entries, each with its own delete button. */
export function LogList({ children, empty }: { children: ReactNode[]; empty: ReactNode }) {
  return children.length ? <ul className="flex flex-col gap-1 rounded-lg bg-card p-1.5">{children}</ul> : <Empty>{empty}</Empty>;
}
type Logged = "practice" | "mocks" | "errors" | "vocab";
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
