import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorText, Field, LogList, LogRow, Meta, NativeSelect, Section, useDeleteWithUndo } from "../../components/kit";
import { shortDate, todayIso, uid } from "../../lib/date";
import { useStore } from "../../lib/store";
import { sectionByLabel } from "../../sections";

const KINDS = ["Past paper", "Full mock", "Sectional", "Official IIM mock"];
const sortDesc = <T extends { d: string }>(a: T, b: T) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0);

export function Log({ sec }: { sec: string }) {
  const { state, update } = useStore();
  const remove = useDeleteWithUndo();
  const def = sectionByLabel(sec);

  const [pErr, setPErr] = useState("");
  const addPractice = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    const d = String(fd.get("d")), a = parseInt(String(fd.get("a")), 10), c = parseInt(String(fd.get("c")), 10);
    if (!d) { setPErr("Pick the date."); return; }
    if (isNaN(a) || isNaN(c) || a < 1 || c < 0) { setPErr("Enter how many you attempted and how many were correct."); return; }
    if (c > a) { setPErr("Correct cannot be more than attempted."); return; }
    setPErr("");
    update((st) => { st.practice.push({ id: uid(), d, sec, t: String(fd.get("t")), a, c, src: String(fd.get("src") ?? "").trim() }); });
    ["a", "c", "src"].forEach((k) => ((f.elements.namedItem(k) as HTMLInputElement).value = ""));
  };

  const [mErr, setMErr] = useState("");
  const addMock = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    const d = String(fd.get("d")), c = parseInt(String(fd.get("c")), 10), w = parseInt(String(fd.get("w")), 10);
    if (!d) { setMErr("Pick the date of the test."); return; }
    if (isNaN(c) || isNaN(w) || c < 0 || w < 0) { setMErr("Enter the number correct and the number wrong. Use 0 if there are none."); return; }
    if (c + w > def.maxQ) { setMErr(sec + " has " + def.maxQ + " questions, so correct plus wrong cannot be more than " + def.maxQ + "."); return; }
    setMErr("");
    update((st) => { st.mocks.push({ id: uid(), d, sec, n: String(fd.get("n") ?? "").trim(), k: String(fd.get("k")), c, w }); });
    ["n", "c", "w"].forEach((k) => ((f.elements.namedItem(k) as HTMLInputElement).value = ""));
  };

  const practice = state.practice.filter((p) => p.sec === sec).sort(sortDesc).slice(0, 30);
  const mocksAsc = state.mocks.map((x, i) => ({ x, i })).filter((o) => o.x.sec === sec)
    .sort((a, b) => (a.x.d < b.x.d ? -1 : a.x.d > b.x.d ? 1 : a.i - b.i)).map((o) => o.x);

  return (
    <div className="flex flex-col gap-12">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
        <Section title={`Log a ${sec} practice set`}>
          <form className="grid grid-cols-2 items-end gap-4 rounded-lg bg-card p-5 sm:p-6" onSubmit={addPractice} autoComplete="off">
            <Field label="Date"><Input name="d" type="date" defaultValue={todayIso()} required /></Field>
            <Field label="Question type"><NativeSelect name="t" key={sec}>{def.practiceTypes.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
            <Field label="Attempted"><Input name="a" type="number" inputMode="numeric" min={1} max={200} required placeholder="8" /></Field>
            <Field label="Correct"><Input name="c" type="number" inputMode="numeric" min={0} max={200} required placeholder="6" /></Field>
            <Field label="Source" className="col-span-2"><Input name="src" placeholder="Cracku RC bank, CAT 2019 Slot 2" /></Field>
            <div className="col-span-2 flex flex-col gap-2"><Button type="submit" variant="secondary" className="self-start">Add set</Button><ErrorText>{pErr}</ErrorText></div>
          </form>
        </Section>
        <Section title={`Log a timed ${sec} paper or mock`}>
          <form className="grid grid-cols-2 items-end gap-4 rounded-lg bg-card p-5 sm:p-6" onSubmit={addMock} autoComplete="off">
            <Field label="Date"><Input name="d" type="date" defaultValue={todayIso()} required /></Field>
            <Field label="Type"><NativeSelect name="k">{KINDS.map((k) => <option key={k}>{k}</option>)}</NativeSelect></Field>
            <Field label="Name" className="col-span-2"><Input name="n" placeholder="CAT 2017 Slot 1" /></Field>
            <Field label="Correct"><Input name="c" type="number" inputMode="numeric" min={0} max={def.maxQ} required placeholder="14" /></Field>
            <Field label="Wrong MCQ"><Input name="w" type="number" inputMode="numeric" min={0} max={def.maxQ} required placeholder="3" /></Field>
            <div className="col-span-2 flex flex-col gap-2"><Button type="submit" variant="secondary" className="self-start">Add result</Button><ErrorText>{mErr}</ErrorText></div>
          </form>
        </Section>
      </div>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
        <Section title="Recent practice">
          <LogList empty="Practice sets you log from the timetable or the form above show here.">
            {practice.map((p) => (
              <LogRow key={p.id} label="Delete this set" onDelete={() => remove("practice", p.id, "Practice set")}>
                <span className="text-base font-semibold">{p.t}<span className="font-normal text-muted-foreground">, {shortDate(p.d)}</span></span>
                <span className="text-base">{p.c} of {p.a} correct, {Math.round((p.c / Math.max(p.a, 1)) * 100)}%</span>
                {p.src && <Meta>{p.src}</Meta>}
              </LogRow>
            ))}
          </LogList>
        </Section>
        <Section title="Papers and mocks">
          <LogList empty="Timed papers you log from the timetable or the form above show here.">
            {[...mocksAsc].reverse().map((x) => (
              <LogRow key={x.id} label={"Delete result from " + shortDate(x.d)} onDelete={() => remove("mocks", x.id, "Result")}>
                <span className="flex flex-wrap items-center gap-2 text-base font-semibold">{x.n || x.k}<Badge variant="secondary">{x.k}</Badge></span>
                <span className="text-base">{x.c} correct, {x.w} wrong, raw score {3 * x.c - x.w}</span>
                <Meta>{shortDate(x.d)}</Meta>
              </LogRow>
            ))}
          </LogList>
        </Section>
      </div>
    </div>
  );
}
