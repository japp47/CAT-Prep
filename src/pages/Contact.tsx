import { ArrowUpRight, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { Ext, LinkButton, Page, PageHeader, TextLink } from "../components/kit";
import { IconInstagram } from "../components/Icons";
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL, mailTo } from "../data/site";

/**
 * Contact (F39's front door). A student with a complaint, a bug or an idea should not have to work out where it
 * goes, so the page sorts by what the message is about and sends each to the place that can act on it: a wrong
 * question to the report link under the question itself, where the question's id travels with it, and everything
 * else to the inbox with its subject already written. There is no form here on purpose: nothing on the site can
 * post a message with a reply address yet, and a form that answers "Sent" to nobody would be a lie.
 */

function Route({ title, children, action }: { title: string; children: ReactNode; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-7">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-heading font-semibold">{title}</h2>
        <p className="measure text-base text-muted-foreground">{children}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export default function Contact() {
  return (
    <Page>
      <PageHeader title="Contact us">
        Something broken, something missing, or an idea that would help you study. We read every message.
      </PageHeader>

      <div className="flex flex-col gap-3">
        <Route title="Something is broken, or you have an idea"
          action={<LinkButton to={mailTo("99ile: feedback")}>Write to us</LinkButton>}>
          A page that will not load, a number that looks wrong, a drill you wish existed. Tell us what you were
          doing when it happened and we can usually find it.
        </Route>

        <Route title="A question or its answer looks wrong"
          action={<LinkButton to="/practice" variant="secondary">Go to practice</LinkButton>}>
          Use <b className="font-semibold text-foreground">Report a problem with this question</b> under the question
          itself. That way the question travels with your report and we know exactly which one you mean.
        </Route>

        <Route title="Your data or your privacy"
          action={<LinkButton to={mailTo("99ile: my data")} variant="ghost">Email about your data</LinkButton>}>
          A copy of what we hold, a correction, or delete everything. What we keep and for how long is on the{" "}
          <TextLink to="/privacy">privacy page</TextLink>, which also names the grievance contact.
        </Route>
      </div>

      <section aria-labelledby="reach-h" className="flex flex-col gap-5 rounded-2xl bg-accent p-6 text-accent-foreground sm:p-8">
        <div className="flex flex-col gap-1.5">
          <h2 id="reach-h" className="text-heading font-semibold">Where to find us</h2>
          <p className="measure text-base text-foreground/75">
            Replies come from {CONTACT_EMAIL}. Every message is read, and the ones that change the site show up on{" "}
            <TextLink to="/updates">Updates</TextLink>.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <a href={"mailto:" + CONTACT_EMAIL}
            className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-background/70 px-4 text-base font-semibold transition-colors hover:bg-background active:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none">
            <Mail className="size-5 shrink-0 text-primary" aria-hidden />
            {CONTACT_EMAIL}
          </a>
          <Ext href={INSTAGRAM_URL}
            className="group inline-flex min-h-12 items-center gap-3 rounded-xl bg-background/70 px-4 text-base font-semibold transition-colors hover:bg-background active:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none">
            <span className="shrink-0 text-primary [&_svg]:size-5" aria-hidden><IconInstagram /></span>
            {INSTAGRAM_HANDLE}
            <ArrowUpRight className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden />
          </Ext>
        </div>
      </section>
    </Page>
  );
}
