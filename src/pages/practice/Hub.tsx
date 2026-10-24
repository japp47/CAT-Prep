import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { todayIso } from "../../lib/date";
import { usePref } from "../../lib/prefs";
import type { LrAttempt, RcAttempt, VaAttempt } from "../../lib/state";
import { useStore } from "../../lib/store";
import { LinkButton, Page, PageHeader } from "../../components/kit";
import { StreakBadge } from "../../components/StreakBadge";
import { rcOfDay } from "../../practice/daily";
import { dueRedo } from "../../practice/redo";
import type { RcMeta } from "../../practice/types";
import { SECTION_BY_ID, SECTIONS } from "../../sections";
import type { SectionDef, SectionId } from "../../sections/types";
import NotFound from "../NotFound";
import DilrPractice, { LR_ORDER } from "./DilrPractice";
import VarcPractice from "./VarcPractice";

/**
 * Practice, one page for every section (D39): /varc/practice, /dilr/practice, /quant/practice. Dividers on top say
 * what is waiting in each section; the section's own practice sits below. /practice opens the section used last.
 */

/** What VARC has for today, worked out once for its divider and its page. */
export interface VarcToday { today: string; daily: RcMeta; dailyTry?: RcAttempt; vaToday?: VaAttempt; redoDue: number; next: "rc" | "va" | "redo" | null }

function varcToday(st: { rcAttempts: RcAttempt[]; vaAttempts: VaAttempt[]; redo: Parameters<typeof dueRedo>[0] }): VarcToday {
  const today = todayIso();
  const daily = rcOfDay(today);
  const dailyTry = st.rcAttempts.filter((a) => a.set === daily.id && a.d === today).pop();
  const vaToday = st.vaAttempts.filter((a) => a.mode === "daily" && a.d === today).pop();
  const redoDue = dueRedo(st.redo, today).length;
  // The first daily task not yet done gets the highlighter and the one filled button.
  const next = !dailyTry ? "rc" : !vaToday ? "va" : redoDue ? "redo" : null;
  return { today, daily, dailyTry, vaToday, redoDue, next };
}

const nextLr = (lr: LrAttempt[]) => { const tried = new Set(lr.map((a) => a.set)); return LR_ORDER.find((s) => !tried.has(s.id)); };

const isSection = (x: string | undefined): x is SectionId => !!x && x in SECTION_BY_ID;

export default function PracticeHub() {
  const { sec } = useParams();
  const [last, setLast] = usePref<SectionId>("practiceSec", "varc");
  const known = isSection(sec);
  useEffect(() => { if (known && sec !== last) setLast(sec); }, [known, sec, last, setLast]);
  if (sec === undefined) return <Navigate to={`/${isSection(last) ? last : "varc"}/practice`} replace />;
  if (!known) return <NotFound />;
  return <Hub sec={SECTION_BY_ID[sec]} />;
}

function Hub({ sec }: { sec: SectionDef }) {
  const { state } = useStore();
  const varc = varcToday(state);
  const lrNext = nextLr(state.lrAttempts);
  const tried = new Set(state.lrAttempts.map((a) => a.set)).size;
  const left = [!varc.dailyTry, !varc.vaToday, varc.redoDue > 0].filter(Boolean).length;
  const status: Record<SectionId, { text: string; due: boolean }> = {
    varc: { text: left ? `${left} left today` : "Done for today", due: left > 0 },
    dilr: { text: `${LR_ORDER.length} sets${tried ? `, ${tried} tried` : ""}`, due: !!lrNext },
    quant: { text: "From January", due: false },
  };

  return (
    <Page>
      <PageHeader title="Practice" aside={<StreakBadge />}>
        Exam-style questions written for this site. Every answer is explained, scores go to Progress, and the questions you miss come back to you.
      </PageHeader>

      {/* Dividers, like the tabs of a ring binder: each says what is waiting behind it. */}
      <nav aria-label="Practice by section" className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary p-1.5">
        {SECTIONS.map((s) => {
          const on = s.id === sec.id, st = status[s.id];
          return (
            <Link key={s.id} to={`/${s.id}/practice`} aria-current={on ? "page" : undefined}
              className={cn(
                "relative flex min-h-16 flex-col justify-center gap-0.5 overflow-hidden rounded-lg px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-5 sm:py-3",
                on ? "bg-card" : "hover:bg-card/50",
              )}>
              {/* The highlighter marks the section you are on when something is waiting in it. */}
              {on && st.due && <span className="absolute inset-x-0 bottom-0 h-1 bg-highlight" aria-hidden />}
              <span className={cn("text-base font-semibold sm:text-heading", on ? "text-foreground" : "text-foreground/75")}>{s.short}</span>
              <span className={cn("text-sm", on ? "text-foreground/80" : "text-muted-foreground")}>{st.text}</span>
            </Link>
          );
        })}
      </nav>

      {sec.id === "varc" ? <VarcPractice t={varc} /> : sec.id === "dilr" ? <DilrPractice next={lrNext} /> : <Later sec={sec} />}
    </Page>
  );
}

/** A section whose practice is not built yet. */
function Later({ sec }: { sec: SectionDef }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card p-5 sm:p-6">
      <h2 className="text-heading font-semibold">{sec.name} practice starts in January 2027</h2>
      <p className="measure text-base text-muted-foreground">{sec.tagline} Until then, its page lists what is coming, and you can log Quant mocks in Progress and Quant mistakes in the Error log.</p>
      <div className="flex flex-wrap gap-3"><LinkButton to={"/" + sec.id} variant="secondary">Open the {sec.short} page</LinkButton></div>
    </div>
  );
}
