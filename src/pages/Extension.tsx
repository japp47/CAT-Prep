import { useSearchParams } from "react-router-dom";
import { Keyboard, MousePointerClick, TextSelect } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, PageHeader, Section } from "../components/kit";
import { useAi } from "../lib/ai";
import { startSignIn } from "../lib/sync/runner";

/**
 * The Chrome Web Store listing, once it is published (set with the store's id, docs/design/article-to-rc.md, "Store").
 * Until then the page says it is coming. 99ile.in/chrome points here, and to the listing once it is live.
 */
export const STORE_URL = "";

const KEY = "rounded-md bg-background px-1.5 py-0.5 font-sans text-sm font-medium";

const WAYS = [
  { Icon: MousePointerClick, title: "Click the 99ile icon in the toolbar", body: "The panel opens beside the article with the text you selected, or the whole article when nothing is selected." },
  { Icon: TextSelect, title: "Select, then “Add to RC set”", body: "A button appears beside the text you select; parts add up to one passage. Turn it on for every site from the panel, or right-click a selection instead." },
  { Icon: Keyboard, title: <>Press <kbd className={KEY}>Alt</kbd> <kbd className={KEY}>Shift</kbd> <kbd className={KEY}>R</kbd></>, body: "The same as the icon, without the mouse." },
];

const PANEL = [
  ["A good CAT read?", "Before anything is sent, the panel says whether the passage argues a point, how long it takes at CAT pace, and which paragraphs it will use."],
  ["Questions checked twice", "Four CAT-style questions; a second AI answers them blind and any it misses are left out."],
  ["Show me in the article", "In review, the line that settles each question is highlighted on the page you read it on."],
  ["Saved like any set", "Your score, mistakes (with their cause), the redo queue and your words, on every device you sign in on."],
] as const;

/**
 * The extension's welcome (F53, D110; docs/design/article-to-rc.md, "The extension"), opened when it is installed:
 * what it does, how to start, what it can see, and sign-in, which every set needs.
 */
export default function Extension() {
  const ai = useAi(true);
  // Opened by the extension right after it was installed: signing in is what is left to do, not installing.
  const [sp] = useSearchParams();
  const installed = sp.get("from") === "install";
  const getIt = !installed && !!STORE_URL;
  return (
    <Page width="read">
      <PageHeader title={installed ? "The extension is ready" : "The 99ile extension"}>
        Turn any essay or editorial you are reading into a CAT-style RC set, answered in a panel beside it. Free, in Chrome, Edge and Brave on a computer.
      </PageHeader>

      {getIt && (
        <div className="flex flex-col gap-2">
          <Button asChild size="lg" className="w-full sm:w-fit"><a href={STORE_URL} target="_blank" rel="noreferrer noopener">Add to Chrome, free</a></Button>
          <p className="text-sm text-muted-foreground">From the Chrome Web Store. Then pin the 99ile icon from the puzzle-piece menu.</p>
        </div>
      )}

      <section className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6" aria-label="Your account">
        {ai === "ask" ? (
          <>
            <h2 className="text-heading font-semibold">You're signed in</h2>
            <p className="text-base text-foreground/85">Sets you make in the panel are saved to your account, with your mistakes and words. Go back to your article and click the 99ile icon.</p>
          </>
        ) : ai === "signin" ? (
          <>
            <h2 className="text-heading font-semibold">Sign in once</h2>
            <p className="text-base text-foreground/85">Sets are made with AI, which needs an account. Signing in also keeps every set, mistake and word, so you can review them on your phone.</p>
            <Button size="lg" variant={getIt ? "secondary" : "default"} className="w-full sm:w-fit" onClick={() => startSignIn(installed ? "/extension?from=install" : "/extension")}>Sign in with Google</Button>
          </>
        ) : (
          <>
            <h2 className="text-heading font-semibold">Coming soon</h2>
            <p className="text-base text-foreground/85">Article sets are not switched on yet. Until then, the RC library has original sets to practise.</p>
          </>
        )}
      </section>

      <Section title="Three ways to start">
        <ul className="flex flex-col gap-px overflow-hidden rounded-lg">
          {WAYS.map(({ Icon, title, body }, i) => (
            <li key={i} className="flex gap-3 bg-card px-4 py-4 sm:px-5">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-base font-semibold">{title}</span>
                <span className="text-base text-muted-foreground">{body}</span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="In the panel">
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          {PANEL.map(([t, d]) => (
            <div key={t} className="flex flex-col gap-1">
              <dt className="text-base font-semibold">{t}</dt>
              <dd className="text-base text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="What it can see">
        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-5 text-base">
          <p>Nothing, until you click. It reads the page you are on only when you click the icon, use the right-click menu or press the shortcut.</p>
          <p>Only the paragraphs used for your set are sent, to make it, and they stay private. It asks for access to 99ile.in alone, so the panel can keep you signed in.</p>
        </div>
      </Section>

      <p className="text-base text-muted-foreground">
        {STORE_URL
          ? <>Get it from the <a href={STORE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-primary underline underline-offset-4">Chrome Web Store</a>. </>
          : "On the Chrome Web Store soon. "}
        On a phone, paste the article on the <a href={import.meta.env.BASE_URL + "practice/article"} className="font-medium text-primary underline underline-offset-4">article page</a> instead.
      </p>
    </Page>
  );
}
