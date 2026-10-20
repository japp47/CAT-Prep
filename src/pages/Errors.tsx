import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bars } from "../components/Chart";
import { ErrorText, Field, LogList, LogRow, Meta, Page, PageHeader, Section, Segmented, TextLink, useDeleteWithUndo } from "../components/kit";
import { NativeSelect } from "../components/Select";
import { CAUSES, TRAPS } from "../data/traps";
import { CAUSE_IDS, type Cause, type ErrorEntry } from "../lib/state";
import { patterns } from "../practice/report";
import { shortDate, todayIso, uid } from "../lib/date";
import { useStore } from "../lib/store";
import { SECTION_LABELS, sectionByLabel } from "../sections";

/** Change an entry's trap or cause. The first values are kept (trapWas, causeWas), so a correction never hides what was logged. */
function EditEntry({ e, onDone }: { e: ErrorEntry; onDone: () => void }) {
  const { update } = useStore();
  // The dropdown cannot hold an empty value, so "none" stands for "not set".
  const [trap, setTrap] = useState(e.trap || "none");
  const [cause, setCause] = useState<string>(e.cause ?? "none");
  const save = () => {
    update((st) => {
      const x = st.errors.find((y) => y.id === e.id);
      if (!x) return;
      const t = trap === "none" ? "" : trap;
      if (t !== x.trap) { if (x.trapWas === undefined) x.trapWas = x.trap; x.trap = t; }
      const c = cause === "none" ? undefined : (cause as Cause);
      if (c !== x.cause) { if (x.cause && !x.causeWas) x.causeWas = x.cause; if (c) x.cause = c; else delete x.cause; }
    });
    onDone();
  };
  return (
    <div className="mt-2 grid gap-3 rounded-lg bg-muted/60 p-4 sm:grid-cols-2">
      <Field label="What the wrong option did"><NativeSelect value={trap} onChange={(ev) => setTrap(ev.target.value)}><option value="none">Not set</option>{TRAPS.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
      <Field label="What happened to you"><NativeSelect value={cause} onChange={(ev) => setCause(ev.target.value)}><option value="none">Not set</option>{CAUSE_IDS.map((c) => <option key={c} value={c}>{CAUSES[c]}</option>)}</NativeSelect></Field>
      <div className="flex gap-2 sm:col-span-2"><Button size="sm" variant="secondary" onClick={save}>Save</Button><Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
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
      <PageHeader title="Error log">One entry for every question you got wrong or skipped. The counts show which question types and traps cost you most.</PageHeader>

      {found.length > 0 ? (
        <Section title="Patterns" description="The same mistake on the same kind of question, four times or more in the last 30 days. Fix the habit, not just the question.">
          <ul className="flex flex-col gap-1 rounded-lg bg-card p-1.5">
            {found.map((p) => (
              <li key={p.key} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-md px-3.5 py-3">
                <span className="measure text-base">{p.text}</span>
                <TextLink to={p.to}>Drill it</TextLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : state.errors.length > 0 && <Meta>Patterns appear once the same trap or cause catches you four times on one kind of question within 30 days.</Meta>}

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
        <Section title="Weakest question types"><div className="rounded-lg bg-card p-5 sm:p-6"><Bars counts={byType} empty="Counts appear after your first entry." /></div></Section>
        <Section title="Traps that got you"><div className="rounded-lg bg-card p-5 sm:p-6"><Bars counts={byTrap} empty="Counts appear after your first entry." /></div></Section>
      </div>

      <Section title="Add a mistake">
        <form className="grid gap-4 rounded-lg bg-card p-5 sm:grid-cols-3 sm:p-6" onSubmit={add} autoComplete="off">
          <Field label="Section"><NativeSelect value={sec} onChange={(e) => setSec(e.target.value)}>{SECTION_LABELS.map((s) => <option key={s}>{s}</option>)}</NativeSelect></Field>
          <Field label="Question type"><NativeSelect name="t" key={sec}>{sectionByLabel(sec).errorTypes.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
          <Field label="What got you"><NativeSelect name="trap">{TRAPS.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
          <Field label="Where from" className="sm:col-span-3"><Input name="src" placeholder="CAT 2019 Slot 2, RC 3, Q14" /></Field>
          <Field label="Why it went wrong" className="sm:col-span-3"><Textarea name="why" placeholder="I picked the option that sounded most like the author." /></Field>
          <Field label="The right reasoning" className="sm:col-span-3"><Textarea name="fix" placeholder="The passage only says X in paragraph 3, so the option that adds Y is out of scope." /></Field>
          <div className="flex flex-col gap-2 sm:col-span-3"><Button type="submit" className="self-start">Add to log</Button><ErrorText>{err}</ErrorText></div>
        </form>
      </Section>

      <Section title={`Your log (${list.length})`} action={<Segmented label="Filter by section" value={filter} onChange={setFilter} options={["All", ...SECTION_LABELS]} />}>
        <LogList empty="No mistakes logged yet. After each timed set, add one entry per wrong or skipped question.">
          {list.map((e) => (
            <LogRow key={e.id} label="Delete this entry" onDelete={() => remove("errors", e.id, "Entry")}>
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{e.sec}</Badge><Badge variant="default">{e.t}</Badge>{e.trap && <Badge variant="danger">{e.trap}</Badge>}{e.cause && <Badge variant="secondary">{CAUSES[e.cause]}</Badge>}
              </span>
              <Meta>{shortDate(e.d)}{e.src ? `, ${e.src}` : ""}</Meta>
              {e.why && <p className="measure text-base"><b className="font-semibold">Went wrong.</b> {e.why}</p>}
              {e.fix && <p className="measure text-base"><b className="font-semibold">Right reasoning.</b> {e.fix}</p>}
              {editing === e.id
                ? <EditEntry e={e} onDone={() => setEditing(null)} />
                : <Button variant="link" size="sm" className="h-auto self-start px-0 text-sm" onClick={() => setEditing(e.id)}>{e.cause ? "Change trap or cause" : "Add why it happened"}</Button>}
            </LogRow>
          ))}
        </LogList>
      </Section>
    </Page>
  );
}
