import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ext, LinkButton, Segmented } from "../../components/kit";
import { REPO_URL } from "../../data/site";
import { todayIso } from "../../lib/date";
import { calm, loadGsap, loadScrollTrigger, useGsap, type Gsap } from "../../lib/motion";
import { useStore } from "../../lib/store";
import { buildDay } from "../../planner/engine";
import { LR_CATALOG, RC_CATALOG, VA_CATALOG } from "../../practice/catalog.gen";
import { SECTION_BY_ID } from "../../sections";
import { Head } from "./Head";
import { TodaysPassage } from "./Passage";

/**
 * The home page below the hero (D42): the practice shown working as a bento, the library in big numbers, the statement,
 * the closing line and the wordmark. Loaded after the hero, so none of it is in the first download.
 */

/** True while the element is on screen, so a looping demo only runs when someone can see it. */
function useOnScreen(ref: React.RefObject<HTMLElement | null>): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return on;
}

/** Steps through `n` frames every `ms` while on screen; shows the last frame under reduced motion. */
function useLoop(ref: React.RefObject<HTMLElement | null>, n: number, ms: number): number {
  const seen = useOnScreen(ref);
  const [i, setI] = useState(() => (calm() ? n - 1 : 0));
  useEffect(() => {
    if (!seen || calm()) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => window.clearInterval(t);
  }, [seen, n, ms]);
  return i;
}

const TEAMS = ["Aces", "Bulls", "Chargers", "Dynamos"];
const GRID_STEPS: { text: string; set: [number, number, string][] }[] = [
  { text: "Four teams, each playing the other three once. Read across: W means the team on the left won.", set: [] },
  { text: "Two results are given: Aces beat Bulls, and Chargers drew with Dynamos.", set: [[0, 1, "W"], [2, 3, "D"]] },
  { text: "Bulls won twice. They lost to Aces, so they beat Chargers and Dynamos.", set: [[1, 2, "W"], [1, 3, "W"]] },
  { text: "Dynamos beat Aces, so Aces made their 4 points with a draw against Chargers. Every result is placed.", set: [[3, 0, "W"], [0, 2, "D"]] },
];
const FLIP: Record<string, string> = { W: "L", L: "W", D: "D" };

/** A small results grid filling in step by step, as an LR walkthrough does. */
function GridDemo() {
  const box = useRef<HTMLDivElement>(null);
  const step = useLoop(box, GRID_STEPS.length, 2600);
  const cells = new Map<string, [string, boolean]>();
  GRID_STEPS.slice(0, step + 1).forEach((s, k) => s.set.forEach(([a, b, r]) => {
    cells.set(`${a}-${b}`, [r, k === step]);
    cells.set(`${b}-${a}`, [FLIP[r], k === step]);
  }));
  useGsap(box, (gsap, el) => {
    gsap.from(el.querySelectorAll("[data-fresh]"), { opacity: 0, scale: 0.6, duration: 0.45, stagger: 0.08, ease: "back.out(2)" });
  }, [step]);
  return (
    <div ref={box} className="flex flex-col gap-5">
        <p className="min-h-[3.5rem] text-base" aria-live="polite">{GRID_STEPS[step].text}</p>
        <table className="w-fit border-separate border-spacing-1.5 text-center">
          <thead><tr><td />{TEAMS.map((t) => <th key={t} scope="col" className="px-1 text-sm font-semibold text-muted-foreground">{t[0]}</th>)}</tr></thead>
          <tbody>
            {TEAMS.map((t, a) => (
              <tr key={t}>
                <th scope="row" className="pr-3 text-left text-base font-semibold">{t}</th>
                {TEAMS.map((_, b) => {
                  if (a === b) return <td key={b}><div className="size-12 rounded-md bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),color-mix(in_oklab,var(--muted-foreground)_45%,transparent)_50%,transparent_calc(50%+1px))]" aria-label="No match" /></td>;
                  const c = cells.get(`${a}-${b}`);
                  return (
                    <td key={`${b}-${c?.[0] ?? ""}`}>
                      <div data-fresh={c?.[1] || undefined} className={cn("flex size-12 items-center justify-center rounded-md text-lg font-semibold", c?.[1] ? "bg-highlight-soft" : "bg-secondary")}>{c?.[0]}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-muted-foreground">Step {step + 1} of {GRID_STEPS.length}. The sets on the site solve this way, with a seat plan, a grid or a bracket.</p>
    </div>
  );
}

const REDO = [
  { at: "Today", text: "You miss a para jumble. It goes into your redo queue.", ok: false },
  { at: "Day 1", text: "It comes back the next day. You get it right.", ok: true },
  { at: "Day 3", text: "Back again two days later. Right again, two in a row.", ok: true },
  { at: "Day 7", text: "Three in a row. It leaves the queue: learned, not just seen.", ok: true },
];

/** A missed question coming back on days 1, 3 and 7. */
function RedoDemo() {
  const box = useRef<HTMLDivElement>(null);
  const step = useLoop(box, REDO.length, 2200);
  useGsap(box, (gsap, el) => {
    gsap.from(el.querySelector("[data-now]"), { scale: 0.4, opacity: 0, duration: 0.5, ease: "back.out(2.2)" });
    gsap.from(el.querySelector("[data-say]"), { opacity: 0, y: 6, duration: 0.35 });
  }, [step]);
  return (
    <div ref={box} className="flex flex-col gap-8">
        <p data-say className="min-h-[3.5rem] text-base" aria-live="polite">{REDO[step].text}</p>
        <ol className="relative grid grid-cols-4">
          {/* The line the question travels along. */}
          <span className="absolute top-6 right-[12.5%] left-[12.5%] h-0.5 bg-secondary" aria-hidden />
          {REDO.map((r, k) => {
            const done = k <= step;
            return (
              <li key={r.at} className="relative flex flex-col items-center gap-2 text-center">
                <span key={k === step ? `on-${step}` : "off"} data-now={k === step || undefined}
                  className={cn("flex size-12 items-center justify-center rounded-full", !done ? "bg-secondary" : r.ok ? "bg-success text-white" : "bg-danger text-white", k === step && "ring-4 ring-highlight")}>
                  {done && (r.ok ? <Check className="size-5" aria-label="right" /> : <X className="size-5" aria-label="missed" />)}
                </span>
                <span className={cn("text-base", k === step ? "font-semibold" : "text-muted-foreground")}>{r.at}</span>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-muted-foreground">Every question you miss in RC, VA or critical reasoning joins the queue on its own.</p>
    </div>
  );
}

/** The real VARC timetable for today, rebuilt as the student picks how much time they have. */
function PlanDemo() {
  const { state } = useStore();
  const [mins, setMins] = useState<"30" | "60" | "90" | "120">("60");
  const box = useRef<HTMLDivElement>(null);
  const t = todayIso();
  const blocks = buildDay(SECTION_BY_ID.varc, state, t, +mins, { today: t, noCarry: true });
  const total = blocks.reduce((s, b) => s + b.mins, 0) || 1;
  useGsap(box, (gsap, el) => {
    gsap.from(el.querySelectorAll("[data-bar]"), { scaleX: 0, transformOrigin: "0% 50%", duration: 0.55, stagger: 0.07, ease: "power3.out" });
  }, [mins]);
  return (
    <div ref={box} className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-3">
          <p className="text-base">How much time do you have for VARC today?</p>
          <Segmented label="Minutes today" value={mins} onChange={setMins} options={[["30", "30 min"], ["60", "1 hour"], ["90", "1½ hours"], ["120", "2 hours"]]} />
          <p className="text-sm text-muted-foreground">This is today's real plan. The core task comes first, and one you miss comes back tomorrow as a catch-up.</p>
        </div>
        <div className="flex flex-col gap-5">
        <div className="flex h-12 w-full gap-1 overflow-hidden rounded-lg" aria-hidden>
          {blocks.map((b) => <span key={b.key} data-bar className={cn("h-full rounded-md", b.pri === 1 ? "bg-highlight" : "bg-secondary")} style={{ width: `${(100 * b.mins) / total}%` }} />)}
        </div>
        <ol className="flex flex-col gap-2">
          {blocks.map((b) => (
            <li key={b.key} className="flex items-baseline justify-between gap-4 text-base">
              <span className={cn(b.pri === 1 && "font-semibold")}>{b.name}{b.pri === 1 && <span className="font-normal text-muted-foreground">, core</span>}</span>
              <span className="tabular-nums text-muted-foreground">{b.mins} min</span>
            </li>
          ))}
        </ol>
        </div>
    </div>
  );
}

/** A bento tile: a two-tone title over a demo that is working. A soft light follows the pointer across it. */
function Tile({ lead, rest, className, children }: { lead: string; rest: string; className?: string; children: ReactNode }) {
  const move = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <article onPointerMove={move} className={cn("group relative flex flex-col gap-7 overflow-hidden rounded-2xl bg-card p-6 sm:p-8", className)}>
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(26rem_circle_at_var(--mx,50%)_var(--my,0%),color-mix(in_oklab,var(--primary)_9%,transparent),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden />
      <h3 className="relative max-w-[36ch] text-heading leading-snug font-bold">{lead} <span className="font-semibold text-muted-foreground">{rest}</span></h3>
      <div className="relative flex flex-1 flex-col">{children}</div>
    </article>
  );
}

/** The practice, shown working: four tiles, all running at once (Stripe's and Vercel's bentos, D42). */
export function Showcase() {
  return (
    <section aria-labelledby="show-h" className="flex flex-col gap-10">
      <Head id="show-h" lead="Practice that shows its working." rest="Every option explained, every set solved on a picture, every mistake brought back." />
      <div className="grid gap-3 lg:grid-cols-6">
        <Tile lead="Today's passage." rest="One RC for everyone, every day." className="lg:col-span-3">
          <TodaysPassage level="h4" className="flex-1 rounded-none bg-transparent px-0 py-0 sm:px-0 sm:py-0" />
        </Tile>
        <Tile lead="Logic sets, solved on a picture." rest="Seats, grids and brackets fill in step by step." className="lg:col-span-3"><GridDemo /></Tile>
        <Tile lead="Mistakes come back." rest="After 1, 3 and 7 days, until you get them right three times." className="lg:col-span-2"><RedoDemo /></Tile>
        <Tile lead="A plan that fits today." rest="Tell it your minutes; the timetable reshapes." className="lg:col-span-4"><PlanDemo /></Tile>
      </div>
    </section>
  );
}

/** The library in big numbers, counting up once when they scroll into view. The final values are in the page from the start. */
export function Numbers() {
  const box = useRef<HTMLElement>(null);
  const nums: [number, string][] = [
    [RC_CATALOG.length, "RC passages, a new one each day"],
    [VA_CATALOG.length, "VA paragraphs for summary, insertion, odd one out and jumbles"],
    [LR_CATALOG.length, "logic sets, each solved on a picture"],
    [0, "rupees. No sign-up and no ads"],
  ];
  useEffect(() => {
    const el = box.current;
    if (!el || calm()) return;
    let kill = () => {};
    let gone = false;
    loadScrollTrigger().then(({ gsap, ScrollTrigger }) => {
      if (gone) return;
      const outs = [...el.querySelectorAll<HTMLElement>("[data-count]")];
      const st = ScrollTrigger.create({
        trigger: el, start: "top 85%", once: true,
        onEnter: () => outs.forEach((o, i) => {
          const n = +o.dataset.count!, v = { x: 0 };
          if (!n) return;
          gsap.to(v, { x: n, duration: 1.2, delay: i * 0.1, ease: "power2.out", onUpdate: () => { o.textContent = String(Math.round(v.x)); } });
        }),
      });
      kill = () => st.kill();
    }, () => {});
    return () => { gone = true; kill(); };
  }, []);
  return (
    <section ref={box} aria-labelledby="nums-h" className="flex flex-col gap-8">
      <Head id="nums-h" lead="Written for this site." rest="Every answer is checked by tests before it ships." />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {nums.map(([n, label]) => (
          <div key={label} className="flex flex-col gap-3 border-t border-border pt-6">
            <dt className="sr-only">{label}</dt>
            <dd className="text-[clamp(3.25rem,1.8rem+4vw,6.5rem)] leading-none font-extrabold tracking-[-0.05em] tabular-nums" data-count={n}>{n}</dd>
            <dd className="max-w-[22ch] text-base text-muted-foreground">{label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The wordmark's type, shared by the striped word and the highlighted copy laid exactly over it. */
const WORD = "text-center text-[clamp(7rem,30vw,27rem)] leading-[0.78] font-black tracking-[-0.07em]";

/** Bits of the site the trail is made of: passages, question types, marks, the redo queue, a seat in a set. */
const TRAIL: { t: string; tone: "paper" | "ink" | "mark" }[] = [
  { t: "Para jumble", tone: "paper" },
  { t: "+3", tone: "ink" },
  { t: RC_CATALOG[0]?.title ?? "Today's passage", tone: "paper" },
  { t: "TITA: 29", tone: "mark" },
  { t: "Day 7: cleared", tone: "paper" },
  { t: "Odd sentence out", tone: "ink" },
  { t: RC_CATALOG[7]?.title ?? "RC of the day", tone: "paper" },
  { t: "99th percentile", tone: "mark" },
  { t: "Bulls beat Chargers", tone: "paper" },
  { t: "Seat 4: Nisha", tone: "ink" },
  { t: RC_CATALOG[15]?.title ?? "A new passage", tone: "paper" },
  { t: "Core: one RC, 20 min", tone: "mark" },
];
const TONE = { paper: "bg-card text-foreground", ink: "bg-primary text-primary-foreground", mark: "bg-highlight text-highlight-foreground" };

/**
 * The closing wordmark (Poolside's striped word, Preparoo's trail). With a mouse, the pointer is a highlighter: the
 * stripes turn solid yellow round it, and moving it drops a trail of cards from the site that pop in and fall away.
 * On a touch screen a tap drops one card. Decoration only; under reduced motion it stays a still striped word.
 */
function Wordmark() {
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    const el = box.current;
    if (!el || calm()) return;
    let gsap: Gsap | null = null, gone = false, n = 0, last: { x: number; y: number } | null = null;
    loadGsap().then((g) => { if (!gone) gsap = g; }, () => {});
    const at = (e: globalThis.PointerEvent) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const drop = (x: number, y: number, dx: number, dy: number) => {
      const c = cards.current[n % TRAIL.length];
      if (!gsap || !c) return;
      n++;
      gsap.killTweensOf(c);
      gsap.set(c, { x, y, xPercent: -50, yPercent: -50, opacity: 0, scale: 0.55, rotation: gsap.utils.random(-12, 12), zIndex: n });
      gsap.timeline()
        .to(c, { opacity: 1, scale: 1, duration: 0.28, ease: "back.out(2.2)" })
        .to(c, { x: x + dx * 0.5, y: y + dy * 0.5 + 40, opacity: 0, scale: 0.8, rotation: `+=${gsap.utils.random(-10, 10)}`, duration: 0.75, ease: "power2.in" }, "+=0.3");
    };
    const move = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const p = at(e);
      el.style.setProperty("--mx", `${p.x}px`);
      el.style.setProperty("--my", `${p.y}px`);
      if (!last) { last = p; return; }
      const dx = p.x - last.x, dy = p.y - last.y;
      if (Math.hypot(dx, dy) > 85) { drop(p.x, p.y, dx, dy); last = p; }
    };
    const leave = () => { last = null; };
    const tap = (e: globalThis.PointerEvent) => { if (e.pointerType !== "mouse") { const p = at(e); drop(p.x, p.y, 0, -40); } };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", tap);
    return () => {
      gone = true;
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", tap);
      gsap?.killTweensOf(cards.current);
    };
  }, []);
  return (
    <div ref={box} className="group relative -mb-4 overflow-x-clip select-none" aria-hidden>
      <p data-stripes className={cn(WORD, "bg-[repeating-linear-gradient(to_bottom,var(--wm)_0_3px,transparent_3px_8px)] bg-clip-text text-transparent [--wm:color-mix(in_oklab,var(--muted-foreground)_75%,transparent)]")}>99ile</p>
      {/* The highlighter: the same word in solid yellow, shown only in a soft circle round the pointer. */}
      <p className={cn(WORD, "pointer-events-none absolute inset-0 text-highlight opacity-0 transition-opacity duration-300 [mask-image:radial-gradient(circle_9rem_at_var(--mx,50%)_var(--my,50%),#000_30%,transparent_72%)] group-hover:opacity-100 motion-reduce:hidden")}>99ile</p>
      <div className="pointer-events-none absolute inset-0">
        {TRAIL.map((c, i) => (
          <span key={i} ref={(x) => { cards.current[i] = x; }} className={cn("absolute top-0 left-0 max-w-[16rem] truncate rounded-xl px-4 py-2.5 text-base font-semibold opacity-0", TONE[c.tone])}>{c.t}</span>
        ))}
      </div>
    </div>
  );
}

/** Lights the words of `el` from faint to full ink as it scrolls up the screen (Apple's and Linear's statements). */
function useReadAlong(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || calm()) return;
    let gone = false, kill = () => {};
    loadScrollTrigger().then(({ gsap }) => {
      if (gone) return;
      const tw = gsap.fromTo(el.querySelectorAll("[data-word]"), { opacity: 0.16 }, { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 48%", scrub: 0.4 } });
      kill = () => { tw.scrollTrigger?.kill(); tw.kill(); };
    }, () => {});
    return () => { gone = true; kill(); };
  }, [ref]);
}

const words = (text: string) => text.split(" ").map((w, i) => <span key={i} data-word>{w} </span>);

const STATEMENT = "99ile is a free CAT coach built on one idea: a little every day, done well, beats a lot done once in a while. Every passage and question is written for this site, checked by tests, and explained option by option.";

/** About: the idea as one statement that lights up as it is read, over four short points. */
export function Statement() {
  const p = useRef<HTMLParagraphElement>(null);
  useReadAlong(p);
  const points: [string, string][] = [
    ["A plan that fits your day", "Tell it 30 minutes or 3 hours. The timetable reshapes, and a missed core task comes back as a catch-up."],
    ["A reason for every option", "Each wrong option names its trap, so you learn why it looked right."],
    ["Mistakes come back", "Every missed question returns after 1, 3 and 7 days, until you get it right three times in a row."],
    ["Private and free", "No sign-up and no ads. Progress stays in your browser, works offline, and backs up in Settings."],
  ];
  return (
    <section id="about" aria-labelledby="about-h" className="flex scroll-mt-24 flex-col gap-12 lg:gap-16">
      <h2 id="about-h" className="text-base font-semibold text-muted-foreground">About 99ile</h2>
      <p ref={p} className="-mt-6 max-w-[34ch] text-[clamp(1.75rem,0.9rem+2.6vw,3.5rem)] leading-[1.12] font-extrabold tracking-[-0.035em] lg:-mt-10">{words(STATEMENT)}</p>
      <dl className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {points.map(([title, detail]) => (
          <div key={title} className="flex flex-col gap-2 border-t border-border pt-5">
            <dt className="text-heading font-semibold">{title}</dt>
            <dd className="text-base text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>
      <p className="text-base text-muted-foreground">The name is the goal, the 99th percentile. The code is open on <Ext href={REPO_URL} className="font-semibold text-foreground underline decoration-foreground/25 decoration-1 underline-offset-4 transition-colors hover:decoration-foreground">GitHub</Ext>.</p>
    </section>
  );
}

/**
 * The closing line, title left and the way in right, then the wordmark. The highlighter sweeps under the last words as
 * they scroll into view, and the wordmark's stripes drift with the scroll; under reduced motion both stand still.
 */
export function Closing({ to, label }: { to: string; label: string }) {
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = box.current;
    const mark = el?.querySelector<HTMLElement>("[data-sweep]");
    const stripes = el?.querySelector<HTMLElement>("[data-stripes]");
    if (!el || !mark || !stripes || calm()) return;
    let gone = false, kill = () => {};
    loadScrollTrigger().then(({ gsap }) => {
      if (gone) return;
      const sweep = gsap.fromTo(mark, { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", ease: "none", scrollTrigger: { trigger: el, start: "top 85%", end: "top 40%", scrub: 0.5 } });
      const drift = gsap.fromTo(stripes, { backgroundPositionY: "0px" }, { backgroundPositionY: "80px", ease: "none", scrollTrigger: { trigger: stripes, start: "top bottom", end: "bottom top", scrub: true } });
      kill = () => { [sweep, drift].forEach((t) => { t.scrollTrigger?.kill(); t.kill(); }); };
    }, () => {});
    return () => { gone = true; kill(); };
  }, []);
  return (
    <section ref={box} aria-label="One more thing" className="flex flex-col gap-14 pt-6 lg:gap-20 lg:pt-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
        <p className="max-w-[13ch] text-[clamp(2.75rem,1.1rem+5.4vw,7rem)] leading-[0.96] font-extrabold tracking-[-0.05em]">
          A little every day,{" "}
          <mark data-sweep className="rounded-[0.12em] bg-transparent bg-[linear-gradient(var(--highlight-soft),var(--highlight-soft))] bg-no-repeat px-[0.08em] text-foreground [background-size:100%_100%] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">done well.</mark>
        </p>
        <div className="flex flex-col items-start gap-6 lg:pb-3">
          <p className="max-w-[40ch] text-lg text-foreground/80">That is the whole method. The plan keeps each day small; the explanations make each one count.</p>
          <LinkButton to={to} size="lg" className="min-w-48">{label}</LinkButton>
        </div>
      </div>
      <Wordmark />
    </section>
  );
}
