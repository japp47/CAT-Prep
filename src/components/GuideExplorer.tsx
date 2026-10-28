import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGsap } from "../lib/motion";
import { usePref } from "../lib/prefs";

/**
 * The Learn tab's type guides (D46), for VARC and DILR alike. On a wide screen: the types as a list on the left, kept
 * in view, and the open guide on the right, easing in when it changes. On a phone: the same list, each opening in
 * place. Only the open guide renders, so a tab of many long guides stays light. The guide last opened is remembered;
 * `focus` (from ?guide= in the address) opens one and scrolls to it.
 */
export interface GuideItem { id: string; h: string; tag?: string; icon?: ReactNode; body: () => ReactNode }

function useWide(): boolean {
  const q = "(min-width: 64rem)";
  const [wide, setWide] = useState(() => typeof matchMedia === "function" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

/** The open guide's title in two tones, then its body. */
function Panel({ it }: { it: GuideItem }) {
  return (
    <div className="flex flex-col gap-7">
      <h3 className="max-w-[30ch] text-[clamp(1.6rem,1.2rem+1.2vw,2.4rem)] leading-[1.08] font-extrabold tracking-[-0.03em]">
        {it.h}.{it.tag && <span className="font-bold text-muted-foreground"> {it.tag}.</span>}
      </h3>
      {it.body()}
    </div>
  );
}

export function GuideExplorer({ items, label, prefKey, focus }: { items: GuideItem[]; label: string; prefKey: string; focus?: string | null }) {
  const wide = useWide();
  const [saved, setSaved] = usePref<string>(prefKey, items[0]?.id ?? "");
  const valid = (id: string | null | undefined) => !!id && items.some((x) => x.id === id);
  const [cur, setCur] = useState(() => (valid(focus) ? focus! : valid(saved) ? saved : items[0]?.id));
  // On a phone nothing is open until the student opens one, unless the address names it.
  const [phoneOpen, setPhoneOpen] = useState<string | null>(valid(focus) ? focus! : null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useGsap(panel, (gsap, el) => { gsap.from(el, { opacity: 0, y: 14, duration: 0.4, ease: "power2.out", clearProps: "all" }); }, [cur, phoneOpen]);
  useEffect(() => { if (valid(focus)) root.current?.scrollIntoView({ block: "start" }); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id: string) => { setCur(id); setSaved(id); };
  const onKey = (e: KeyboardEvent, i: number) => {
    const to = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : -1;
    if (to < 0 || to >= items.length) return;
    e.preventDefault();
    choose(items[to].id);
    tabs.current[to]?.focus();
  };
  const active = items.find((x) => x.id === cur) ?? items[0];
  if (!active) return null;

  if (!wide) {
    return (
      <div ref={root} className="flex scroll-mt-24 flex-col gap-2">
        {items.map((it) => {
          const on = phoneOpen === it.id;
          return (
            <div key={it.id} id={"guide-" + it.id} className="scroll-mt-24 overflow-hidden rounded-2xl bg-card">
              <button type="button" aria-expanded={on} aria-controls={"guide-body-" + it.id} onClick={() => { setPhoneOpen(on ? null : it.id); if (!on) setSaved(it.id); }}
                className="flex w-full items-center gap-4 px-5 py-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset">
                {it.icon}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-heading font-semibold">{it.h}</span>
                  {it.tag && <span className="text-sm text-muted-foreground">{it.tag}</span>}
                </span>
                <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none", on && "rotate-180")} aria-hidden />
              </button>
              {/* The header above already names the guide, so the body starts straight away. */}
              {on && <div ref={panel} id={"guide-body-" + it.id} className="px-5 pt-1 pb-6">{it.body()}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={root} className="grid scroll-mt-24 items-start gap-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
      <div role="tablist" aria-orientation="vertical" aria-label={label} className="sticky top-24 flex flex-col gap-1">
        {items.map((it, i) => {
          const on = it.id === active.id;
          return (
            <button key={it.id} ref={(x) => { tabs.current[i] = x; }} type="button" role="tab" id={"guide-tab-" + it.id} aria-selected={on} aria-controls="guide-panel" tabIndex={on ? 0 : -1}
              onClick={() => choose(it.id)} onKeyDown={(e) => onKey(e, i)}
              className={cn("relative flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                on ? "bg-card" : "hover:bg-card/50")}>
              {on && <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-primary" aria-hidden />}
              {it.icon}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn("text-base", on ? "font-semibold" : "text-foreground/80")}>{it.h}</span>
                {it.tag && <span className="truncate text-sm text-muted-foreground">{it.tag}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div ref={panel} id="guide-panel" role="tabpanel" aria-labelledby={"guide-tab-" + active.id} className="min-w-0 rounded-2xl bg-card p-6 sm:p-8">
        <Panel key={active.id} it={active} />
      </div>
    </div>
  );
}
