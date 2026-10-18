import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bars } from "../components/Chart";
import { ErrorText, Field, LogList, LogRow, Meta, Page, PageHeader, Section, Segmented, useDeleteWithUndo } from "../components/kit";
import { NativeSelect } from "../components/Select";
import { TRAPS } from "../data/traps";
import { shortDate, todayIso, uid } from "../lib/date";
import { useStore } from "../lib/store";
import { SECTION_LABELS, sectionByLabel } from "../sections";

export default function Errors() {
  const { state, update } = useStore();
  const remove = useDeleteWithUndo();
  const [sec, setSec] = useState("VARC");
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("All");

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
                <Badge variant="secondary">{e.sec}</Badge><Badge variant="default">{e.t}</Badge>{e.trap && <Badge variant="danger">{e.trap}</Badge>}
              </span>
              <Meta>{shortDate(e.d)}{e.src ? `, ${e.src}` : ""}</Meta>
              {e.why && <p className="measure text-base"><b className="font-semibold">Went wrong.</b> {e.why}</p>}
              {e.fix && <p className="measure text-base"><b className="font-semibold">Right reasoning.</b> {e.fix}</p>}
            </LogRow>
          ))}
        </LogList>
      </Section>
    </Page>
  );
}
