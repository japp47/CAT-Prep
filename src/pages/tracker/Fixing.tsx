import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LinkButton, Meta, Section, TextLink } from "../../components/kit";
import { todayIso } from "../../lib/date";
import type { Cause, ErrorEntry, Recommendation } from "../../lib/state";
import { useStore } from "../../lib/store";
import { AFTER_MIN, readiness, tracked, trend, type Measured } from "../../practice/recs";
import { filterHref, matches, type ErrorFilter } from "../../practice/errorfilter";

/** Progress opens on three plain answers (docs/feature.md, F44); the tabs below hold the detail. */
export function ThreeAnswers() {
  const { state } = useStore();
  const t = trend(state, todayIso());
  const fixing = tracked(state);
  const counts = { fixed: 0, better: 0, early: 0, notyet: 0 };
  fixing.forEach((m) => { if (m.state in counts) counts[m.state as keyof typeof counts]++; });
  const r = readiness(state);
  const parts = [counts.fixed && `${counts.fixed} fixed`, counts.better && `${counts.better} getting better`, counts.notyet && `${counts.notyet} not yet`, counts.early && `${counts.early} too early to tell`].filter(Boolean);

  const cards: { q: string; a: string; link?: [string, string] }[] = [
    {
      q: "Are you improving?",
      a: t.now != null && t.before != null
        ? `Accuracy over the last two weeks is ${t.now}%, ${t.now === t.before ? "the same as" : `${Math.abs(t.now - t.before)} points ${t.now > t.before ? "up on" : "down on"}`} the two weeks before.`
        : `A trend needs 20 questions in each of two fortnights. You have ${t.n} in the last two weeks.`,
      link: t.now == null ? ["/practice", "Practise"] : undefined,
    },
    {
      q: "Are your weak spots getting fixed?",
      a: parts.length ? parts.join(", ") + "." : "Nothing picked yet. A mock review or the weekly review picks a weak spot to work on.",
      link: parts.length ? ["#fixing", "See them"] : ["/review", "Weekly review"],
    },
    {
      q: "Are you exam ready?",
      a: r ? `Your last ${r.count === 1 ? "result" : `${r.count} results`} averaged ${r.avg} right; your target needs ${r.band[0]} to ${r.band[1]}.` : "Take a timed sectional or log a mock to see how practice holds up under time.",
      link: r ? undefined : ["/practice/sectional", "Take a sectional"],
    },
  ];
  return (
    <ul className="grid gap-px overflow-hidden rounded-lg bg-background md:grid-cols-3">
      {cards.map((c) => (
        <li key={c.q} className="flex flex-col gap-2 bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">{c.q}</h2>
          <p className="text-base text-foreground/85">{c.a}</p>
          {c.link && (c.link[0].startsWith("#")
            ? <a href={c.link[0]} className="mt-auto w-fit pt-1 font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">{c.link[1]}</a>
            : <TextLink to={c.link[0]} className="mt-auto w-fit pt-1">{c.link[1]}</TextLink>)}
        </li>
      ))}
    </ul>
  );
}

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
