import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Page, PageHeader, Section, TextLink } from "../components/kit";
import { ROADMAP, UPDATED, type RoadGroup } from "../data/roadmap";
import { CONTACT_EMAIL } from "../data/site";
import { mediumDate } from "../lib/date";
import { useGsap } from "../lib/motion";

/**
 * What's coming, redesigned 4 Nov 2026 (docs/design/info-pages.md): what shipped this month as cards, everything else
 * that is live folded away, then a timeline from "Now" through each dated group. The timeline's line draws down from
 * Now once on arrival and each station marks as the line reaches it (GSAP); under reduced motion it is simply there.
 */

const [fresh, live, ...ahead] = ROADMAP as [RoadGroup, RoadGroup, ...RoadGroup[]];

export default function Roadmap() {
  return (
    <Page width="read">
      <PageHeader title="What's coming">
        The site grows one step at a time. VARC and DILR are live; harder DI sets, AI feedback and optional sign-in come next, then Quant from January. Updated {mediumDate(UPDATED)}.
      </PageHeader>

      <Section title="New this month">
        <ul className="grid gap-3 sm:grid-cols-2">
          {fresh.items.map((it) => (
            <li key={it.title} className="flex flex-col gap-2 rounded-xl bg-card p-5 sm:p-6">
              <span className="flex items-center gap-2 text-sm font-medium text-success"><span className="size-2 rounded-full bg-success" aria-hidden />Live</span>
              <h3 className="text-heading font-semibold">{it.title}</h3>
              <p className="text-base text-foreground/80">{it.text}</p>
            </li>
          ))}
        </ul>
        <AlsoLive group={live} />
      </Section>

      <Section title="What's next">
        <Timeline groups={ahead} />
      </Section>

      <p className="measure rounded-xl bg-card px-5 py-4 text-base sm:px-6">
        An idea, or something that does not work? Write to <TextLink to={"mailto:" + CONTACT_EMAIL}>{CONTACT_EMAIL}</TextLink>. Every message is read, and the roadmap moves with what students ask for.
      </p>
    </Page>
  );
}

/** The rest of what is live, folded: the list is long and a returning student came for what is new. */
function AlsoLive({ group }: { group: RoadGroup }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl bg-card">
      <CollapsibleTrigger className="flex min-h-12 w-full items-center justify-between gap-4 rounded-xl px-5 py-3 text-left text-base font-semibold hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-6">
        Also live: {group.items.length} more
        <ChevronDown className={cn("size-5 shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="grid gap-x-8 gap-y-4 px-5 pb-6 sm:grid-cols-2 sm:px-6">
          {group.items.map((it) => (
            <li key={it.title} className="flex flex-col gap-1">
              <b className="text-base font-semibold">{it.title}</b>
              <span className="text-base text-foreground/80">{it.text}</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Now, then each group at its station on one line; a group's items sit in a tone card beside its date. */
function Timeline({ groups }: { groups: RoadGroup[] }) {
  const box = useRef<HTMLOListElement>(null);
  useGsap(box, (gsap) => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.from("[data-line]", { scaleY: 0, transformOrigin: "top", duration: 0.9 });
    tl.from("[data-stop]", { scale: 0, duration: 0.3, stagger: 0.22 }, 0.15);
  }, []);
  return (
    <ol ref={box} className="relative flex flex-col gap-8 pl-9" aria-label="From now on">
      <span data-line aria-hidden className="absolute top-3 bottom-3 left-[0.6875rem] w-0.5 rounded-full bg-border" />
      <li className="relative flex flex-col">
        <span data-stop aria-hidden className="absolute top-1 -left-9 grid size-6 place-items-center rounded-full bg-primary/15"><span className="size-3 rounded-full bg-primary" /></span>
        <span className="text-base font-semibold">Now</span>
        <span className="text-sm text-muted-foreground">{mediumDate(UPDATED)}</span>
      </li>
      {groups.map((g) => (
        <li key={g.title} className="relative flex flex-col gap-3">
          <span data-stop aria-hidden className="absolute top-1 -left-9 grid size-6 place-items-center rounded-full bg-background"><span className="size-3 rounded-full border-2 border-primary/60 bg-background" /></span>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h3 className="text-heading font-semibold">{g.title}</h3>
            <span className="text-base text-muted-foreground">{g.status}</span>
          </div>
          <ul className="flex flex-col gap-1 rounded-xl bg-card p-2">
            {g.items.map((it) => (
              <li key={it.title} className="flex flex-col gap-0.5 rounded-lg px-3.5 py-3">
                <b className="text-base font-semibold">{it.title}</b>
                <span className="text-base text-foreground/80">{it.text}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
