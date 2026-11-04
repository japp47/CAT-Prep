import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Ext, FeedbackInvite, Page, PageHeader, Section, TextLink } from "../components/kit";
import { LESSONS, TOPPERS, type Topper } from "../data/stories";
import { useGsap } from "../lib/motion";
import { RESOURCES } from "../sections/varc/resources";

/**
 * Topper stories, redesigned 4 Nov 2026 (docs/design/info-pages.md). The one memorable thing is the score: each topper
 * leads with their percentile in large figures, which count up once on arrival (GSAP; still under reduced motion). The
 * habits they share sit beside the page that builds the same habit here; then the interviews and exam analyses, without
 * repeating the interviews already linked from a topper's card; then how to share your own story.
 */

/** What each habit looks like on this site. */
const DO_IT_HERE: Record<string, [string, string]> = {
  "They read every day": ["Today's reading block and the Reading journal", "/journal"],
  "They logged mistakes": ["Your Error log", "/errors"],
  "They dropped what did not work": ["The report card in Progress", "/progress"],
  "They took mocks seriously late": ["Analyse a mock", "/progress/mock-review"],
};

/** "CAT 2021, 100 in VARC" as its parts: the score, what it is a score in, and the year when known. */
export function scoreOf(t: Topper): { score: string; of: string; year?: string } {
  const m = /(?:CAT (\d{4}), )?([\d.]+)( in VARC)?/.exec(t.result);
  return m ? { score: m[2], of: m[3] ? "percentile in VARC" : "percentile", year: m[1] } : { score: "", of: t.result };
}

export default function Stories() {
  const linked = new Set(TOPPERS.flatMap((t) => (t.link ? [t.link] : [])));
  const more = RESOURCES.filter((r) => r.c === "toppers" && !linked.has(r.u));
  const groups: [string, typeof more][] = [
    ["More from toppers", more.filter((r) => /interview|article/i.test(r.t))],
    ["How each CAT went", more.filter((r) => /analysis/i.test(r.t))],
  ];
  const [lead, ...rest] = [...TOPPERS].sort((a, b) => Number(scoreOf(b).score) - Number(scoreOf(a).score));
  const box = useRef<HTMLDivElement>(null);
  useGsap(box, (gsap, el) => {
    el.querySelectorAll<HTMLElement>("[data-score]").forEach((n) => {
      const end = Number(n.dataset.score), dp = (n.dataset.score!.split(".")[1] ?? "").length, v = { x: Math.max(0, end - 12) };
      gsap.to(v, { x: end, duration: 1.1, ease: "power3.out", onUpdate: () => { n.textContent = v.x.toFixed(dp); }, onComplete: () => { n.textContent = n.dataset.score!; } });
    });
  }, []);

  return (
    <Page>
      <PageHeader title="Topper stories">How 99+ percentile scorers prepared, in their own words where an interview is available, and the habits they share.</PageHeader>

      <div ref={box} className="flex flex-col gap-4">
        <Lead t={lead} />
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rest.map((t) => <li key={t.name}><Card t={t} /></li>)}
        </ul>
      </div>

      <Section title="What they have in common" description="Four habits that come up again and again, and where to build each one here.">
        <ul className="grid gap-4 md:grid-cols-2">
          {LESSONS.map((l) => {
            const here = DO_IT_HERE[l.h];
            return (
              <li key={l.h} className="flex flex-col gap-2 rounded-xl bg-card p-5 sm:px-7 sm:py-6">
                <h3 className="text-heading font-semibold">{l.h}</h3>
                <p className="text-base text-foreground/80">{l.p}</p>
                {here && <p className="mt-auto pt-1 text-base">Here: <TextLink to={here[1]}>{here[0]}</TextLink></p>}
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-2">
        {groups.filter(([, rs]) => rs.length).map(([title, rs]) => (
          <Section key={title} title={title}>
            <ul className="flex flex-col gap-1 rounded-xl bg-card p-2">
              {rs.map((r) => (
                <li key={r.id}>
                  <Ext href={r.u} className="group flex flex-col gap-0.5 rounded-lg px-4 py-3 transition-colors hover:bg-accent">
                    <span className="text-base font-semibold group-hover:text-primary">{r.n}</span>
                    <span className="text-base text-foreground/80">{r.w}</span>
                    <span className="text-sm text-muted-foreground">{r.t}</span>
                  </Ext>
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>

      <FeedbackInvite title="Your story could help someone">Scored well in CAT? Share your score, what worked and what you would change. Your preparation story can help next year&rsquo;s students.</FeedbackInvite>
    </Page>
  );
}

/** The highest score, set apart: its figure large, beside what they did. */
function Lead({ t }: { t: Topper }) {
  const s = scoreOf(t);
  return (
    <article className="grid gap-x-10 gap-y-4 rounded-2xl bg-card p-6 sm:p-9 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
      <div className="flex flex-col">
        <span data-score={s.score} className="text-display leading-none font-bold tracking-tight text-primary">{s.score}</span>
        <span className="pt-2 text-base font-semibold">{s.of}{s.year ? `, CAT ${s.year}` : ""}</span>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-serif text-title leading-tight font-semibold">{t.name}</h2>
        <p className="measure text-read text-foreground/85">{t.what}</p>
        {t.link && <Ext href={t.link} className="w-fit pt-1 text-base font-semibold text-primary underline-offset-4 hover:underline">Read the interview</Ext>}
      </div>
    </article>
  );
}

/** One topper: the score first, then who and what they did, and the interview when there is one. */
function Card({ t }: { t: Topper }) {
  const s = scoreOf(t);
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl bg-card p-5 sm:p-6">
      <div className="flex items-baseline gap-2">
        <span data-score={s.score} className="text-title leading-none font-bold tracking-tight">{s.score}</span>
        <span className="text-sm text-muted-foreground">{s.of}{s.year ? `, ${s.year}` : ""}</span>
      </div>
      <h3 className="text-heading font-semibold">{t.name}</h3>
      <p className="text-base text-foreground/85">{t.what}</p>
      <div className={cn("mt-auto pt-1", !t.link && "hidden")}>
        {t.link && <Ext href={t.link} className="text-base font-semibold text-primary underline-offset-4 hover:underline">Read the interview</Ext>}
      </div>
    </article>
  );
}
