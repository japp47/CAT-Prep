import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Page, PageHeader } from "../components/kit";
import { GUIDES, REVIEWED, type Guide } from "../data/guides";
import { diffDays, mediumDate, todayIso } from "../lib/date";
import { setDescription } from "../lib/meta";
import { useGsap } from "../lib/motion";
import { guideDescription } from "../lib/seo";
import NotFound from "./NotFound";

/**
 * Guides, redesigned 4 Nov 2026 (docs/design/info-pages.md): "Start here" as the one featured read, the guide for the
 * weeks before this year's CAT beside it while those weeks last, then the rest by kind. A guide shows how far through
 * it the student is and which part they are on.
 */

const ORDER: Guide["tag"][] = ["Start", "Strategy", "Mocks", "Life", "Admissions"];
const KIND: Record<Guide["tag"], string> = { Start: "Start", Strategy: "Strategy and the exam", Mocks: "Mocks", Life: "Life around preparation", Admissions: "After the score" };
/** The guide for the weeks before CAT 2026, featured until the exam is over. */
const CAT26 = { id: "last-25-days", exam: "2026-11-29" };

export function GuideList() {
  const today = todayIso();
  const start = GUIDES.find((g) => g.tag === "Start")!;
  const timely = today <= CAT26.exam ? GUIDES.find((g) => g.id === CAT26.id) : undefined;
  const rest = GUIDES.filter((g) => g !== start && g !== timely);
  const box = useRef<HTMLDivElement>(null);
  useGsap(box, (gsap) => { gsap.from("[data-feature]", { y: 14, opacity: 0, duration: 0.5, stagger: 0.08, ease: "power3.out", clearProps: "all" }); }, []);
  return (
    <Page>
      <PageHeader title="Guides">Short, practical reads on planning, mocks, staying consistent and what happens after the score. Checked {mediumDate(REVIEWED)}.</PageHeader>

      <div ref={box} className={cn("grid gap-4", timely && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}>
        <Link data-feature to={"/guides/" + start.id} className="group flex flex-col gap-4 rounded-2xl bg-card p-6 transition-colors hover:bg-accent sm:p-9">
          <span className="text-sm font-medium text-muted-foreground">Start here, {start.minutes} min read</span>
          <h2 className="font-serif text-title leading-tight font-semibold text-balance group-hover:text-primary">{start.title}</h2>
          <p className="measure text-read text-foreground/85">{start.summary}</p>
          <span className="mt-auto text-base font-semibold text-primary underline-offset-4 group-hover:underline">Read the guide</span>
        </Link>
        {timely && (
          <Link data-feature to={"/guides/" + timely.id} className="group flex flex-col gap-3 rounded-2xl bg-highlight-soft p-6 transition-colors hover:bg-highlight/40 sm:p-8">
            <span className="text-sm font-semibold">Sitting CAT 2026? {diffDays(today, CAT26.exam)} days to go</span>
            <h2 className="font-serif text-heading leading-snug font-semibold text-balance">{timely.title}</h2>
            <p className="text-base text-foreground/85">{timely.summary}</p>
            <span className="mt-auto text-base font-semibold">{timely.minutes} min read</span>
          </Link>
        )}
      </div>

      {ORDER.filter((t) => t !== "Start" && rest.some((g) => g.tag === t)).map((t) => (
        <section key={t} className="flex flex-col gap-3" aria-labelledby={"kind-" + t}>
          <h2 id={"kind-" + t} className="text-heading font-semibold">{KIND[t]}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {rest.filter((g) => g.tag === t).map((g) => (
              <li key={g.id}>
                <Link to={"/guides/" + g.id} className="group flex h-full flex-col gap-2 rounded-xl bg-card p-5 transition-colors hover:bg-accent sm:p-6">
                  <h3 className="text-heading font-semibold group-hover:text-primary">{g.title}</h3>
                  <p className="text-base text-foreground/80">{g.summary}</p>
                  <span className="mt-auto pt-1 text-sm text-muted-foreground">{g.minutes} min read</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}

/** How far down the article the reader is (0 to 1), and which part is on screen. */
function useReading(article: React.RefObject<HTMLElement | null>, parts: number) {
  const [state, setState] = useState({ done: 0, on: 0 });
  useEffect(() => {
    const el = article.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const r = el.getBoundingClientRect(), view = window.innerHeight;
      // Full when the article's end reaches the bottom of the screen.
      const done = Math.min(1, Math.max(0, (view - r.top) / r.height));
      // The part whose heading has passed the upper third of the screen, or the last part once the end is in view.
      const heads = [...el.querySelectorAll<HTMLElement>("section[id^=part-]")];
      const on = r.bottom <= view + 4 ? heads.length - 1 : Math.max(0, heads.filter((h) => h.getBoundingClientRect().top < view / 3).length - 1);
      setState((s) => (Math.abs(s.done - done) > 0.005 || s.on !== on ? { done, on } : s));
    };
    const ask = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    return () => { window.removeEventListener("scroll", ask); window.removeEventListener("resize", ask); cancelAnimationFrame(frame); };
  }, [article, parts]);
  return state;
}

export function GuidePage() {
  const { id } = useParams();
  const i = GUIDES.findIndex((g) => g.id === id);
  const article = useRef<HTMLElement>(null);
  const read = useReading(article, i < 0 ? 0 : GUIDES[i].parts.length);
  // Its own title and description, so a result reads "How to analyse a mock", not "Guide" (the router set the generic one first).
  const guide = i < 0 ? null : GUIDES[i];
  useEffect(() => {
    if (!guide) return;
    document.title = guide.title + " · 99ile";
    setDescription(guideDescription(guide));
  }, [guide]);
  if (i < 0) return <NotFound />;
  const g = GUIDES[i], next = GUIDES[(i + 1) % GUIDES.length];
  const soon = g.id === CAT26.id && todayIso() <= CAT26.exam ? diffDays(todayIso(), CAT26.exam) : null;
  return (
    <Page>
      {/* How far through the guide: a thin line under the header that fills as the student reads. */}
      <div aria-hidden className="sticky top-14 z-20 -mb-10 h-1 overflow-hidden rounded-full bg-foreground/[0.06] lg:top-0 lg:-mb-12">
        <div className="h-full origin-left rounded-full bg-primary" style={{ transform: `scaleX(${read.done})` }} />
      </div>
      <PageHeader title={<span className="font-serif text-balance">{g.title}</span>} back={{ to: "/guides", label: "All guides" }}>
        <span className="block text-sm text-muted-foreground">{KIND[g.tag]}, {g.minutes} min read{soon !== null ? `, ${soon} days to CAT 2026` : ""}</span>{g.summary}
      </PageHeader>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <article ref={article} className="flex flex-col gap-10 rounded-2xl bg-card px-5 py-7 sm:px-10 sm:py-10">
          {g.parts.map((p, k) => (
            <section key={p.h} id={"part-" + k} className="measure flex scroll-mt-24 flex-col gap-3 text-reading">
              <h2 className="font-sans text-heading font-semibold">{p.h}</h2>
              {p.p?.map((x, j) => <p key={j}>{x}</p>)}
              {p.ol && <ol className="flex list-decimal flex-col gap-2 pl-6 marker:font-semibold marker:text-primary">{p.ol.map((x, j) => <li key={j}>{x}</li>)}</ol>}
              {p.ul && <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-primary">{p.ul.map((x, j) => <li key={j}>{x}</li>)}</ul>}
            </section>
          ))}
        </article>
        <aside className="flex flex-col gap-6 xl:sticky xl:top-10">
          <nav aria-label="In this guide" className="hidden flex-col gap-1 xl:flex">
            <span className="pb-1 text-sm font-medium text-muted-foreground">In this guide</span>
            {g.parts.map((p, k) => (
              <a key={p.h} href={"#part-" + k} aria-current={read.on === k ? "location" : undefined}
                className={cn("rounded-md px-3 py-1.5 text-base transition-colors motion-reduce:transition-none", read.on === k ? "bg-card font-semibold text-foreground" : "text-foreground/75 hover:bg-card hover:text-foreground")}>{p.h}</a>
            ))}
          </nav>
          <Link to={"/guides/" + next.id} className="group flex flex-col gap-1.5 rounded-xl bg-card p-5 transition-colors hover:bg-accent">
            <span className="text-sm text-muted-foreground">Next guide</span>
            <span className="text-heading font-semibold group-hover:text-primary">{next.title}</span>
            <span className="text-base text-foreground/80">{next.summary}</span>
          </Link>
        </aside>
      </div>
    </Page>
  );
}
