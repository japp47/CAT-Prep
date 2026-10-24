import { LinkButton, LogList, Meta, Section, TextLink } from "../../components/kit";
import { shortDate } from "../../lib/date";
import type { AppState, Mock } from "../../lib/state";
import { useStore } from "../../lib/store";
import { acrossReviews, findings } from "../../practice/mockreview";

/** Where to analyse a logged result: a sectional on this site is filled in from its record. */
export function analyseLink(st: AppState, m: Mock) {
  const att = m.k === "Sectional" && m.id.endsWith("m") ? st.sectionals.find((s) => s.id === m.id.slice(0, -1)) : undefined;
  return att ? `/progress/mock-review?sectional=${att.id}` : `/progress/mock-review?mock=${m.id}`;
}

/** Mock reviews on the Mocks tab: results still to analyse, past reviews, and the pattern across them. */
export function MockReviews({ sec }: { sec: string }) {
  const { state } = useStore();
  const reviewed = new Set(state.mockReviews.map((r) => r.mock));
  const byDate = <T extends { d: string }>(a: T, b: T) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  const todo = state.mocks.filter((m) => m.sec === sec && !reviewed.has(m.id)).sort(byDate).slice(0, 3);
  const reviews = state.mockReviews.filter((r) => r.sec === sec).sort(byDate);
  const across = acrossReviews(state.mockReviews, sec);
  const open = (id: string) => state.recs.filter((x) => x.src === id && x.status === "open").length;

  return (
    <Section title="Mock reviews" action={<LinkButton to="/progress/mock-review" variant="secondary" size="sm">Analyse a mock</LinkButton>}
      description={`After each mock, review its ${sec} section to see where the marks went and choose up to three things to fix before the next one. Log the result in the same section to keep its score history together.`}>
      {todo.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">Not analysed yet</h3>
          <ul className="flex flex-col gap-1 rounded-lg bg-card p-1.5">
            {todo.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md px-3.5 py-3">
                <span className="text-base">{m.n || m.k}<span className="text-muted-foreground">, {shortDate(m.d)}, score {3 * m.c - m.w}</span></span>
                <TextLink to={analyseLink(state, m)}>Analyse it</TextLink>
              </li>
            ))}
          </ul>
        </div>
      )}
      {reviews.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">Your reviews</h3>
          <LogList empty="">
            {reviews.slice(0, 5).map((r) => {
              const f = findings(r), top = [...f.groups].filter((g) => g.key !== "unsorted").sort((a, b) => b.marks - a.marks)[0], n = open(r.id);
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md px-3.5 py-3">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-base font-semibold">{r.name || "Mock"}<span className="font-normal text-muted-foreground">, {shortDate(r.d)}, score {f.score}</span></span>
                    <Meta>{top ? `Most marks lost: ${top.label.toLowerCase()}, ${top.marks}.` : "No marks lost to a single cause."}{n ? ` ${n === 1 ? "1 action" : `${n} actions`} open.` : ""}</Meta>
                  </span>
                  <TextLink to={`/progress/mock-review/${r.id}`}>Open</TextLink>
                </li>
              );
            })}
          </LogList>
        </div>
      ) : todo.length === 0 && <Meta>No reviews yet. Log a mock in the Log tab or take a timed sectional, then analyse it here.</Meta>}
      {across.count >= 2 && across.groups.length > 0 && (
        <p className="text-base">Across your last {across.count} reviews, most marks went to <b className="font-semibold">{across.groups[0].label.toLowerCase()}</b> ({across.groups[0].marks}){across.groups[1] ? `, then ${across.groups[1].label.toLowerCase()} (${across.groups[1].marks})` : ""}.</p>
      )}
    </Section>
  );
}
