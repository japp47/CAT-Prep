import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Page, Section } from "@/components/kit";
import { CONTACT_EMAIL } from "@/data/site";

/** When this notice last changed. Update it with any change below. */
const UPDATED = "24 October 2026";

const P = ({ children }: { children: React.ReactNode }) => <p className="text-base leading-7 text-foreground/85">{children}</p>;
const List = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="flex list-disc flex-col gap-3 pl-5 text-base leading-7 text-foreground/85">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
);

/**
 * The privacy notice (docs/feature.md, "Privacy page"; DPDP Act 2023 and Rules 2025): what is stored where, why,
 * for how long, and how to see, correct or delete it, in plain words. It describes what the code does: change it
 * with the code (server/internal/cleanup, docs/database.md §7).
 */
export default function Privacy() {
  const mail = <a className="underline underline-offset-4" href={"mailto:" + CONTACT_EMAIL}>{CONTACT_EMAIL}</a>;
  return (
    <Page width="wide" className="gap-7 lg:gap-9">
      <header className="flex flex-col gap-5 rounded-xl bg-accent p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground sm:size-16" aria-hidden>
          <ShieldCheck className="size-7" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-title font-bold">Your privacy, clearly explained</h1>
          <p className="max-w-[58ch] text-base leading-7 text-foreground/85">
            What 99ile stores, why it stores it, and the choices you have.
          </p>
        </div>
        <p className="w-fit shrink-0 whitespace-nowrap rounded-full bg-background/70 px-3 py-2 text-sm text-muted-foreground">
          Updated {UPDATED}
        </p>
      </header>

      <Section title="The short version" className="rounded-xl bg-card p-5 sm:p-6">
        <List items={[
          "Without sync, everything you do stays in this browser. We never see it.",
          "If you turn sync on, your progress is copied to the 99ile server so your devices show the same thing. Without an account we do not know your name, email or phone number, and there is no password.",
          "If you sign in with Google, we keep your email and the name Google gives, to show who is signed in and to bring your progress to a new device. Nothing else from Google.",
          "No ads, no selling of data, no tracking across sites.",
          <>You can download what the server has, and delete it, at any time on the <Link className="underline underline-offset-4" to="/you#sync">You page</Link>.</>,
        ]} />
      </Section>

      <div className="grid items-start gap-x-6 gap-y-5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <Section title="On this device" className="rounded-xl bg-card p-5 sm:p-6">
            <P>Your plan, time settings, practice attempts and answers, logs, words, notes and settings are saved in this browser&rsquo;s storage. A backup file is made only when you download one, and it stays wherever you save it.</P>
          </Section>

          <Section title="Signing in with Google" className="rounded-xl bg-card p-5 sm:p-6">
            <P>Only if you choose to. Google tells us your email address, your name and a number that stays the same for your Google account; we keep these with your progress. We do not get your password, contacts or anything else in your Google account, and we do not post anything to it.</P>
            <P>You can sign out of a device at any time. &ldquo;Delete all my data&rdquo;, then &ldquo;Everywhere&rdquo;, deletes your account together with your progress.</P>
          </Section>

          <Section title="Where it is kept" className="rounded-xl bg-card p-5 sm:p-6">
            <List items={[
              "Render runs the 99ile server, in Singapore.",
              "Supabase hosts the database, in Singapore.",
              "Google signs you in, if you choose Sign in with Google.",
              "Cloudflare serves the website and runs a quick bot check (Turnstile) when you turn sync on.",
              "Google (Gmail) holds the team's daily email of problem reports, with any notes.",
              "GitHub holds the public list of reported questions, without notes.",
            ]} />
            <P>Singapore was chosen because it is the closest region these services offer to India.</P>
          </Section>

          <Section title="Your choices and rights" className="rounded-xl bg-card p-5 sm:p-6">
            <List items={[
              <>See it: &ldquo;Download what the server has&rdquo; on the <Link className="underline underline-offset-4" to="/you#sync">You page</Link> gives you everything the server keeps about your progress.</>,
              "Correct it: change or delete anything in the app; the change syncs.",
              "Stop it: “Turn off sync on this device” stops that device; your progress stays on it.",
              "Delete it: “Delete all my data”, then “Everywhere”, removes your progress from the server at once. Your other devices stop syncing and keep what they had until you delete it there too. Problem reports you sent stay, no longer linked to you; write to us to have them removed.",
            ]} />
          </Section>

          <Section title="Changes" className="rounded-xl bg-card p-5 sm:p-6">
            <P>When this notice changes, the date at the top changes too. Anything that changes what is stored will be described here before it happens.</P>
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Section title="What sync stores, and why" className="rounded-xl bg-card p-5 sm:p-6">
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

          <Section title="Problem reports" className="rounded-xl bg-card p-5 sm:p-6">
            <P>When you use &ldquo;Report a problem with this question&rdquo;, with or without sync, we receive:</P>
            <List items={[
              "Which question, the page it was on, and what is wrong (wrong answer key, unclear, typo or something else).",
              "Your note, if you write one. Please do not put your name, email or phone number in it.",
              "With sync on, the random id of your progress, so the report is not separate from it. Never your name.",
            ]} />
            <P>The 99ile team reads reports in a daily email. A public list on GitHub shows which questions were reported and why, never your note. Reports help us fix questions and nothing else.</P>
          </Section>

          <Section title="How long" className="rounded-xl bg-card p-5 sm:p-6">
            <List items={[
              "Your progress: until you delete it. Without an account, if no device has synced it for 30 days (every device signed out or removed), it is deleted from the server; your devices keep their copy.",
              "Your account (email and name): until you delete it.",
              "A sign-in in progress: 10 minutes, then it is deleted a day later.",
              "A device you removed: its entry is deleted 90 days later.",
              "Link codes: they work for 10 minutes and are deleted a day after that.",
              "The security log: 400 days.",
              "Server request logs with network addresses: 7 days.",
              "Problem reports: until the question is dealt with, then one more year. The daily emails are deleted from the team's inbox within a year too.",
            ]} />
          </Section>

          <Section title="Questions and complaints" className="rounded-xl bg-card p-5 sm:p-6">
            <P>Write to {mail}. We reply within 7 days. If you are not satisfied with our answer, you can complain to the Data Protection Board of India.</P>
          </Section>
        </div>
      </div>
    </Page>
  );
}
