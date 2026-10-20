import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Field, LinkButton, Meta, Page, PageHeader, Section, Stat, TextLink } from "../components/kit";
import { addDays, isIsoDate, MON, parseIso, todayIso, uid, weekStart } from "../lib/date";
import type { Recommendation, WeekReview } from "../lib/state";
import { useStore } from "../lib/store";
import { FOCUS_DAYS, focusOptions, focusToday, latestWeek, reviewOf, reviewWeek, weekFacts, type FocusOption, type Move } from "../practice/week";
import NotFound from "./NotFound";

/** "13 to 19 Oct", or across months "29 Sep to 5 Oct". */
export function weekLabel(monday: string) {
  const a = parseIso(monday), b = parseIso(addDays(monday, 6));
  return a.getMonth() === b.getMonth() ? `${a.getDate()} to ${b.getDate()} ${MON[b.getMonth()]}` : `${a.getDate()} ${MON[a.getMonth()]} to ${b.getDate()} ${MON[b.getMonth()]}`;
}

function Moves({ title, rows, up }: { title: string; rows: Move[]; up: boolean }) {
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {rows.map((m) => (
          <li key={m.type} className="flex flex-wrap items-baseline justify-between gap-x-4 text-base">
            <span>{m.type}</span>
            <span className="tabular-nums"><span className="text-muted-foreground">{m.before}% to </span><b className={cn("font-semibold", up ? "text-success" : "text-danger")}>{m.after}%</b></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One focus choice: a radio card with the action and its evidence. */
function Option({ checked, onPick, title, why }: { checked: boolean; onPick: () => void; title: string; why?: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onPick}
      className={cn("flex w-full flex-col gap-1 rounded-lg bg-background px-4 py-3.5 text-left ring-1 ring-inset ring-border transition-colors hover:ring-primary/60", checked && "bg-accent ring-2 ring-primary hover:ring-primary")}>
      <span className="text-base font-semibold">{title}</span>
      {why && <span className="text-sm text-muted-foreground">{why}</span>}
    </button>
  );
}

function FocusPicker({ monday, options, saved, onSaved }: { monday: string; options: FocusOption[]; saved?: WeekReview; onSaved: () => void }) {
  const { state, update } = useStore();
  const current = saved?.focus ? state.recs.find((r) => r.id === saved.focus) : undefined;
  const startAt = current ? Math.max(0, options.findIndex((o) => (o.rec ?? "") === current.id || (o.skill.kind === current.skill.kind && o.skill.key === current.skill.key))) : 0;
  const [pick, setPick] = useState<number>(saved && !saved.focus ? -1 : options.length ? startAt : -1);
  const [note, setNote] = useState(saved?.note ?? "");
  const save = () => {
    const now = Date.now(), d = todayIso(), o = options[pick];
    update((st) => {
      let focus: string | undefined;
      if (o) {
        if (o.rec) focus = o.rec;
        else {
          const same = st.recs.find((r) => r.from === "week" && r.src === monday && r.skill.kind === o.skill.kind && r.skill.key === o.skill.key);
          if (same) focus = same.id;
          else {
            const rec: Recommendation = { id: uid(), d, updatedAt: now, from: "week", src: monday, sec: "VARC", skill: o.skill, text: o.text, why: o.why, status: "open", ...(o.to ? { to: o.to } : {}), ...(o.before ? { before: o.before } : {}) };
            st.recs.push(rec);
            focus = rec.id;
          }
        }
      }
      const r = st.weekReviews.find((x) => x.id === monday);
      const next: WeekReview = { id: monday, d, updatedAt: now, days: r?.days ?? [], closed: true, ...(focus ? { focus } : {}), ...(note.trim() ? { note: note.trim() } : {}) };
      if (r) Object.assign(r, next, { skipped: undefined }, focus ? {} : { focus: undefined }, note.trim() ? {} : { note: undefined });
      else st.weekReviews.push(next);
    });
    onSaved();
  };
  return (
    <div className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading font-semibold">Next week's focus</h2>
        <p className="text-base text-muted-foreground">One thing, three times next week. It shows on Today until you have done it.</p>
      </div>
      <div role="radiogroup" aria-label="Next week's focus" className="flex flex-col gap-2.5">
        {options.map((o, i) => <Option key={i} checked={pick === i} onPick={() => setPick(i)} title={o.text} why={o.why} />)}
        <Option checked={pick === -1} onPick={() => setPick(-1)} title="No focus this week" why={options.length ? undefined : "There is not enough practice yet to suggest one."} />
      </div>
      <Field label="What will you do differently next week?" hint="Optional, one line. You will see it next Sunday.">
        <Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Read the question before the passage" />
      </Field>
      <div><Button onClick={save}>{pick >= 0 ? "Set the focus" : "Save the review"}</Button></div>
    </div>
  );
}

function Week({ monday }: { monday: string }) {
  const { state } = useStore();
  const nav = useNavigate();
  const today = todayIso(), hour = new Date().getHours();
  const open = reviewWeek(today, hour), cap = weekStart(today);
  // This week, before the review opens on Saturday evening: the numbers so far, and no focus to pick yet.
  const running = monday === cap && open !== monday;
  const nowFocus = running ? focusToday(state, today) : null;
  const saved = reviewOf(state, monday);
  const [editing, setEditing] = useState(!saved || !!saved.skipped);
  const f = weekFacts(state, monday, today);
  const options = focusOptions(state, monday, today, f);
  const focus = saved?.focus ? state.recs.find((r) => r.id === saved.focus) : undefined;
  const prevNote = reviewOf(state, addDays(monday, -7))?.note;
  const delta = f.questions.acc != null && f.questions.lastAcc != null ? f.questions.acc - f.questions.lastAcc : null;
  const empty = f.studied === 0;
  const canEdit = monday === open;

  return (
    <Page>
      <PageHeader title="Weekly review" back={{ to: "/progress", label: "Progress" }}
        aside={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Week before" onClick={() => nav(`/review/${addDays(monday, -7)}`)}><ChevronLeft className="size-5" /></Button>
            <span className="min-w-36 text-center text-base font-semibold">{weekLabel(monday)}{running ? ", so far" : ""}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Week after" disabled={monday >= cap} onClick={() => nav(`/review/${addDays(monday, 7)}`)}><ChevronRight className="size-5" /></Button>
          </div>
        }>
        {running
          ? "Your week so far. The full review, with a focus for next week, opens on Saturday evening."
          : "Two minutes, once a week: what you did, what moved, and one thing to work on next week."}
      </PageHeader>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-10">
          <Section title="Your week">
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-lg bg-card p-5 sm:grid-cols-3 sm:p-6">
              <Stat value={`${f.studied} of ${f.daysSoFar}`} label="Days studied" />
              <Stat value={`${f.minutes.done} of ${f.minutes.planned}`} label="Minutes" />
              <Stat value={f.questions.attempted} label={f.questions.acc != null ? `Questions, ${f.questions.acc}% right` : "Questions answered"} className="col-span-2 sm:col-span-1" />
            </div>
            {delta != null && <p className="text-base">Accuracy is <b className="font-semibold">{delta === 0 ? "the same as" : `${Math.abs(delta)} points ${delta > 0 ? "up on" : "down on"}`}</b> the week before.</p>}
            {empty && <p className="text-base">No practice this week. That happens. Start small: <TextLink to="/today">one block from Today</TextLink> is enough to begin again.</p>}
            {f.light && !empty && <p className="rounded-lg bg-muted px-4 py-3 text-base">This was a lighter week than usual. If next week looks busy too, <TextLink to="/plan">lower your minutes in Plan</TextLink> so the timetable stays doable.</p>}
          </Section>

          <Section title="What moved" description={`Types with ${6} or more questions in both weeks.`}>
            {f.improved.length || f.slipped.length ? (
              <div className="grid gap-6 rounded-lg bg-card p-5 sm:grid-cols-2 sm:p-6">
                <Moves title="Improved" rows={f.improved} up />
                <Moves title="Slipped" rows={f.slipped} up={false} />
              </div>
            ) : <Meta>Nothing to compare yet: no type had enough questions in both weeks.</Meta>}
          </Section>

          <Section title="What cost you">
            <ul className="flex flex-col gap-3 rounded-lg bg-card p-5 text-base sm:p-6">
              <li>{f.trap ? <>The trap of the week was <b className="font-semibold">{f.trap.name.toLowerCase()}</b>, {f.trap.n} times. <TextLink to="/errors">See them in the Error log</TextLink>.</> : "No trap caught you twice this week."}</li>
              <li>Redo queue: {f.redo.cleared ? `${f.redo.cleared} cleared this week, ` : ""}{f.redo.due ? <>{f.redo.due} due by next Sunday. <TextLink to="/practice/redo">Open it</TextLink>.</> : "nothing due next week."}</li>
            </ul>
          </Section>

          {((f.lastFocus && !running) || prevNote) && (
            <Section title="Last week you said">
              <div className="flex flex-col gap-3 rounded-lg bg-card p-5 text-base sm:p-6">
                {f.lastFocus && !running && (
                  <p>
                    Focus: <b className="font-semibold">{f.lastFocus.rec.text}</b>{" "}
                    {f.lastFocus.rec.skill.kind === "type"
                      ? f.lastFocus.attempted
                        ? <>You answered {f.lastFocus.attempted} of those questions this week{f.lastFocus.acc != null && f.lastFocus.before != null ? <>, {f.lastFocus.acc}% right against {f.lastFocus.before}% before</> : null}.</>
                        : <>You did not practise it this week.</>
                      : <>Done on {reviewOf(state, addDays(monday, -7))?.days.length ?? 0} of {FOCUS_DAYS} days.</>}
                  </p>
                )}
                {prevNote && <p>Your note: “{prevNote}”</p>}
              </div>
            </Section>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
          {running ? (
            <div className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
              <h2 className="text-heading font-semibold">This week's focus</h2>
              {nowFocus ? (
                <>
                  <p className="text-base font-semibold">{nowFocus.rec.text}</p>
                  <p className="text-base">Done on {nowFocus.review.days.length} of {FOCUS_DAYS} days{nowFocus.doneToday ? ", including today" : ""}.</p>
                  {nowFocus.rec.to && nowFocus.left > 0 && <div><LinkButton to={nowFocus.rec.to} variant="secondary">Practise it</LinkButton></div>}
                </>
              ) : <p className="text-base">No focus this week. You can pick one for next week on Saturday evening.</p>}
            </div>
          ) : !canEdit ? (
            <div className="flex flex-col gap-2 rounded-lg bg-card p-5 sm:p-6">
              <h2 className="text-heading font-semibold">Focus chosen</h2>
              <p className="text-base">{focus ? focus.text : saved && !saved.skipped ? "No focus that week." : "This week was not reviewed."}</p>
              {saved?.note && <Meta>Note: {saved.note}</Meta>}
            </div>
          ) : editing ? (
            <FocusPicker monday={monday} options={options} saved={saved} onSaved={() => setEditing(false)} />
          ) : (
            <div className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
              <h2 className="text-heading font-semibold">Next week's focus</h2>
              {focus ? (
                <>
                  <p className="text-base font-semibold">{focus.text}</p>
                  <p className="text-sm text-muted-foreground">{focus.why}</p>
                  <p className="text-base">It shows on Today next week until you have done it {FOCUS_DAYS} times.</p>
                </>
              ) : <p className="text-base">No focus next week. Today follows your timetable as usual.</p>}
              {saved?.note && <Meta>Your note: {saved.note}</Meta>}
              <div className="flex flex-wrap gap-2">
                {focus?.to && <LinkButton to={focus.to} variant="secondary">Practise it</LinkButton>}
                <Button variant="ghost" onClick={() => setEditing(true)}>Change</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

export default function Review() {
  const { monday } = useParams();
  const today = todayIso(), latest = latestWeek(today, new Date().getHours());
  if (monday && (!isIsoDate(monday) || weekStart(monday) !== monday || monday > weekStart(today))) return <NotFound />;
  const m = monday ?? latest;
  return <Week key={m} monday={m} />;
}
