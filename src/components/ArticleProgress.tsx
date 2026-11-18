import { useEffect, useRef, useState } from "react";
import type { JobState } from "../lib/articleJobs";

/**
 * The progress of an article set (F34), in plain words: a bar that moves with the real stage the server reports (in
 * line, writing, checking, a pause for the AI's limit), gliding within a stage and slowing near its end so it never
 * freezes and never runs backwards. Under reduced motion it steps without gliding.
 */
type Stage = "sending" | "queued" | "writing" | "checking" | "waiting";
const SPAN: Record<Exclude<Stage, "waiting">, [number, number, number]> = {
  // from %, to %, seconds to cover most of the way
  sending: [2, 5, 2], queued: [5, 12, 10], writing: [15, 60, 18], checking: [65, 92, 10],
};

function headline(stage: Stage, ahead: number): string {
  switch (stage) {
    case "sending": return "Sending your article";
    case "queued": return ahead > 0 ? `In line: ${ahead} ${ahead === 1 ? "set" : "sets"} ahead of you` : "In line: you're next";
    case "writing": return "Writing your questions";
    case "checking": return "Double-checking the answers";
    case "waiting": return "Taking a short pause; the AI is busy";
  }
}

function detail(stage: Stage): string {
  switch (stage) {
    case "sending": case "queued": return "Sets are made one at a time, so each gets the AI's full attention.";
    case "writing": return "Four questions in the CAT style, from the paragraphs you chose.";
    case "checking": return "A second AI answers them without the key; any it gets wrong are left out.";
    case "waiting": return "The free AI takes a few requests a minute. It carries on by itself.";
  }
}

const calm = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** note: the last line; the extension's panel says the set opens there, the site says any page will tell. */
export default function ArticleProgress({ job, note = "You can leave this page and carry on: we will tell you on any page when it is ready." }: { job: JobState | { phase: "starting" }; note?: string }) {
  const stage: Stage = job.phase === "starting" ? "sending" : (job as JobState).stage ?? "queued";
  const ahead = job.phase === "starting" ? 0 : (job as JobState).ahead ?? 0;
  const [pct, setPct] = useState(2);
  const since = useRef({ stage, at: Date.now() });
  if (since.current.stage !== stage) since.current = { stage, at: Date.now() };

  useEffect(() => {
    const tick = () => {
      const { stage: s, at } = since.current;
      if (s === "waiting") return; // hold still while the AI's limit clears
      const [from, to, tau] = SPAN[s];
      const t = (Date.now() - at) / 1000;
      const target = from + (to - from) * (1 - Math.exp(-t / tau));
      setPct((p) => Math.max(p, target));
    };
    tick();
    const id = setInterval(tick, calm() ? 3000 : 250);
    return () => clearInterval(id);
  }, [stage]);

  const words = headline(stage, ahead);
  return (
    <section className="flex flex-col gap-3 rounded-lg bg-card p-5" aria-live="polite">
      <h2 className="text-lg font-semibold">{words}</h2>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Making your set" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-valuetext={words}>
        <div className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <p className="text-base text-muted-foreground">{detail(stage)}</p>
      <p className="text-sm text-muted-foreground">{note}</p>
    </section>
  );
}
