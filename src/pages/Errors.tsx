import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bars } from "../components/Chart";
import { ErrorText, Field, LinkButton, Meta, Page, PageHeader, Section, Segmented, TextLink, useDeleteWithUndo } from "../components/kit";
import { NativeSelect } from "../components/Select";
import { CAUSES, TRAPS } from "../data/traps";
import { CAUSE_IDS, type Cause, type ErrorEntry } from "../lib/state";
import { patterns } from "../practice/report";
import { errorLink } from "../practice/errorlink";
import { shortDate, todayIso, uid } from "../lib/date";
import { useStore } from "../lib/store";
import { SECTION_LABELS, sectionByLabel } from "../sections";

/** Edit an entry's diagnosis and notes. The first trap and cause are kept when corrected. */
function EditEntry({ e, onDone }: { e: ErrorEntry; onDone: () => void }) {
  const { update } = useStore();
  // The dropdown cannot hold an empty value, so "none" stands for "not set".
  const [trap, setTrap] = useState(e.trap || "none");
  const [cause, setCause] = useState<string>(e.cause ?? "none");
  const [why, setWhy] = useState(e.why);
  const [fix, setFix] = useState(e.fix);
  const save = () => {
    update((st) => {
      const x = st.errors.find((y) => y.id === e.id);
      if (!x) return;
      const t = trap === "none" ? "" : trap;
      if (t !== x.trap) { if (x.trapWas === undefined) x.trapWas = x.trap; x.trap = t; }
      const c = cause === "none" ? undefined : (cause as Cause);
      if (c !== x.cause) { if (x.cause && !x.causeWas) x.causeWas = x.cause; if (c) x.cause = c; else delete x.cause; }
      x.why = why.trim();
      x.fix = fix.trim();
    });
    onDone();
  };
  return (
    <div className="mt-3 grid gap-4 rounded-xl bg-muted p-4 sm:grid-cols-2 sm:p-5">
      <Field label="What the wrong option did"><NativeSelect value={trap} onChange={(ev) => setTrap(ev.target.value)}><option value="none">Not set</option>{TRAPS.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
      <Field label="What happened to you"><NativeSelect value={cause} onChange={(ev) => setCause(ev.target.value)}><option value="none">Not set</option>{CAUSE_IDS.map((c) => <option key={c} value={c}>{CAUSES[c]}</option>)}</NativeSelect></Field>
      <Field label="Why it went wrong" className="sm:col-span-2"><Textarea value={why} onChange={(ev) => setWhy(ev.target.value)} placeholder="What did you miss or assume?" /></Field>
      <Field label="The right reasoning" className="sm:col-span-2"><Textarea value={fix} onChange={(ev) => setFix(ev.target.value)} placeholder="What evidence leads to the right answer?" /></Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button size="sm" variant="secondary" onClick={save}>Save changes</Button><Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
    </div>
  );
}

export default function Errors() {
  const { state, update } = useStore();
  const remove = useDeleteWithUndo();
  const [sec, setSec] = useState("VARC");
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState<string | null>(null);
  const found = patterns(state.errors, state.practice, todayIso());

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    const g = (k: string) => String(fd.get(k) ?? "").trim();
    if (!g("why") && !g("fix") && !g("src")) { setErr("Add where it was from, why it went wrong, or the right reasoning."); return; }
    setErr("");
    update((st) => { st.errors.push({ id: uid(), d: todayIso(), sec, t: g("t"), trap: g("trap"), src: g("src"), why: g("why"), fix: g("fix") }); });
    ["src", "why", "fix"].forEach((k) => ((f.elements.namedItem(k) as HTMLInputElement).value = ""));
  };

  const byType: Record<string, number> = {}, byTrap: Record<string, number> = {};
  state.errors.forEach((e) => {
    const k = e.sec === "VARC" ? e.t : e.sec + ": " + e.t;
    byType[k] = (byType[k] || 0) + 1;
    if (e.trap) byTrap[e.trap] = (byTrap[e.trap] || 0) + 1;
  });
  const list = state.errors.filter((e) => filter === "All" || e.sec === filter).slice().reverse();

  return (
    <Page>
      <PageHeader title="Error log">Keep the question, what tripped you up, and the reasoning that will help next time. Your patterns and counts make the habits easier to spot.</PageHeader>

      {found.length > 0 ? (
        <Section title="Patterns" description="The same mistake on the same kind of question, four times or more in the last 30 days. Fix the habit, not just the question.">
          <ul className="grid gap-3 sm:grid-cols-2">
            {found.map((p) => (
              <li key={p.key} className="flex min-w-0 flex-col items-start justify-between gap-4 rounded-xl bg-card p-5 sm:p-6">
                <span className="text-base leading-relaxed">{p.text}</span>
                <TextLink to={p.to}>Practise this pattern</TextLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : state.errors.length > 0 && <Meta>Patterns appear once the same trap or cause catches you four times on one kind of question within 30 days.</Meta>}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <Section title="Question types to revisit"><div className="min-h-36 rounded-xl bg-card p-5 sm:p-6"><Bars counts={byType} empty="Counts appear after your first entry." /></div></Section>
        <Section title="Traps to watch for"><div className="min-h-36 rounded-xl bg-card p-5 sm:p-6"><Bars counts={byTrap} empty="Counts appear after your first entry." /></div></Section>
      </div>

      <Section title="Add a mistake">
        <form className="grid gap-x-6 gap-y-5 rounded-xl bg-card p-5 sm:p-6 lg:grid-cols-2" onSubmit={add} autoComplete="off">
          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
            <Field label="Section"><NativeSelect value={sec} onChange={(e) => setSec(e.target.value)}>{SECTION_LABELS.map((s) => <option key={s}>{s}</option>)}</NativeSelect></Field>
            <Field label="Question type"><NativeSelect name="t" key={sec}>{sectionByLabel(sec).errorTypes.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
            <Field label="What got you"><NativeSelect name="trap">{TRAPS.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
          </div>
          <Field label="Where from" className="lg:col-span-2"><Input name="src" placeholder="CAT 2019 Slot 2, RC 3, Q14" /></Field>
          <Field label="Why it went wrong"><Textarea name="why" placeholder="I picked the option that sounded most like the author." /></Field>
          <Field label="The right reasoning"><Textarea name="fix" placeholder="The passage only says X in paragraph 3, so the option that adds Y is out of scope." /></Field>
          <div className="flex flex-col items-start gap-2 lg:col-span-2"><Button type="submit">Add to log</Button><ErrorText>{err}</ErrorText></div>
        </form>
      </Section>

      <Section title={`Your log (${list.length})`} action={<Segmented className="w-full sm:w-fit" label="Filter by section" value={filter} onChange={setFilter} options={["All", ...SECTION_LABELS]} />}>
        {list.length ? (
          <ul className="flex flex-col gap-3">
            {list.map((e) => (
              <li key={e.id} className="min-w-0 rounded-xl bg-card p-4 sm:p-6">
                {editing === e.id ? (
                  <EditEntry e={e} onDone={() => setEditing(null)} />
                ) : (
                  <div className="flex min-w-0 flex-col gap-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-2">
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{e.sec}</Badge><Badge variant="default">{e.t}</Badge>{e.trap && <Badge variant="danger">{e.trap}</Badge>}{e.cause && <Badge variant="secondary">{CAUSES[e.cause]}</Badge>}
                        </span>
                        <Meta>{shortDate(e.d)}{e.src ? `, ${e.src}` : ""}</Meta>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-danger" aria-label="Delete this entry" onClick={() => remove("errors", e.id, "Entry")}>Delete</Button>
                    </div>
                    {(e.why || e.fix) ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {e.why && <p className="min-w-0 text-base leading-relaxed"><b className="font-semibold">Why it went wrong</b><br />{e.why}</p>}
                        {e.fix && <p className="min-w-0 text-base leading-relaxed"><b className="font-semibold">The right reasoning</b><br />{e.fix}</p>}
                      </div>
                    ) : <p className="text-base text-muted-foreground">Add what happened and the reasoning you want to remember.</p>}
                    <QuestionLinks e={e} />
                    <Button variant="link" size="sm" className="h-auto self-start cursor-pointer px-0 text-base" onClick={() => setEditing(e.id)}>
                      {e.why ? "Edit mistake details" : "Add why it happened"}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl bg-card p-5 sm:p-6">
            <p className="text-base text-muted-foreground">No mistakes logged yet. After each timed set, add one entry per wrong or skipped question.</p>
          </div>
        )}
      </Section>
    </Page>
  );
}

/**
 * Back to the question (docs/feature.md F52): its review at that question, with the passage and explanation, and
 * "Try it again" with the answer hidden, which counts in the redo queue. Hand-written and mock entries have neither.
 */
function QuestionLinks({ e }: { e: ErrorEntry }) {
  const { state } = useStore();
  const link = errorLink(e, state);
  if (!link || (!link.review && !link.retry)) return null;
  return (
    <span className="flex flex-wrap gap-2 pt-1">
      {link.retry && <LinkButton to={"/practice/redo?k=" + encodeURIComponent(link.key)} variant="secondary" size="sm">Try it again</LinkButton>}
      {link.review && <LinkButton to={link.review} variant="outline" size="sm">See the question</LinkButton>}
    </span>
  );
}
