import { useRef } from "react";
import { cn } from "@/lib/utils";
import { ArrowLink, Ext, Page, PageHeader, Section } from "../components/kit";
import { CAT_PATTERN } from "../data/exam";
import { OTHER_EXAMS, VIA_CAT_NOTES } from "../data/exams";
import { UPDATES } from "../data/updates";
import { diffDays, mediumDate, todayIso } from "../lib/date";
import { useGsap } from "../lib/motion";
import { SECTIONS } from "../sections";

/**
 * CAT and other exams, redesigned 4 Nov 2026 (docs/design/info-pages.md). The exam at a glance in large figures; the
 * 120 minutes as one bar in three equal sections; the CAT year as a timeline that marks what is next from today (its
 * line draws once on arrival, GSAP); the other exams with their next date from the updates page and the days left.
 */

/** A typical CAT year, each step with the month and day it usually falls on (for "what is next"). */
const YEAR: { when: string; what: string; at: [number, number] }[] = [
  { when: "Late July", what: "Notification on iimcat.ac.in", at: [7, 25] },
  { when: "August to mid-September", what: "Registration", at: [8, 1] },
  { when: "Late October", what: "Official mock on the real interface", at: [10, 25] },
  { when: "Early November", what: "Admit card", at: [11, 5] },
  { when: "Last Sunday of November", what: "The exam, in three slots", at: [11, 28] },
  { when: "Early December", what: "Response sheet and answer key, objections", at: [12, 5] },
  { when: "Late December or early January", what: "Results and scorecards", at: [12, 30] },
  { when: "January to April", what: "Shortlists, written tests and interviews", at: [13, 15] },
];
/** The CAT year starts in July; January to June count as months 13 to 18. */
const yearDay = (m: number, d: number) => (m < 7 ? m + 12 : m) * 31 + d;

/** The index of the next step from today in a typical year. */
export function nextStep(today: string) {
  const [, m, d] = today.split("-").map(Number);
  const now = yearDay(m, d), i = YEAR.findIndex((s) => yearDay(...s.at) >= now);
  return i < 0 ? 0 : i;
}

/** An exam's next date on the updates page, with what it is and the days left. */
function nextDate(exam: string, today: string) {
  const all = UPDATES.filter((u) => u.exam === exam).flatMap((u) => u.dates ?? []).filter(([d]) => d >= today).sort(([a], [b]) => a.localeCompare(b));
  return all[0] ? { d: all[0][0], what: all[0][1], left: diffDays(today, all[0][0]) } : null;
}

const ROUTE: Record<string, string> = { varc: "/varc", dilr: "/dilr", quant: "/quant" };

export default function Exams() {
  const today = todayIso();
  const total = CAT_PATTERN.reduce((a, s) => ({ q: a.q + s.questions, m: a.m + s.minutes }), { q: 0, m: 0 });
  const next = nextStep(today);
  const line = useRef<HTMLOListElement>(null);
  useGsap(line, (gsap) => {
    gsap.from("[data-rail]", { scaleX: 0, transformOrigin: "left", duration: 1, ease: "power2.out" });
    gsap.from("[data-step]", { scale: 0, duration: 0.3, stagger: 0.08, delay: 0.2, ease: "back.out(2)" });
  }, []);

  return (
    <Page>
      <PageHeader title="CAT and other exams">What CAT looks like, the year around it, and the other entrance tests worth adding to your list.</PageHeader>

      <Section title="CAT at a glance" description="Based on CAT 2024 and 2025. Check the notification each year when it is out.">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {([[String(total.q), "questions"], [String(total.m), "minutes, 40 per section"], ["+3", "for a right answer"], ["−1", "for a wrong MCQ; typed answers cost nothing"]] as const).map(([v, k]) => (
            <li key={k} className="flex flex-col gap-1 rounded-xl bg-card p-5">
              <span className="text-title leading-none font-bold tracking-tight">{v}</span>
              <span className="text-base text-foreground/80">{k}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Three sections, one after another" description="Each section has its own 40 minutes, in this order. You cannot go back or move ahead early.">
        <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 sm:p-7">
          {/* The 120 minutes as one bar, a part per section. */}
          <div className="flex gap-1 overflow-hidden rounded-lg" aria-hidden>
            {CAT_PATTERN.map((s, i) => <div key={s.id} className={cn("flex h-10 flex-1 items-center px-3 text-sm font-semibold", ["bg-primary text-primary-foreground", "bg-primary/60 text-primary-foreground", "bg-primary/30 text-foreground"][i])}>{SECTIONS.find((x) => x.id === s.id)?.short ?? s.id}, {s.minutes} min</div>)}
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {CAT_PATTERN.map((s) => {
              const sec = SECTIONS.find((x) => x.id === s.id);
              return (
                <li key={s.id} className="flex flex-col gap-2">
                  <h3 className="min-h-14 text-heading font-semibold">{s.name}</h3>
                  <p className="text-base font-semibold">{s.questions} questions, {s.minutes} minutes</p>
                  <p className="text-base text-foreground/80">{s.notes}</p>
                  {sec && <ArrowLink to={ROUTE[s.id]} className="mt-auto pt-1">{sec.status === "soon" ? `${sec.short}, coming soon` : `Prepare for ${sec.short}`}</ArrowLink>}
                </li>
              );
            })}
          </ol>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          <li className="rounded-xl bg-card px-5 py-4 text-base"><b className="font-semibold">Scaled, then a percentile.</b> Scores are scaled across the three slots and turned into percentiles. IIMs set overall and section-wise cutoffs.</li>
          <li className="rounded-xl bg-card px-5 py-4 text-base"><b className="font-semibold">Who can sit it.</b> A bachelor's degree with at least 50% marks (45% for SC, ST and PwD); final-year students can apply.</li>
        </ul>
      </Section>

      <Section title="The CAT year" description="Typical months from past years. The official dates come with each year's notification.">
        <ol ref={line} className="relative grid gap-5 lg:grid-cols-8 lg:gap-3" aria-label="A typical CAT year">
          <span data-rail aria-hidden className="absolute top-[0.6875rem] right-4 left-4 hidden h-0.5 rounded-full bg-border lg:block" />
          {YEAR.map((s, i) => {
            const past = i < next, now = i === next;
            return (
              <li key={s.when} className="relative flex gap-3 lg:flex-col lg:gap-2">
                <span data-step aria-hidden className={cn("relative z-[1] mt-0.5 grid size-6 shrink-0 place-items-center rounded-full lg:mt-0",
                  now ? "bg-highlight" : past ? "bg-primary/25" : "bg-background")}>
                  <span className={cn("size-2.5 rounded-full", now ? "bg-highlight-foreground" : past ? "bg-primary" : "border-2 border-primary/50")} />
                </span>
                <div className={cn("flex flex-col gap-0.5", past && "text-muted-foreground")}>
                  {/* Every step keeps the line, so the eight columns stay level. */}
                  <span className={cn("min-h-5 text-sm", now ? "font-semibold text-foreground" : "max-lg:hidden")}>{now ? "Next" : past ? "Done" : ""}</span>
                  <span className="text-base font-semibold">{s.when}</span>
                  <span className={cn("text-base", !past && "text-foreground/85")}>{s.what}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="Other MBA entrance exams" description="Worth adding for the schools they open. Windows are typical; the dates for this season are on the updates page.">
        <ul className="grid gap-4 lg:grid-cols-2">
          {OTHER_EXAMS.map((e) => {
            const nd = nextDate(e.id.toUpperCase(), today);
            return (
              <li key={e.id} className="flex flex-col gap-3 rounded-xl bg-card p-5 sm:px-7 sm:py-6 lg:last:odd:col-span-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-heading font-semibold">{e.name}</h3>
                  <span className="text-sm text-muted-foreground">{e.body}</span>
                </div>
                {nd
                  ? <p className="w-fit rounded-lg bg-highlight-soft px-3 py-1.5 text-base"><b className="font-semibold">{nd.what}</b>, {mediumDate(nd.d)}, in {nd.left} {nd.left === 1 ? "day" : "days"}</p>
                  : <p className="text-base"><b className="font-semibold">When:</b> {e.window}</p>}
                <p className="text-base"><b className="font-semibold">For:</b> <span className="text-foreground/85">{e.for}</span></p>
                <p className="text-base text-foreground/80">{e.pattern.replace(/\.$/, "")}. {e.tip}</p>
                <Ext href={e.site} className="mt-auto w-fit pt-1 text-base font-semibold text-primary underline-offset-4 hover:underline">{e.name} official site</Ext>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Worth knowing" description="Admission routes change. Check each school's current admission notice.">
        <ul className="grid gap-4 lg:grid-cols-3">
          {VIA_CAT_NOTES.map((n) => <li key={n.name} className="flex flex-col gap-1 rounded-xl bg-card px-5 py-4"><b className="text-base font-semibold">{n.name}</b><span className="text-base text-foreground/85">{n.note}</span></li>)}
        </ul>
      </Section>
    </Page>
  );
}
