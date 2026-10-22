import { Link } from "react-router-dom";
import { Page, PageHeader, Section } from "@/components/kit";
import { CONTACT_EMAIL } from "@/data/site";

/** When this notice last changed. Update it with any change below. */
const UPDATED = "22 October 2026";

const P = ({ children }: { children: React.ReactNode }) => <p className="max-w-prose text-base leading-relaxed">{children}</p>;
const List = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="flex max-w-prose list-disc flex-col gap-2 pl-5 text-base leading-relaxed">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
);

/**
 * The privacy notice (docs/feature.md, "Privacy page"; DPDP Act 2023 and Rules 2025): what is stored where, why,
 * for how long, and how to see, correct or delete it, in plain words. It describes what the code does: change it
 * with the code (server/internal/cleanup, docs/database.md §7).
 */
export default function Privacy() {
  const mail = <a className="underline underline-offset-4" href={"mailto:" + CONTACT_EMAIL}>{CONTACT_EMAIL}</a>;
  return (
    <Page width="read">
      <PageHeader title="Privacy">How 99ile handles your data. Last updated {UPDATED}.</PageHeader>

      <Section title="The short version">
        <List items={[
          "Without sync, everything you do stays in this browser. We never see it.",
          "If you turn sync on, your progress is copied to the 99ile server so your devices show the same thing. We do not ask for your name, email, phone number or a password.",
          "No ads, no selling of data, no tracking across sites.",
          <>You can download what the server has, and delete it, at any time in <Link className="underline underline-offset-4" to="/settings#sync">Settings</Link>.</>,
        ]} />
      </Section>

      <Section title="On this device">
        <P>Your plan, time settings, practice attempts and answers, logs, words, notes and settings are saved in this browser&rsquo;s storage. A backup file is made only when you download one, and it stays wherever you save it.</P>
      </Section>

      <Section title="What sync stores, and why">
        <P>Only if you turn sync on. It is for people 18 and over.</P>
        <List items={[
          "Your progress: the same things as on this device, so your other devices can show them and you can get them back with your recovery code.",
          "A random id for your progress. It is not linked to who you are.",
          "For each device: a name such as “Chrome on Android”, its type, when it joined and when it last synced, so you can see and remove your devices.",
          "A random key in a cookie that tells the server which device is asking. The server keeps only a scrambled form of it, and of your recovery and link codes, so even we cannot use them.",
          "A security log of account events (sync turned on, a device linked or removed, a code tried, data downloaded or deleted) with a scrambled form of your network address, never the address itself. It is there to stop abuse, such as one network creating many accounts.",
        ]} />
        <P>The servers that host 99ile see your network address with each request, as every website does, and keep it in their logs for 7 days.</P>
      </Section>

      <Section title="Where it is kept">
        <List items={[
          "Render runs the 99ile server, in Singapore.",
          "Supabase hosts the database, in Singapore.",
          "Cloudflare serves the website and runs a quick bot check (Turnstile) when you turn sync on.",
        ]} />
        <P>Singapore was chosen because it is the closest region these services offer to India.</P>
      </Section>

      <Section title="How long">
        <List items={[
          "Your progress: until you delete it.",
          "A device you removed: its entry is deleted 90 days later.",
          "Link codes: they work for 10 minutes and are deleted a day after that.",
          "The security log: 400 days.",
          "Server request logs with network addresses: 7 days.",
        ]} />
      </Section>

      <Section title="Your choices and rights">
        <List items={[
          <>See it: &ldquo;Download what the server has&rdquo; in <Link className="underline underline-offset-4" to="/settings#sync">Settings</Link> gives you everything the server keeps about your progress.</>,
          "Correct it: change or delete anything in the app; the change syncs.",
          "Stop it: “Turn off sync on this device” stops that device; your progress stays on it.",
          "Delete it: “Delete all my data”, then “Everywhere”, removes your progress from the server at once. Your other devices stop syncing and keep what they had until you delete it there too.",
        ]} />
      </Section>

      <Section title="Questions and complaints">
        <P>Write to {mail}. We reply within 7 days. If you are not satisfied with our answer, you can complain to the Data Protection Board of India.</P>
      </Section>

      <Section title="Changes">
        <P>When this notice changes, the date at the top changes too. Anything that changes what is stored will be described here before it happens.</P>
      </Section>
    </Page>
  );
}
