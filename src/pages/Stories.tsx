import { Ext, LinkButton, Meta, Page, PageHeader, Section, TextLink } from "../components/kit";
import { LESSONS, TOPPERS } from "../data/stories";
import { RESOURCES } from "../sections/varc/resources";

export default function Stories() {
  const interviews = RESOURCES.filter((r) => r.c === "toppers");
  return (
    <Page>
      <PageHeader title="Topper stories">How 99+ percentile scorers prepared, in their own words where an interview is available.</PageHeader>
      <Section title="What they have in common">
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {LESSONS.map((l) => <div key={l.h} className="flex flex-col gap-1.5"><h3 className="text-base font-semibold">{l.h}</h3><p className="measure text-base text-foreground/80">{l.p}</p></div>)}
        </div>
      </Section>
      <Section title="What they did">
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TOPPERS.map((t) => (
            <li key={t.name} className="flex flex-col gap-2 rounded-lg bg-card p-5">
              <h3 className="text-heading font-semibold">{t.name}</h3>
              <Meta>{t.result}</Meta>
              <p className="text-base text-foreground/85">{t.what}</p>
              {t.link && <div className="mt-auto pt-1"><LinkButton to={t.link} variant="secondary" size="sm">Read the interview</LinkButton></div>}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Interviews and exam analysis">
        <ul className="flex flex-col gap-1 rounded-lg bg-card p-2">
          {interviews.map((r) => (
            <li key={r.id}>
              <Ext href={r.u} className="flex flex-col gap-0.5 rounded-md px-3.5 py-3 hover:bg-muted">
                <span className="text-base font-semibold">{r.n}</span>
                <span className="text-base text-foreground/80">{r.w}</span>
                <Meta>{r.t}</Meta>
              </Ext>
            </li>
          ))}
        </ul>
      </Section>
      <p className="measure text-base text-muted-foreground">Scored well in CAT? Your preparation story can help next year's students. Story submissions are on the <TextLink to="/roadmap">roadmap</TextLink>.</p>
    </Page>
  );
}
