import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { Bars } from "../components/Chart";
import { ErrorText, Field, LinkButton, Meta, Page, PageHeader, Section, Segmented, TextLink, useDeleteWithUndo } from "../components/kit";
import { NativeSelect } from "../components/Select";
import { CAUSES, TRAPS } from "../data/traps";
import { CAUSE_IDS, type Cause, type ErrorEntry } from "../lib/state";
import { patterns } from "../practice/report";
import { errorKey, errorLink, statuses } from "../practice/errorlink";
import { filterErrors, filterHref, isEmpty, parseFilter, STATUS_LABEL, type ErrorFilter, type Status } from "../practice/errorfilter";
import { redoKeyExists } from "../practice/redo";
import { shortDate, todayIso, uid } from "../lib/date";
import { useStore } from "../lib/store";
import { SECTION_LABELS, sectionByLabel } from "../sections";

/** At most this many questions go back into the redo queue from one button; the queue keeps the rest for later. */
const RETRY_MAX = 10;
/** Entries shown before "Show more": a long log is read from the top. */
const PAGE = 20;

const TRAP_LABEL = "What the wrong option did";
const CAUSE_LABEL = "Why you picked it";

/**
 * The Error log (F52, D114). Wrong answers from practice arrive on their own; the page puts what to do first (try the
 * still-open ones again, say why for the ones without a reason), then the patterns, then the mistakes themselves,
 * short, with their detail a tap away. Counts and the form for a mock's or a book's mistake come last.
 */
export default function Errors() {
  const { state } = useStore();
  const found = patterns(state.errors, state.practice, todayIso());
  // Filters live in the URL, so Progress and patterns can link to the matching entries (F52).
  const [sp, setSp] = useSearchParams();
  const f = parseFilter(sp);
  const setFilter = (next: ErrorFilter) => setSp(new URLSearchParams(filterHref(next).split("?")[1] ?? ""), { replace: true });
  const status = useMemo(() => statuses(state.errors, state.redo, todayIso()), [state.errors, state.redo]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [adding, setAdding] = useState(false);

  const list = filterErrors(state.errors, f, status);
  const filtered = !isEmpty(f) || !!f.sec;
  const retry = [...new Set(state.errors.filter((e) => status.get(e.id) !== "fixed").map(errorKey).filter((k): k is string => !!k && redoKeyExists(k)))].slice(0, RETRY_MAX);
  const noWhy = state.errors.filter((e) => !e.cause && status.get(e.id) !== "fixed").length;

  const byType: Record<string, number> = {}, byTrap: Record<string, number> = {};
  state.errors.forEach((e) => {
    const k = e.sec === "VARC" ? e.t : e.sec + ": " + e.t;
    byType[k] = (byType[k] || 0) + 1;
    if (e.trap) byTrap[e.trap] = (byTrap[e.trap] || 0) + 1;
  });

  return (
    <Page>
      <PageHeader title="Error log">Every wrong answer from practice lands here by itself. Say why you missed it, then try it again until you get it right.</PageHeader>

      {state.errors.length > 0 && (
        <section className="flex flex-col gap-4 rounded-xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-labelledby="todo-h">
          <div className="flex flex-col gap-1">
            <h2 id="todo-h" className="text-heading font-semibold">{retry.length ? `${retry.length} to try again` : "Nothing waiting to try again"}</h2>
            <p className="text-base text-muted-foreground">
              {noWhy ? `${noWhy} ${noWhy === 1 ? "mistake still needs" : "mistakes still need"} a reason: tap “Say why” below. ` : ""}
              {retry.length ? "Each comes back with its passage or set, the answer hidden." : "A mistake counts as fixed once you get it right on a later try."}
            </p>
          </div>
          {retry.length > 0 && <LinkButton to={"/practice/redo?k=" + retry.map(encodeURIComponent).join(",")} size="lg" className="shrink-0">Try {retry.length === 1 ? "it" : `these ${retry.length}`} again</LinkButton>}
        </section>
      )}

      {found.length > 0 ? (
        <Section title="Patterns" description="The same mistake on the same kind of question, four times or more in the last 30 days. Fix the habit, not just the question.">
          <ul className="grid gap-3 sm:grid-cols-2">
            {found.map((p) => (
              <li key={p.key} className="flex min-w-0 flex-col items-start justify-between gap-4 rounded-xl bg-card p-5 sm:p-6">
                <span className="text-base leading-relaxed">{p.text}</span>
                <span className="flex flex-wrap gap-x-6 gap-y-2"><TextLink to={p.to}>Practise this pattern</TextLink><TextLink to={p.list}>See these mistakes</TextLink></span>
              </li>
            ))}
          </ul>
        </Section>
      ) : state.errors.length > 0 && <Meta>Patterns appear once the same trap or reason catches you four times on one kind of question within 30 days.</Meta>}

      <Section id="log" className="scroll-mt-24" title={filtered ? `Your mistakes (${list.length} of ${state.errors.length})` : `Your mistakes (${state.errors.length})`}
        action={state.errors.length > 0 && (
          <Button variant="secondary" size="sm" aria-expanded={filtersOpen || filtered} onClick={() => setFiltersOpen(!filtersOpen)}>
            <SlidersHorizontal data-icon="inline-start" />{filtered ? "Filters on" : "Filter"}
          </Button>
        )}>
        {(filtersOpen || filtered) && state.errors.length > 0 && <Filters f={f} onChange={setFilter} />}
        {list.length ? (
          <>
            <ul className="flex flex-col gap-3">
              {list.slice(0, shown).map((e) => <EntryRow key={e.id} e={e} status={status.get(e.id)} />)}
            </ul>
            {list.length > shown && <Button variant="ghost" className="self-start" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</Button>}
          </>
        ) : state.errors.length > 0 ? (
          <div className="rounded-xl bg-card p-5 sm:p-6"><p className="text-base text-muted-foreground">No mistakes match these filters.</p></div>
        ) : (
          <div className="rounded-xl bg-card p-5 sm:p-6">
            <p className="text-base text-muted-foreground">No mistakes yet. When you get a question wrong in practice, it lands here with the trap that caught you; you say why, and it comes back to try again.</p>
          </div>
        )}
      </Section>

      {state.errors.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <Section title="Question types you miss"><div className="min-h-36 rounded-xl bg-card p-5 sm:p-6"><Bars counts={byType} empty="Counts appear after your first mistake." /></div></Section>
          <Section title="Traps that catch you"><div className="min-h-36 rounded-xl bg-card p-5 sm:p-6"><Bars counts={byTrap} empty="Counts appear after your first mistake." /></div></Section>
        </div>
      )}

      <Section title="From a mock or a book">
        {adding ? <AddMistake onDone={() => setAdding(false)} /> : (
          <p className="text-base text-muted-foreground">
            Mistakes from practice here arrive by themselves. <button type="button" onClick={() => setAdding(true)} className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Add one from a mock or a book</button>
          </p>
        )}
      </Section>
    </Page>
  );
}

/** "Chose B" from an entry made in practice ("Chose B: option text, why…"), for the short line. */
const choseOf = (e: ErrorEntry) => /^(Chose|Answered) ([^:.]{1,24})[:.]/.exec(e.why)?.slice(1, 3).join(" ") ?? null;

/** One mistake, short: what it was, what caught you and why; the full reasoning, edit and delete a tap away. */
function EntryRow({ e, status }: { e: ErrorEntry; status: Status | null | undefined }) {
  const remove = useDeleteWithUndo();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const chose = choseOf(e);
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold">{e.sec === "VARC" ? e.t : `${e.sec}: ${e.t}`}</h3>
        <span className="flex items-center gap-2 text-sm text-muted-foreground"><StatusBadge s={status} />{shortDate(e.d)}</span>
      </div>
      <p className="line-clamp-2 text-base text-foreground/85">
        {chose ? <><span className="font-medium text-foreground">{chose}</span>{e.trap ? <>, which was <Badge variant="danger" className="align-middle">{e.trap}</Badge></> : null}</> : e.why || e.src}
      </p>
      {e.src && <Meta className="line-clamp-1">{e.src}</Meta>}
      <EntryCause e={e} picking={picking} setPicking={setPicking} />
      <div className="flex flex-wrap items-center gap-2">
        <QuestionLinks e={e} />
        {!e.cause && !picking && <Button variant="ghost" size="sm" onClick={() => setPicking(true)}>Say why</Button>}
        <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => { setOpen(!open); setEditing(false); }}>{open ? "Hide details" : "Details"}</Button>
      </div>
      {open && (editing ? <EditEntry e={e} onDone={() => setEditing(false)} /> : (
        <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4">
          {e.why && <p className="text-base leading-relaxed"><b className="font-semibold">What went wrong</b><br />{e.why}</p>}
          {e.fix && <p className="text-base leading-relaxed"><b className="font-semibold">The right reasoning</b><br />{e.fix}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-danger" onClick={() => remove("errors", e.id, "Entry")}>Delete</Button>
          </div>
        </div>
      ))}
    </li>
  );
}

/** The student's reason when given (with "Change"), or the nine reasons to pick from; a tap saves it. */
function EntryCause({ e, picking, setPicking }: { e: ErrorEntry; picking: boolean; setPicking: (v: boolean) => void }) {
  const { update } = useStore();
  const pick = (c: Cause) => {
    update((st) => {
      const x = st.errors.find((y) => y.id === e.id);
      if (!x || x.cause === c) return;
      if (x.cause && !x.causeWas) x.causeWas = x.cause;
      x.cause = c;
    });
    setPicking(false);
  };
  if (!picking) {
    return e.cause
      ? <p className="text-base"><span className="text-muted-foreground">Why: </span>{CAUSES[e.cause]} <button type="button" onClick={() => setPicking(true)} className="ml-1 text-sm font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Change</button></p>
      : null;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base">Why did you miss it?</p>
      <ToggleGroup type="single" value={e.cause ?? ""} onValueChange={(v) => v && pick(v as Cause)} aria-label="Why did you miss it" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start">
        {CAUSE_IDS.map((c) => (
          <ToggleGroupItem key={c} value={c} className="h-auto min-h-11 justify-start rounded-md bg-secondary px-3.5 py-2 text-left text-base whitespace-normal sm:flex-none data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/40">
            {CAUSES[c]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setPicking(false)}>Not now</Button>
    </div>
  );
}

/** Edit an entry's diagnosis and notes. The first trap and reason are kept when corrected. */
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
    <div className="grid gap-4 rounded-lg bg-muted/60 p-4 sm:grid-cols-2 sm:p-5">
      <Field label={TRAP_LABEL}><NativeSelect value={trap} onChange={(ev) => setTrap(ev.target.value)}><option value="none">Not set</option>{TRAPS.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
      <Field label={CAUSE_LABEL}><NativeSelect value={cause} onChange={(ev) => setCause(ev.target.value)}><option value="none">Not set</option>{CAUSE_IDS.map((c) => <option key={c} value={c}>{CAUSES[c]}</option>)}</NativeSelect></Field>
      <Field label="What went wrong" className="sm:col-span-2"><Textarea value={why} onChange={(ev) => setWhy(ev.target.value)} placeholder="What did you miss or assume?" /></Field>
      <Field label="The right reasoning" className="sm:col-span-2"><Textarea value={fix} onChange={(ev) => setFix(ev.target.value)} placeholder="What evidence leads to the right answer?" /></Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button size="sm" variant="secondary" onClick={save}>Save changes</Button><Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
    </div>
  );
}

/** A mistake from outside the practice here: a mock, a book, a coaching test. */
function AddMistake({ onDone }: { onDone: () => void }) {
  const { update } = useStore();
  const [sec, setSec] = useState("VARC");
  const [err, setErr] = useState("");
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "").trim();
    if (!g("why") && !g("fix") && !g("src")) { setErr("Add where it was from, what went wrong, or the right reasoning."); return; }
    update((st) => { st.errors.push({ id: uid(), d: todayIso(), sec, t: g("t"), trap: g("trap"), src: g("src"), why: g("why"), fix: g("fix") }); });
    onDone();
  };
  return (
    <form className="grid gap-x-6 gap-y-5 rounded-xl bg-card p-5 sm:p-6 lg:grid-cols-2" onSubmit={add} autoComplete="off">
      <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
        <Field label="Section"><NativeSelect value={sec} onChange={(e) => setSec(e.target.value)}>{SECTION_LABELS.map((s) => <option key={s}>{s}</option>)}</NativeSelect></Field>
        <Field label="Question type"><NativeSelect name="t" key={sec}>{sectionByLabel(sec).errorTypes.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
        <Field label={TRAP_LABEL}><NativeSelect name="trap">{TRAPS.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
      </div>
      <Field label="Where from" className="lg:col-span-2"><Input name="src" placeholder="CAT 2019 Slot 2, RC 3, Q14" /></Field>
      <Field label="What went wrong"><Textarea name="why" placeholder="I picked the option that sounded most like the author." /></Field>
      <Field label="The right reasoning"><Textarea name="fix" placeholder="The passage only says X in paragraph 3, so the option that adds Y is out of scope." /></Field>
      <div className="flex flex-wrap items-center gap-2 lg:col-span-2"><Button type="submit" variant="secondary">Add to log</Button><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button><ErrorText>{err}</ErrorText></div>
    </form>
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
    <>
      {link.retry && <LinkButton to={"/practice/redo?k=" + encodeURIComponent(link.key)} variant="secondary" size="sm">Try it again</LinkButton>}
      {link.review && <LinkButton to={link.review} variant="ghost" size="sm">See the question</LinkButton>}
    </>
  );
}

function StatusBadge({ s }: { s: Status | null | undefined }) {
  if (!s) return null;
  return <Badge variant={s === "fixed" ? "success" : "warning"}>{STATUS_LABEL[s]}</Badge>;
}

/** Narrow the log by section, question type, trap, reason and whether the mistake is still happening or fixed. */
function Filters({ f, onChange }: { f: ErrorFilter; onChange: (f: ErrorFilter) => void }) {
  const { state } = useStore();
  const types = f.sec ? sectionByLabel(f.sec).errorTypes : [...new Set(state.errors.map((e) => e.t))].sort();
  const typeOptions = f.sec === "VARC" || types.some((t) => t.startsWith("RC: ")) ? ["RC", ...types] : types;
  if (f.t && !typeOptions.includes(f.t)) typeOptions.unshift(f.t);
  const set = (k: keyof ErrorFilter, v: string) => onChange({ ...f, [k]: v === "any" ? undefined : v });
  return (
    <div className={cn("flex flex-col gap-4 rounded-xl bg-card p-4 sm:p-6")}>
      <Segmented className="w-full sm:w-fit" label="Filter by section" value={f.sec ?? "All"} onChange={(v) => onChange({ ...f, sec: v === "All" ? undefined : v, t: undefined })} options={["All", ...SECTION_LABELS]} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Question type"><NativeSelect value={f.t ?? "any"} onChange={(ev) => set("t", ev.target.value)}><option value="any">Any type</option>{typeOptions.map((t) => <option key={t} value={t}>{t === "RC" ? "RC, every kind" : t}</option>)}</NativeSelect></Field>
        <Field label={TRAP_LABEL}><NativeSelect value={f.trap ?? "any"} onChange={(ev) => set("trap", ev.target.value)}><option value="any">Any trap</option>{TRAPS.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
        <Field label={CAUSE_LABEL}><NativeSelect value={f.cause ?? "any"} onChange={(ev) => set("cause", ev.target.value)}><option value="any">Any reason</option>{CAUSE_IDS.map((c) => <option key={c} value={c}>{CAUSES[c]}</option>)}</NativeSelect></Field>
      </div>
      <Segmented<"all" | Status> className="w-full sm:w-fit" label="Filter by status" value={f.status ?? "all"} onChange={(v) => onChange({ ...f, status: v === "all" ? undefined : v })}
        options={[["all", "All"], ["open", STATUS_LABEL.open], ["fixed", STATUS_LABEL.fixed]]} />
      <Meta>“Still happening”: the same kind of mistake was logged in the last two weeks. “Fixed”: you got the question right on a later try.</Meta>
      {(!isEmpty(f) || f.sec) && <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange({})}>Clear filters</Button>}
    </div>
  );
}
