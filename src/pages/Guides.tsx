import { Link, useParams } from "react-router-dom";
import { Meta, Page, PageHeader } from "../components/kit";
import { GUIDES } from "../data/guides";
import NotFound from "./NotFound";

export function GuideList() {
  return (
    <Page>
      <PageHeader title="Guides">Short, practical reads on planning, mocks, staying consistent and what happens after the score.</PageHeader>
      <ul className="grid gap-3 md:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.id}>
            <Link to={"/guides/" + g.id} className="group flex h-full flex-col gap-2 rounded-lg bg-card p-5 hover:bg-card/70 sm:p-6">
              <Meta>{g.tag}, {g.minutes} min read</Meta>
              <h2 className="text-heading font-semibold group-hover:text-primary">{g.title}</h2>
              <p className="text-base text-foreground/80">{g.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}

export function GuidePage() {
  const { id } = useParams();
  const i = GUIDES.findIndex((g) => g.id === id);
  if (i < 0) return <NotFound />;
  const g = GUIDES[i], next = GUIDES[(i + 1) % GUIDES.length];
  return (
    <Page>
      <PageHeader title={g.title} back={{ to: "/guides", label: "All guides" }}>
        <span className="block text-sm text-muted-foreground">{g.tag}, {g.minutes} min read</span>{g.summary}
      </PageHeader>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="flex flex-col gap-10 rounded-lg bg-card px-5 py-7 sm:px-10 sm:py-10">
          {g.parts.map((p, k) => (
            <section key={p.h} id={"part-" + k} className="measure flex scroll-mt-24 flex-col gap-3 text-reading">
              <h2 className="font-sans text-heading font-semibold">{p.h}</h2>
              {p.p?.map((x, j) => <p key={j}>{x}</p>)}
              {p.ol && <ol className="flex list-decimal flex-col gap-2 pl-6">{p.ol.map((x, j) => <li key={j}>{x}</li>)}</ol>}
              {p.ul && <ul className="flex list-disc flex-col gap-2 pl-6">{p.ul.map((x, j) => <li key={j}>{x}</li>)}</ul>}
            </section>
          ))}
        </article>
        <aside className="flex flex-col gap-6 xl:sticky xl:top-10">
          <nav aria-label="In this guide" className="hidden flex-col gap-1 xl:flex">
            <span className="pb-1 text-sm font-medium text-muted-foreground">In this guide</span>
            {g.parts.map((p, k) => <a key={p.h} href={"#part-" + k} className="rounded-md px-3 py-1.5 text-base text-foreground/80 hover:bg-card hover:text-foreground">{p.h}</a>)}
          </nav>
          <Link to={"/guides/" + next.id} className="group flex flex-col gap-1.5 rounded-lg bg-card p-5 hover:bg-card/70">
            <Meta>Next guide</Meta>
            <span className="text-heading font-semibold group-hover:text-primary">{next.title}</span>
            <span className="text-base text-foreground/80">{next.summary}</span>
          </Link>
        </aside>
      </div>
    </Page>
  );
}
