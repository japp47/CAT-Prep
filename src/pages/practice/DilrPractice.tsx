import { useState } from "react";
import { Link } from "react-router-dom";
import { PAPERS_PAGE } from "../../data/papers";
import { uid } from "../../lib/date";
import type { LrAttempt } from "../../lib/state";
import { useStore } from "../../lib/store";
import { LinkButton, Section, TextLink } from "../../components/kit";
import { LR_CATALOG } from "../../practice/catalog.gen";
import { LR_TYPE, LR_TYPES, type LrMeta } from "../../practice/types";
import { PaperRow, Row, Rows } from "./rows";

const LEVEL = { easy: 0, medium: 1, hard: 2 } as const;
/** Easiest first, then shorter first: the order a student should meet the sets in. */
export const LR_ORDER = [...LR_CATALOG].sort((a, b) => LR_TYPES.indexOf(a.type) - LR_TYPES.indexOf(b.type) || LEVEL[a.difficulty] - LEVEL[b.difficulty] || a.minutes - b.minutes);

/** Types the owner has written and that arrive next, one category at a time (docs/implement.md 4a.3). */
const NEXT_TYPES = "games and tournaments, reasoning-based caselets, routes and networks, set theory with maximum and minimum, and Venn diagrams with syllogisms";

const meta = (s: LrMeta) => { const t = [s.sub, s.difficulty, `${s.minutes} minutes`, `${s.questions} questions`].filter(Boolean).join(", "); return t[0].toUpperCase() + t.slice(1); };
const score = (s: LrMeta, a: LrAttempt) => `${3 * a.c - a.w} of ${3 * s.questions}`;

/** DILR practice: the next set to try, every LR set by type, and past papers. */
export default function DilrPractice({ next }: { next: LrMeta | undefined }) {
  const { state } = useStore();
  const [seed] = useState(uid);
  const last = new Map<string, LrAttempt>();
  state.lrAttempts.forEach((a) => last.set(a.set, a));
  const types = LR_TYPES.filter((t) => LR_ORDER.some((s) => s.type === t));

  return (
    <>
      <Section title="Next set">
        <Rows>
          {next ? (
            <Row next title={<Link to={`/practice/lr/${next.id}`} className="hover:text-primary">{next.title}</Link>}
              action={<LinkButton to={`/practice/lr/${next.id}`}>Start the set</LinkButton>}>
              <p>{LR_TYPE[next.type].label}. {meta(next)}. Read every clue, draw the {next.sub?.startsWith("circular") ? "table" : "seats"} in the scratch pad, and stop at the target time.</p>
            </Row>
          ) : (
            <Row title="You have tried every set" action={<LinkButton to="/dilr" variant="secondary">Sets on other sites</LinkButton>}>
              <p>Retake the ones you got wrong without looking at the walkthrough, or practise past CAT sets from the DILR page while new types arrive.</p>
            </Row>
          )}
        </Rows>
      </Section>

      <Section title="Logical reasoning sets"
        description={`${LR_ORDER.length} original sets, every answer checked by solving the set in code. Each has a timer, a scratch pad, a step-by-step solution drawn on the seats and a two-minute post-mortem.${last.size ? ` You have tried ${last.size}.` : ""}`}>
        <div className="flex flex-col gap-8">
          {types.map((t) => {
            const sets = LR_ORDER.filter((s) => s.type === t);
            return (
              <div key={t} className="flex flex-col gap-3">
                <h3 className="text-base font-semibold">{LR_TYPE[t].label}, {sets.length} sets</h3>
                <Rows>
                  {sets.map((s) => {
                    const a = last.get(s.id);
                    return (
                      <Row key={s.id} side title={<Link to={a ? `/practice/lr/${s.id}?review=${a.id}` : `/practice/lr/${s.id}`} className="hover:text-primary">{s.title}</Link>}
                        action={a
                          ? <><LinkButton to={`/practice/lr/${s.id}?review=${a.id}`} variant="secondary">Review</LinkButton><LinkButton to={`/practice/lr/${s.id}?n=${seed}`} variant="ghost" className="max-sm:hidden">Retake</LinkButton></>
                          : <LinkButton to={`/practice/lr/${s.id}`} variant="secondary">Start</LinkButton>}>
                        <p>{meta(s)}</p>
                        {a && <p className="text-foreground">Scored {score(s, a)}{a.pm?.key ? `; opened with clue ${a.pm.key}` : ""}</p>}
                      </Row>
                    );
                  })}
                </Rows>
              </div>
            );
          })}
          <p className="measure text-base text-muted-foreground">On the way, one type at a time: {NEXT_TYPES}. Data interpretation joins in December.</p>
        </div>
      </Section>

      <Section title="When you have more time">
        <Rows>
          <PaperRow>
            <p>Sit the DILR section of a past paper alone: 40 minutes, read all the sets first and pick two or three. Papers up to 2020 come with solutions, later ones with answer keys. From <TextLink to={PAPERS_PAGE}>Bodhee Prep</TextLink>.</p>
          </PaperRow>
          <Row title="Sets and sections on other sites" action={<LinkButton to="/dilr" variant="secondary">Open the DILR page</LinkButton>}>
            <p>Past CAT sets by topic, hundreds of sets with video solutions, free timed sections and mocks, all checked, on the DILR page's Practice tab.</p>
          </Row>
        </Rows>
      </Section>

      <p className="measure text-sm text-muted-foreground">Every set here is original practice material written for this site, not a real CAT question.</p>
    </>
  );
}
