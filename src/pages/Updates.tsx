import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LinkButton, Page, PageHeader, Segmented } from "../components/kit";
import { CHECKED, UPDATES, type Update } from "../data/updates";
import { diffDays, mediumDate, todayIso } from "../lib/date";
import { useGsap } from "../lib/motion";

/**
 * Important updates, redesigned 4 Nov 2026 (docs/design/info-pages.md): a "Coming up" strip of the dates the entries
 * are about, each with the days left and the nearest in the highlighter, then the entries, newest first, filterable by
 * exam. The strip slides in once on arrival (GSAP), and not at all under reduced motion.
 */

const STATUS = { official: ["Official", "success"], expected: ["Expected", "warning"], tip: ["Tip", "default"] } as const;
const EXAMS = ["All", ...new Set(UPDATES.map((u) => u.exam))];
const MONTH = new Intl.DateTimeFormat("en-IN", { month: "short" });

/** "Today", "Tomorrow", "In 21 days". */
export const daysLeft = (n: number) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`);

/** The dates still ahead, nearest first, each with its entry. */
export function comingUp(list: Update[], today: string) {
  return list.flatMap((u) => (u.dates ?? []).map(([d, what]) => ({ d, what, u, left: diffDays(today, d) })))
    .filter((x) => x.left >= 0)
    .sort((a, b) => a.d.localeCompare(b.d));
}

export default function Updates() {
  const [f, setF] = useState("All");
  const today = todayIso();
  const list = [...UPDATES].sort((a, b) => b.date.localeCompare(a.date)).filter((u) => f === "All" || u.exam === f);
  const ahead = comingUp(list, today);
  return (
    <Page>
      <PageHeader title="Important updates">
        Dates and changes for CAT and other MBA exams. <b className="font-semibold">Official</b> means the exam body has published it; <b className="font-semibold">Expected</b> rests on past years or on reports, and may change. Always confirm on the official site before you act. Every entry checked on {mediumDate(CHECKED)}.
      </PageHeader>
      <Segmented label="Filter by exam" value={f} onChange={setF} options={EXAMS} className="-mt-4 w-fit" />
      {/* Desktop: the updates on the left, the dates ahead as a calendar column that stays in view. Phone: the dates as a
          strip above the updates. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        {ahead.length > 0 && <ComingUp ahead={ahead} />}
        <ol className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1" aria-label="Updates, newest first">
          {list.map((u) => <li key={u.id}><Entry u={u} today={today} /></li>)}
        </ol>
      </div>
    </Page>
  );
}

/**
 * The dates ahead, a tile each, the nearest in the highlighter; a tap goes to its entry. A sideways strip on a phone, a
 * calendar column beside the updates on a desktop.
 */
function ComingUp({ ahead }: { ahead: ReturnType<typeof comingUp> }) {
  const box = useRef<HTMLDivElement>(null);
  useGsap(box, (gsap) => { gsap.from("[data-tile]", { x: 28, opacity: 0, duration: 0.5, stagger: 0.06, ease: "power3.out", clearProps: "all" }); }, []);
  return (
    <section aria-labelledby="coming-up" className="flex min-w-0 flex-col gap-3 max-lg:bleed-gutter lg:sticky lg:top-10 lg:col-start-2 lg:row-start-1">
      <h2 id="coming-up" className="text-heading font-semibold max-lg:px-gutter">Coming up</h2>
      <div ref={box} className="flex snap-x scroll-px-4 gap-3 overflow-x-auto pb-2 max-lg:px-gutter lg:max-h-[calc(100dvh-8rem)] lg:flex-col lg:gap-2 lg:overflow-x-visible lg:overflow-y-auto lg:overscroll-contain lg:pb-0">
        {ahead.map((x, i) => {
          const first = i === 0, [, day] = x.d.split("-").slice(1);
          return (
            <a key={x.d + x.what} href={"#" + x.u.id} data-tile
              className={cn("flex w-40 shrink-0 snap-start flex-col gap-1 rounded-xl p-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:w-auto lg:flex-row lg:items-center lg:gap-4 lg:px-4 lg:py-3",
                first ? "bg-highlight text-highlight-foreground" : "bg-card hover:bg-accent")}>
              <span className="flex items-baseline gap-1.5 lg:w-14 lg:shrink-0 lg:flex-col lg:items-center lg:gap-0.5">
                <span className="text-title leading-none font-bold tabular-nums">{Number(day)}</span>
                <span className={cn("text-base font-semibold", !first && "text-muted-foreground")}>{MONTH.format(new Date(x.d + "T00:00:00"))}</span>
              </span>
              <span className="flex flex-1 flex-col gap-1 lg:gap-0.5">
                <span className="text-base leading-snug font-semibold">{x.what}</span>
                <span className={cn("mt-auto pt-1 text-sm lg:pt-0", first ? "font-semibold" : "text-muted-foreground")}>
                  {daysLeft(x.left)}{x.u.status === "expected" ? ", expected" : ""}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

/** One update: what it is and how sure, the news, its dates still ahead, and the official page. */
function Entry({ u, today }: { u: Update; today: string }) {
  const [label, variant] = STATUS[u.status];
  const ahead = (u.dates ?? []).filter(([d]) => d >= today);
  return (
    <article id={u.id} className="flex scroll-mt-24 flex-col gap-3 rounded-xl bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{u.exam}</Badge>
        <Badge variant={variant}>{label}</Badge>
        <span className="text-sm text-muted-foreground">Posted {mediumDate(u.date)}</span>
      </div>
      <h2 className="text-heading font-semibold">{u.title}</h2>
      <p className="measure text-base text-foreground/85">{u.body}</p>
      {ahead.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Dates ahead">
          {ahead.map(([d, what]) => (
            <li key={d + what} className="flex items-baseline gap-2 rounded-lg bg-foreground/[0.05] px-3 py-1.5 text-sm">
              <span className="font-semibold">{mediumDate(d)}</span><span className="text-muted-foreground">{what}, {daysLeft(diffDays(today, d)).toLowerCase()}</span>
            </li>
          ))}
        </ul>
      )}
      {u.link && <div className="pt-1"><LinkButton to={u.link[1]} variant="secondary" size="sm" arrow={!u.link[1].startsWith("/")}>{u.link[0]}</LinkButton></div>}
    </article>
  );
}
