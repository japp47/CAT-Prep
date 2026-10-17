import { Badge } from "@/components/ui/badge";
import { Page, PageHeader, Section, TextLink } from "../components/kit";
import { ROADMAP } from "../data/roadmap";
import { REPO_URL } from "../data/site";

export default function Roadmap() {
  return (
    <Page width="read">
      <PageHeader title="What's coming">
        The site grows one step at a time. VARC is live with practice; DILR, Quant and optional sign-in come next. Found a problem or have an idea? <TextLink to={REPO_URL + "/issues/new"}>Tell us on GitHub</TextLink>
      </PageHeader>
      {ROADMAP.map((g) => (
        <Section key={g.title} title={g.title} action={<Badge variant="secondary">{g.status}</Badge>}>
          <ul className="flex flex-col gap-1 rounded-lg bg-card p-2">
            {g.items.map((it) => <li key={it.title} className="flex flex-col gap-0.5 rounded-md px-3.5 py-3"><b className="text-base font-semibold">{it.title}</b><span className="text-base text-foreground/80">{it.text}</span></li>)}
          </ul>
        </Section>
      ))}
    </Page>
  );
}
