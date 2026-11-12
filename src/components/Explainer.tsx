import { useEffect, useState, type ReactNode } from "react";
import { Check, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Animated explainers (F102, docs/design/readable-pages.md "Animated explainers"): a picture that changes one step at a
 * time, with a two-tone caption per step. The student moves it (Next, Back) or presses Play, because animation teaches
 * when the learner sets the pace (Tversky et al. 2002; Mayer and Chandler 2001). Motion is CSS transforms and opacity
 * only, and stops under reduced motion; stepping still works, since each step is the student's own tap.
 */
export function Explainer({ id, title, steps, picture, className }: {
  id: string; title: string; steps: [string, string][]; picture: (step: number) => ReactNode; className?: string;
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = steps.length - 1;
  useEffect(() => {
    if (!playing) return;
    if (i >= last) { setPlaying(false); return; }
    const t = setTimeout(() => setI((n) => n + 1), 3600);
    return () => clearTimeout(t);
  }, [playing, i, last]);
  const go = (n: number) => { setPlaying(false); setI(Math.max(0, Math.min(last, n))); };
  return (
    <figure aria-labelledby={id} className={cn("flex flex-col gap-5 rounded-2xl bg-card p-5 sm:gap-6 sm:p-7", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-heading font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">Step {i + 1} of {steps.length}</span>
      </div>
      {/* From 1280 px: the picture on the left and its words beside it (spatial contiguity), using the full width. */}
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:items-center xl:gap-12">
      <div aria-hidden>{picture(i)}</div>
      <div className="flex flex-col gap-5 xl:gap-8">
      {/* Every caption sits in the same cell, so the box keeps the height of the longest and nothing jumps. */}
      <figcaption className="grid">
        {steps.map(([lead, rest], k) => (
          <p key={k} aria-hidden={k !== i} className={cn("measure text-base [grid-area:1/1]", k !== i && "invisible")}>
            <b className="font-semibold xl:block xl:pb-1.5 xl:text-heading xl:leading-snug">{lead}</b> <span className="text-muted-foreground">{rest}</span>
          </p>
        ))}
        <span className="sr-only" aria-live="polite">{`Step ${i + 1} of ${steps.length}. ${steps[i][0]} ${steps[i][1]}`}</span>
      </figcaption>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => go(i - 1)} disabled={i === 0}>Back</Button>
        <Button variant="secondary" onClick={() => go(i === last ? 0 : i + 1)}>{i === last ? "Start again" : "Next"}</Button>
        {i < last && (
          <Button variant="ghost" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}{playing ? "Pause" : "Play"}
          </Button>
        )}
        <span className="ml-auto flex gap-1" aria-hidden>
          {steps.map((_, k) => <span key={k} className={cn("h-1.5 w-4 rounded-full transition-colors duration-300 motion-reduce:transition-none", k <= i ? "bg-primary" : "bg-secondary")} />)}
        </span>
      </div>
      </div>
      </div>
    </figure>
  );
}

const EASE = "transition-[transform,opacity,background-color,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

/**
 * How the 40 minutes go, for DILR: five sets, read all five, pick the direct ones, leave one with no way in, solve two
 * completely, and the score that makes. Steps: 0 the sets, 1 read, 2 pick, 3 leave, 4 solve, 5 the score.
 */
const SETS = [4, 5, 4, 5, 4]; // three sets of 4 questions and two of 5
const PICKED = [1, 3, 4], LEFT = 4, SOLVED = [1, 3];
/** The bar: minutes from, to, the step it appears at, and its tone. */
const BAR: [number, number, number, string][] = [[0, 5, 1, "bg-primary/35"], [5, 11, 3, "bg-muted-foreground/30"], [11, 24, 4, "bg-primary"], [24, 37, 4, "bg-primary"]];

export function FortyMinutes({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary">
          {BAR.map(([a, b, at, tone]) => (
            <span key={a} className={cn("absolute inset-y-0 origin-left rounded-full", tone, EASE, step >= at ? "scale-x-100" : "scale-x-0")}
              style={{ left: `${(a / 40) * 100}%`, width: `calc(${((b - a) / 40) * 100}% - 2px)` }} />
          ))}
        </div>
        {/* The score lands on the same row as the minute marks, so the last step adds no height. */}
        <div className="relative flex justify-between text-sm text-muted-foreground tabular-nums">
          <span>0 min</span>
          <span className={cn("hl absolute left-1/2 -translate-x-1/2 font-semibold whitespace-nowrap text-foreground normal-nums", EASE, step >= 5 ? "opacity-100" : "opacity-0")}>10 to 13 right: about a 99</span>
          <span>40 min</span>
        </div>
      </div>
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {SETS.map((q, k) => {
          const picked = step >= 2 && PICKED.includes(k), left = step >= 3 && k === LEFT, solved = step >= 4 && SOLVED.includes(k);
          const dim = (step >= 2 && !picked) || left;
          return (
            <li key={k} className={cn("relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-3 sm:py-4 lg:gap-1 lg:py-6", EASE,
              solved ? "bg-primary text-primary-foreground" : picked && !left ? "bg-primary/12 text-primary" : step >= 1 ? "bg-secondary" : "bg-muted",
              picked && !left ? "-translate-y-1.5" : "translate-y-0", dim ? "opacity-45" : "opacity-100")}
              style={{ transitionDelay: step === 1 ? `${k * 90}ms` : "0ms" }}>
              {/* A narrow tile on a phone shows the mark in place of its name, so the two never overlap. */}
              <span className={cn("text-sm", (solved || left) && "max-sm:hidden")}>Set {k + 1}</span>
              {(solved || left) && <span className="grid h-5 place-items-center sm:absolute sm:top-1.5 sm:right-1.5 sm:h-auto">{solved ? <Check className="size-4" /> : <X className="size-4" />}</span>}
              <span className={cn("text-heading leading-tight font-bold tabular-nums lg:text-title", left && "line-through")}>{q}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * How the 40 minutes go, for VARC: four passages and eight VA questions, which are MCQs (a minus mark) and which TITA
 * (none), the time split, and the 99 target. Steps: 0 the questions, 1 the VA mix, 2 MCQs, 3 TITA, 4 time, 5 the score.
 */
const VA_TYPES: { name: string; tita: boolean }[] = [
  { name: "Para summary", tita: false }, { name: "Sentence insertion", tita: false },
  { name: "Odd sentence out", tita: true }, { name: "Para jumbles", tita: true },
];
const VARC_BAR: [number, number, number, string][] = [[0, 28, 4, "bg-primary"], [28, 40, 4, "bg-primary/45"]];

export function ReadingMinutes({ step }: { step: number }) {
  // A tile's state at this step: lit (blue tint), solid (the TITA answer to always attempt), dimmed, or plain.
  const tile = (kind: "rc" | "mcq" | "tita") => {
    const lit = (step === 1 && kind !== "rc") || (step === 2 && kind !== "tita");
    const solid = step === 3 && kind === "tita";
    const dim = (step === 1 && kind === "rc") || (step === 2 && kind === "tita") || (step === 3 && kind !== "tita");
    const tag = step === 2 && kind !== "tita" ? "MCQ, −1 if wrong" : step === 3 && kind === "tita" ? "TITA, no minus" : "\u00a0";
    return { cls: cn(EASE, solid ? "bg-primary text-primary-foreground" : lit ? "bg-primary/12 text-primary" : "bg-secondary", dim ? "opacity-45" : "opacity-100", lit || solid ? "-translate-y-1" : "translate-y-0"), tag };
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary">
          {VARC_BAR.map(([a, b, at, tone]) => (
            <span key={a} className={cn("absolute inset-y-0 origin-left rounded-full", tone, EASE, step >= at ? "scale-x-100" : "scale-x-0")}
              style={{ left: `${(a / 40) * 100}%`, width: `calc(${((b - a) / 40) * 100}% - 2px)` }} />
          ))}
        </div>
        <div className="relative flex justify-between text-sm text-muted-foreground tabular-nums">
          <span>0 min</span>
          <span className={cn("absolute left-[35%] -translate-x-1/2 whitespace-nowrap normal-nums", EASE, step === 4 ? "opacity-100" : "opacity-0")}>RC, about 28</span>
          <span className={cn("absolute left-[85%] -translate-x-1/2 whitespace-nowrap normal-nums", EASE, step === 4 ? "opacity-100" : "opacity-0")}>VA</span>
          <span className={cn("hl absolute left-1/2 -translate-x-1/2 font-semibold whitespace-nowrap text-foreground normal-nums", EASE, step >= 5 ? "opacity-100" : "opacity-0")}>15 to 17 right: a 99</span>
          <span>40 min</span>
        </div>
      </div>
      <ol className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {[1, 2, 3, 4].map((k) => {
          const t = tile("rc");
          return (
            <li key={k} className={cn("flex flex-col items-center gap-0.5 rounded-xl px-1 py-3 text-center sm:py-4", t.cls)}>
              <span className="text-sm">Passage {k}</span>
              <span className="text-heading leading-tight font-bold tabular-nums xl:text-title">4</span>
              <span className="text-sm max-sm:hidden">{t.tag}</span>
            </li>
          );
        })}
      </ol>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-3">
        {VA_TYPES.map((v) => {
          const t = tile(v.tita ? "tita" : "mcq");
          return (
            <li key={v.name} className={cn("flex flex-col gap-1.5 rounded-xl px-3 py-3", t.cls)}>
              <span className="text-sm font-medium">{v.name}</span>
              {/* Pinned to the tile's foot, so the dots line up across a row whether the name takes one line or two. */}
              <span className="mt-auto flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-current" /><span className="size-2.5 rounded-full bg-current" /></span>
                <span className="text-sm">{t.tag}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
