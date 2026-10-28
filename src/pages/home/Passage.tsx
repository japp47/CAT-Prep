import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LinkButton } from "../../components/kit";
import { todayIso } from "../../lib/date";
import { useStore } from "../../lib/store";
import { rcOfDay } from "../../practice/daily";
import { GENRES } from "../../practice/types";

type Leads = Record<string, [string, string]>;
let leadsLoaded: Leads | null = null;

/** The passages' opening paragraphs, loaded on demand so they stay out of the first download. */
function useLeads() {
  const [leads, setLeads] = useState(leadsLoaded);
  useEffect(() => {
    if (leads) return;
    let live = true;
    import("../../practice/leads.gen").then((m) => { leadsLoaded = m.RC_LEADS; if (live) setLeads(m.RC_LEADS); }, () => { /* the sheet still has its title and button */ });
    return () => { live = false; };
  }, [leads]);
  return leads;
}

/**
 * Grey bars the size of the opening paragraph, while its text loads. It is set in the same type as the real paragraph,
 * with placeholder words of the same total length, so it wraps to about as many lines and nothing below it moves.
 */
function LeadPlaceholder({ chars }: { chars: number }) {
  const turnChars = Math.round(chars * 0.32);
  const body = "xxxxxxx ".repeat(Math.max(1, Math.round((chars - turnChars) / 8))).trim();
  const turn = "xxxxxxx ".repeat(Math.max(1, Math.round(turnChars / 8))).trim();
  return (
    <p className="measure text-reading" aria-hidden>
      <span className="line-clamp-4 animate-pulse rounded-sm bg-muted text-transparent [box-decoration-break:clone] [-webkit-box-decoration-break:clone] motion-reduce:animate-none">{body}</span>
      <span className="block animate-pulse rounded-sm bg-muted text-transparent [box-decoration-break:clone] [-webkit-box-decoration-break:clone] motion-reduce:animate-none">{turn}</span>
    </p>
  );
}

/**
 * Today's passage, opened on a sheet: reading a dense passage is what CAT prep looks like every day.
 * The opening paragraph's last sentence, where the passage turns, carries the highlighter. It changes daily.
 */
export function TodaysPassage({ className, level: H = "h2" }: { className?: string; level?: "h2" | "h3" | "h4" }) {
  const { state } = useStore();
  const t = todayIso();
  const rc = rcOfDay(t);
  const leads = useLeads();
  const [body, turn] = leads?.[rc.id] ?? ["", ""];
  const tried = state.rcAttempts.filter((a) => a.set === rc.id && a.d === t).pop();
  const to = tried ? `/practice/rc/${rc.id}?review=${tried.id}` : `/practice/rc/${rc.id}`;
  return (
    <article aria-labelledby="todays-passage" className={cn("flex min-w-0 flex-col gap-5 rounded-xl bg-card px-6 py-7 sm:px-9 sm:py-9", className)}>
      <H id="todays-passage" className="font-serif text-[clamp(1.5rem,1.25rem+0.9vw,2rem)] leading-tight font-semibold tracking-[-0.01em]">
        <Link to={to} className="hover:text-primary">{rc.title}</Link>
      </H>
      {leads
        ? body && <p className="measure text-reading"><span className="line-clamp-4">{body}</span>{turn && <span className="block"><mark className="hl text-inherit">{turn}</mark></span>}</p>
        : <LeadPlaceholder chars={rc.lead} />}
      <p className="text-base text-muted-foreground">
        Today's RC: {GENRES[rc.genre].toLowerCase()}, {rc.difficulty}, {rc.words} words and {rc.questions} questions, about 7 minutes. The same passage for everyone today, and a new one tomorrow.
      </p>
      {tried && <p className="text-base text-success">Done today: {tried.c} of {rc.questions} correct.</p>}
      <div><LinkButton to={to} size="lg" variant="secondary">{tried ? "Review your answers" : "Start the passage"}</LinkButton></div>
    </article>
  );
}
