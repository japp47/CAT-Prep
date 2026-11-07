import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { SECTIONS } from "../sections";
import Brand from "./Brand";
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "../data/site";
import { IconInstagram } from "./Icons";
import type { SiteNavItem } from "./SiteHeader";

/**
 * The last thing on a page, so it stays calm: who this is and how to reach us on the left, the pages in columns on
 * the right, then the small print after a clear gap. The ways to reach us sit with the brand rather than in a strip
 * of their own, and they show at every width — a phone hides the nav columns (it has the tab bar and the menu) but
 * never the identity. Nothing is listed twice.
 */

const LINK = "inline-flex min-h-11 items-center lg:min-h-9 gap-2 rounded-sm text-sm font-medium text-foreground/70 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none";

function FooterColumn({ title, items }: { title: string; items: SiteNavItem[] }) {
  return (
    <nav aria-label={`Footer ${title}`} className="hidden flex-col items-start gap-2 lg:flex">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="flex flex-col items-start">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className={LINK}>
              {item.label}{item.soon && <span className="font-normal text-muted-foreground">Soon</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One way to reach the team: a 44px target with the mark alone, its name left to screen readers. */
function Reach({ href, label, external, children }: { href: string; label: string; external?: boolean; children: ReactNode }) {
  return (
    <a href={href} aria-label={label} title={label} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="grid size-11 place-items-center rounded-lg bg-background/60 text-foreground/75 transition-colors hover:bg-background hover:text-primary active:bg-background active:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none [&_svg]:size-5">
      {children}
    </a>
  );
}

export default function SiteFooter() {
  return (
    <footer className="mt-6 flex flex-col gap-10 rounded-2xl bg-accent px-5 py-7 lg:mt-10 lg:gap-14 lg:px-8 lg:py-9">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12 xl:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
        <div className="flex max-w-80 flex-col items-start gap-4">
          <Brand />
          <p className="text-sm leading-relaxed text-foreground/70">A free CAT study space for steady practice, clear review, and a plan that fits your day.</p>
          {/* Pulled left by the icon button's own padding, so the marks line up with the text above them. */}
          <div className="-ml-3 flex items-center gap-1">
            <Reach href={"mailto:" + CONTACT_EMAIL} label={`Email us at ${CONTACT_EMAIL}`}><Mail aria-hidden /></Reach>
            <Reach href={INSTAGRAM_URL} external label={`99ile on Instagram, ${INSTAGRAM_HANDLE}`}><IconInstagram /></Reach>
          </div>
        </div>
        <FooterColumn title="Study" items={[{ to: "/today", label: "Today" }, { to: "/practice", label: "Practice" }, { to: "/plan", label: "Plan and time" }]} />
        <FooterColumn title="Sections" items={SECTIONS.map((section) => ({ to: "/" + section.id, label: section.short, soon: section.status === "soon" }))} />
        <FooterColumn title="Progress" items={[{ to: "/progress", label: "Overview" }, { to: "/history", label: "History" }, { to: "/review", label: "Weekly review" }, { to: "/errors", label: "Error log" }, { to: "/words", label: "Words" }, { to: "/journal", label: "Reading journal" }]} />
        <FooterColumn title="Explore" items={[{ to: "/updates", label: "Updates" }, { to: "/exams", label: "CAT and other exams" }, { to: "/guides", label: "Guides" }, { to: "/stories", label: "Topper stories" }, { to: "/roadmap", label: "What's coming" }]} />
        <FooterColumn title="Support" items={[{ to: "/contact", label: "Contact us" }, { to: "/settings", label: "Settings and backup" }, { to: "/privacy", label: "Privacy" }]} />

        {/* A phone gets the three that belong at the end of a page, not all twenty: the rest are a tap away in the menu. */}
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 lg:hidden">
          <Link to="/contact" className={LINK}>Contact us</Link>
          <Link to="/settings" className={LINK}>Settings and backup</Link>
          <Link to="/privacy" className={LINK}>Privacy</Link>
        </nav>
      </div>

      <div className="flex flex-col gap-1 text-sm leading-relaxed text-muted-foreground lg:flex-row lg:justify-between lg:gap-4">
        <p>© {new Date().getFullYear()} 99ile</p>
        <p>Free CAT preparation.</p>
      </div>
    </footer>
  );
}
