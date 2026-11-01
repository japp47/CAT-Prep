import { Link } from "react-router-dom";
import { shortDate } from "../../lib/date";
import type { LrDrillRun } from "../../lib/state";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { LinkButton, Page, PageHeader, Section } from "../../components/kit";
import { nextOf } from "../../practice/lrdrill";
import { boardOf, FORMAT, FORMATS, modelOf, type ReplayPuzzle } from "../../practice/replay";
import { Row, Rows } from "./rows";

/** DILR Replay (F57): every replay set by format, and the one to do next. */
export default function Replay() {
  return <ContentGate need={{ drills: true }}>{(c) => <List all={c.lrDrills!.replay} />}</ContentGate>;
}

/** The board's size in words: "a 5 by 5 grid", "two grids", "6 matches". */
function size(p: ReplayPuzzle): string {
  const g = boardOf(modelOf(p));
  if (g.length > 1) return `${g.length === 2 ? "two" : g.length === 3 ? "three" : g.length} grids`;
  if (g[0].perRow) return `${g[0].rows.length} matches`;
  const n = g[0].rows.length;
  return `${/^(8|11|18)/.test(String(n)) ? "an" : "a"} ${n} by ${g[0].cols.length} grid`;
}

function status(last: LrDrillRun | undefined): string | null {
  if (!last) return null;
  const c = last.items.filter((i) => i.ok).length, n = last.items.length;
  const alone = last.items[0]?.k.includes(":");
  return `${alone ? "Solved alone" : "Done step by step"} on ${shortDate(last.d)}, ${c} of ${n} ${alone ? "rows right first time" : "steps without a slip"}`;
}

function List({ all }: { all: ReplayPuzzle[] }) {
  const { state } = useStore();
  const runs = state.lrDrills.filter((r) => r.kind === "replay");
  const lastOf = (id: string) => runs.filter((r) => r.ref === id).pop();
  const next = nextOf(all, (p) => p.id, runs, "replay");
  const done = new Set(runs.map((r) => r.ref)).size;
  const solved = new Set(state.lrAttempts.map((a) => a.set));
  return (
    <Page className="gap-8 lg:gap-10">
      <PageHeader title="DILR replay" back={{ to: "/dilr/practice", label: "DILR practice" }}>
        A written solution shows the finished table, not how anyone got there. Here the clues meet a board one step at a time, and after every step you see how many arrangements are still possible, worked out by solving the set in code.
      </PageHeader>

      {next && (
        <Section title="Next set">
          <Rows>
            <Row next title={<Link to={`/practice/replay/${next.id}`} className="hover:text-primary">{next.title}</Link>}
              action={<LinkButton to={`/practice/replay/${next.id}`}>{lastOf(next.id) ? "Do it again" : "Start"}</LinkButton>}>
              <p>{FORMAT[next.format].label}. {next.skill}. {next.clues.length} clues, {size(next)}.</p>
              <p>{done ? `You have done ${done} of ${all.length} sets.` : "Your first two sets go step by step; after that you solve alone, with hints. Watch is always one tap away."}</p>
            </Row>
          </Rows>
        </Section>
      )}

      {FORMATS.map((f) => {
        const list = all.filter((p) => p.format === f);
        if (!list.length) return null;
        return (
          <Section key={f} title={FORMAT[f].label} description={FORMAT[f].about}>
            <ul className="grid gap-3 md:grid-cols-2">
              {list.map((p) => {
                const s = status(lastOf(p.id));
                return (
                  <li key={p.id}>
                    <Link to={`/practice/replay/${p.id}`} className="group flex h-full flex-col gap-2 rounded-xl bg-card p-5 transition-colors hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-6">
                      <span className="text-heading font-semibold group-hover:text-primary">{p.title}</span>
                      <span className="text-base text-muted-foreground">{p.skill}. {p.clues.length} clues, {size(p)}.</span>
                      <span className="mt-auto pt-1 text-sm text-muted-foreground">{s ?? (p.set ? (solved.has(p.set) ? "The replay of an LR set you have solved" : "The replay of an LR set: solve that set first") : "Not tried yet")}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}

      <p className="measure text-sm text-muted-foreground">Every replay set is original practice material written for this site. Each one has exactly one answer, proven by the solver, and every clue is needed.</p>
    </Page>
  );
}
