import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LinkButton, Meta, Section, TextLink } from "../../components/kit";
import type { Cause, ErrorEntry, Recommendation } from "../../lib/state";
import { useStore } from "../../lib/store";
import { AFTER_MIN, tracked, type Measured } from "../../practice/recs";
import { filterHref, matches, type ErrorFilter } from "../../practice/errorfilter";

const STATE: Record<Measured["state"], { label: string; tone: "success" | "secondary" | "danger" | "highlight" }> = {
  fixed: { label: "Fixed", tone: "success" },
  better: { label: "Getting better", tone: "secondary" },
  notyet: { label: "Not yet", tone: "danger" },
  early: { label: "Too early to tell", tone: "secondary" },
  unmeasured: { label: "Working on it", tone: "secondary" },
};
const FROM: Record<Recommendation["from"], string> = { mock: "From a mock review", week: "From a weekly review", next: "From your next step" };

function Evidence({ m }: { m: Measured }) {
  if (m.state === "unmeasured") return <Meta>{m.rec.status === "done" ? "You marked it done." : "Tick it off when you have worked on it."}</Meta>;
  if (m.state === "early") return <Meta>{m.n} of {AFTER_MIN} questions done since, so too few to judge. Before: {m.before}%.</Meta>;
  return <Meta>{m.before}% before, {m.after}% on the {m.n} questions since.</Meta>;
}

/** The weak spot's entries in the Error log (F52), for a type or cause with at least one entry. */
function mistakes(rec: Recommendation, errors: ErrorEntry[]): string | undefined {
  const f: ErrorFilter | null = rec.skill.kind === "type" ? { sec: rec.sec, t: rec.skill.key } : rec.skill.kind === "cause" ? { sec: rec.sec, cause: rec.skill.key as Cause } : null;
  return f && errors.some((e) => matches(e, f, null)) ? filterHref(f) : undefined;
}

/** Weak spots picked in mock and weekly reviews, and whether practice since has moved them (F43). */
export function Fixing() {
  const { state, update } = useStore();
  const rows = tracked(state).slice(0, 6);
  const setStatus = (id: string, status: Recommendation["status"]) => update((st) => { const x = st.recs.find((r) => r.id === id); if (x) { x.status = status; x.updatedAt = Date.now(); } });
  return (
    <Section id="fixing" title="Weak spots you are fixing" className="scroll-mt-24" description="Each one keeps your accuracy from when it was picked, so you can see whether practice since has moved it.">
      {rows.length ? (
        <ul className="flex flex-col gap-px overflow-hidden rounded-xl bg-background">
          {rows.map((m) => (
            <li key={m.rec.id} className={cn("flex flex-col gap-2 bg-card px-5 py-4 sm:px-6", m.rec.status === "done" && m.state === "unmeasured" && "opacity-70")}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATE[m.state].tone}>{STATE[m.state].label}</Badge>
                <Meta>{FROM[m.rec.from]}</Meta>
              </div>
              <p className="measure text-base font-semibold">{m.rec.text}</p>
              <Evidence m={m} />
              <div className="flex flex-wrap gap-2">
                {m.rec.to && m.state !== "fixed" && <LinkButton to={m.rec.to} variant="secondary" size="sm">Practise it</LinkButton>}
                {mistakes(m.rec, state.errors) && <LinkButton to={mistakes(m.rec, state.errors)!} variant="ghost" size="sm">See your mistakes</LinkButton>}
                {m.state === "unmeasured" && m.rec.status === "open" && <Button variant="ghost" size="sm" onClick={() => setStatus(m.rec.id, "done")}>Mark as done</Button>}
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setStatus(m.rec.id, "dismissed")}>Not for me</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Meta>Nothing yet. <TextLink to="/progress/mock-review">Analyse a mock</TextLink> or do the <TextLink to="/review">weekly review</TextLink> to pick a weak spot, and this shows whether it is getting fixed.</Meta>
      )}
    </Section>
  );
}
