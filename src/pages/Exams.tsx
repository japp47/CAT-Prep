import { LinkButton, Meta, Page, PageHeader, Section } from "../components/kit";
import { CAT_PATTERN } from "../data/exam";
import { OTHER_EXAMS, VIA_CAT_NOTES } from "../data/exams";

const TR = "border-t align-top"; // taste-skill-ignore: rows of a real table

const TIMELINE = [
  ["Late July", "CAT notification on iimcat.ac.in"],
  ["August to mid-September", "Registration"],
  ["Late October", "Official mock on the real interface"],
  ["Early November", "Admit card"],
  ["Last Sunday of November", "Exam, in three slots"],
  ["Early December", "Response sheet and provisional answer key, objection window"],
  ["Late December or early January", "Results and scorecards"],
  ["January to April", "Shortlists, written ability tests and interviews"],
];

export default function Exams() {
  return (
    <Page>
      <PageHeader title="CAT and other exams">What CAT looks like, the yearly timeline, and the other entrance tests worth adding to your list.</PageHeader>

      <Section title="CAT pattern" description="Based on CAT 2024 and 2025. Read the CAT 2027 notification when it is out.">
        <div className="overflow-x-auto rounded-lg bg-card">
          <table className="w-full min-w-[36rem] text-left text-base">
            <thead><tr>{["Section", "Questions", "Minutes", "What it tests"].map((h, i) => <th key={h} className={"px-4 pt-4 pb-2 text-sm font-medium text-muted-foreground" + (i === 1 || i === 2 ? " text-right" : "")}>{h}</th>)}</tr></thead>
            <tbody>{CAT_PATTERN.map((s) => (
              <tr key={s.id} className={TR}><td className="px-4 py-3 font-semibold">{s.name}</td><td className="px-4 py-3 text-right tabular-nums">{s.questions}</td><td className="px-4 py-3 text-right tabular-nums">{s.minutes}</td><td className="px-4 py-3 text-foreground/85">{s.notes}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <ul className="measure flex list-disc flex-col gap-2 pl-5 text-base">
          <li>68 questions in 120 minutes, with a fixed 40 minutes per section. You cannot switch sections.</li>
          <li>+3 for a correct answer, −1 for a wrong multiple-choice answer, and no negative marking for TITA (type in the answer) questions.</li>
          <li>Scores are scaled across slots, then converted to percentiles. IIMs set both overall and section-wise cutoffs.</li>
          <li>Eligibility: a bachelor's degree with at least 50% marks (45% for SC, ST and PwD), and final-year students can apply.</li>
        </ul>
      </Section>

      <Section title="A typical CAT year">
        <ol className="flex flex-col gap-1 rounded-lg bg-card p-2">
          {TIMELINE.map(([w, x]) => (
            <li key={w} className="grid gap-x-6 gap-y-0.5 rounded-md px-3.5 py-3 sm:grid-cols-[15rem_minmax(0,1fr)]">
              <span className="text-base font-semibold">{w}</span><span className="text-base text-foreground/85">{x}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Other MBA entrance exams">
        <div className="grid gap-3 md:grid-cols-2">
          {OTHER_EXAMS.map((e) => (
            <article key={e.id} className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-0.5"><h3 className="text-heading font-semibold">{e.name}</h3><Meta>{e.body}</Meta></div>
              <dl className="grid gap-x-5 gap-y-2.5 text-base sm:grid-cols-[5rem_minmax(0,1fr)]">
                {([["When", e.window], ["For", e.for], ["Pattern", e.pattern], ["Tip", e.tip]] as const).map(([k, v]) => <div key={k} className="contents"><dt className="font-semibold">{k}</dt><dd className="text-foreground/85">{v}</dd></div>)}
              </dl>
              <div className="mt-auto"><LinkButton to={e.site} variant="secondary" size="sm">Official site</LinkButton></div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Worth knowing" description="Windows and admission routes change. Check each school's current admission notice.">
        <ul className="flex flex-col gap-1 rounded-lg bg-card p-2">
          {VIA_CAT_NOTES.map((n) => <li key={n.name} className="flex flex-col gap-0.5 rounded-md px-3.5 py-3"><b className="text-base font-semibold">{n.name}</b><span className="text-base text-foreground/85">{n.note}</span></li>)}
        </ul>
      </Section>
    </Page>
  );
}
