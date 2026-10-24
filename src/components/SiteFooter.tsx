import { Link } from "react-router-dom";
import { SECTIONS } from "../sections";
import Brand from "./Brand";
import { CONTACT_EMAIL } from "../data/site";
import type { SiteNavItem } from "./SiteHeader";

function FooterColumn({ title, items }: { title: string; items: SiteNavItem[] }) {
  return (
    <nav aria-label={`Footer ${title}`} className="flex flex-col items-start gap-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="flex flex-col items-start gap-1">
        {items.map((item) => <li key={item.to}>
          <Link to={item.to} className="inline-flex min-h-8 items-center gap-2 rounded-sm text-sm font-medium text-foreground/75 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {item.label}{item.soon && <span className="text-sm font-normal text-muted-foreground">Soon</span>}
          </Link>
        </li>)}
      </ul>
    </nav>
  );
}

export default function SiteFooter() {
  return (
    <footer className="mt-6 rounded-lg bg-accent px-5 py-5 lg:mt-10 lg:px-7 lg:py-7">
      <div className="hidden gap-x-8 gap-y-10 lg:grid lg:grid-cols-3 xl:grid-cols-[1.35fr_repeat(5,minmax(0,1fr))]">
        <div className="flex max-w-64 flex-col items-start gap-4">
          <Brand />
          <p className="text-sm leading-relaxed text-muted-foreground">A free CAT study space for steady practice, clear review, and a plan that fits your day.</p>
        </div>
        <FooterColumn title="Study" items={[{ to: "/today", label: "Today" }, { to: "/practice", label: "Practice" }, { to: "/plan", label: "Plan and time" }]} />
        <FooterColumn title="Sections" items={SECTIONS.map((section) => ({ to: "/" + section.id, label: section.short, soon: section.status === "soon" }))} />
        <FooterColumn title="Progress" items={[{ to: "/progress", label: "Overview" }, { to: "/history", label: "History" }, { to: "/review", label: "Weekly review" }, { to: "/errors", label: "Error log" }, { to: "/words", label: "Words" }, { to: "/journal", label: "Reading journal" }]} />
        <FooterColumn title="Explore" items={[{ to: "/updates", label: "Updates" }, { to: "/exams", label: "CAT and other exams" }, { to: "/guides", label: "Guides" }, { to: "/stories", label: "Topper stories" }, { to: "/roadmap", label: "What's coming" }]} />
        <div className="flex flex-col items-start gap-3">
          <h2 className="text-sm font-semibold text-foreground">Support</h2>
          <Link to="/settings" className="inline-flex min-h-8 items-center rounded-sm text-sm font-medium text-foreground/75 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Settings and backup</Link>
          <Link to="/privacy" className="inline-flex min-h-8 items-center rounded-sm text-sm font-medium text-foreground/75 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Privacy</Link>
          <a href={"mailto:" + CONTACT_EMAIL} className="inline-flex min-h-8 items-center rounded-sm text-sm font-medium text-foreground/75 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">{CONTACT_EMAIL}</a>
        </div>
      </div>
      <div className="flex flex-col items-start gap-1 text-left text-sm leading-relaxed text-muted-foreground lg:mt-6 lg:flex-row lg:justify-between lg:gap-2 lg:py-4">
        <p>© {new Date().getFullYear()} 99ile</p>
        <p>Free CAT preparation. <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">Privacy</Link></p>
      </div>
    </footer>
  );
}
