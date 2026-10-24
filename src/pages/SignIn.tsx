import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import GoogleButton from "../components/GoogleButton";
import { LinkButton, Page } from "../components/kit";
import { useSyncStatus } from "../components/SyncNav";
import { SIGNIN_ENABLED } from "../lib/api";
import { refreshAccount, startSignIn } from "../lib/sync/runner";
import { safeBack, SIGNIN_WORDS } from "../lib/sync/words";

const SignInStep = lazy(() => import("../components/sync/SignInStep"));

const REASONS = [
  "The same plan, mistakes and history on your phone and laptop",
  "A new or wiped phone loses nothing: sign in and it all comes back",
  "Only your email and name. No password, nothing posted to Google",
];

/** One fixed pattern of study days (0 to 4), the same on both screens: what sync means, drawn instead of told. */
const DAYS = [3, 1, 0, 2, 4, 1, 2, 0, 3, 2, 1, 4, 2, 0, 1, 3, 2, 4, 0, 2, 3, 1, 2, 4, 3, 0, 1, 2];
const SHADE = ["bg-primary-foreground/15", "bg-primary-foreground/35", "bg-primary-foreground/55", "bg-primary-foreground/75", "bg-primary-foreground"];
function Strip({ cols, cell }: { cols: number; cell: string }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {DAYS.slice(0, cols * 4).map((d, i) => <span key={i} className={cn("aspect-square rounded-[3px]", cell, SHADE[d])} />)}
    </div>
  );
}

/** A laptop and a phone showing the same days: the left panel, drawn in code from the product itself. */
function SameOnBoth() {
  return (
    <div className="flex items-end justify-center gap-5" aria-hidden>
      <div className="flex w-56 flex-col items-center sm:w-64">
        <div className="w-full rounded-t-lg border-4 border-primary-foreground/80 border-b-0 bg-primary-foreground/10 p-3"><Strip cols={7} cell="" /></div>
        <div className="h-2.5 w-[115%] rounded-b-lg bg-primary-foreground/80" />
      </div>
      <div className="w-20 rounded-xl border-4 border-primary-foreground/80 bg-primary-foreground/10 px-2 pb-3 pt-4 sm:w-24"><Strip cols={4} cell="" /></div>
    </div>
  );
}

/**
 * Sign in (docs/feature.md F33 and F47, B7): the one page every "Sign in" in the app leads to. Signing in is an
 * offer, never a gate: 99ile works the same without it. Layout adapted from 21st.dev's SignInPage (split: picture
 * and form), with Google as the only way in and the picture drawn from the product. Google returns here
 * (?signin=), the question about this device's progress is asked here, then the student goes back (?then=).
 */
export default function SignIn() {
  const s = useSyncStatus();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const then = safeBack(sp.get("then"));
  const signin = sp.get("signin");
  const [note, setNote] = useState("");
  const [ticket, setTicket] = useState("");

  useEffect(() => {
    if (!signin) return;
    if (signin === "done") { void refreshAccount().then(() => nav(then, { replace: true })); return; }
    if (signin in SIGNIN_WORDS) setNote(SIGNIN_WORDS[signin]); else setTicket(signin);
    const next = new URLSearchParams(sp);
    next.delete("signin");
    setSp(next, { replace: true });
  }, [signin, sp, setSp, nav, then]);

  const back = "/signin" + (then !== "/" ? "?then=" + encodeURIComponent(then) : "");
  const account = s.account;

  return (
    <Page>
    <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl bg-card lg:min-h-[36rem] lg:grid-cols-2">
      <aside className="relative flex flex-col justify-between gap-8 bg-primary px-6 py-6 text-primary-foreground sm:px-10 sm:py-10">
        <Link to={then} aria-label="Back" className="grid size-10 place-items-center rounded-full bg-primary-foreground/15 transition-colors hover:bg-primary-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground motion-reduce:transition-none">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="hidden sm:block"><SameOnBoth /></div>
        <div className="flex flex-col gap-2">
          <p className="text-heading font-semibold text-balance sm:text-title">Your study, on every device</p>
          <p className="measure hidden text-base text-primary-foreground/85 sm:block">Practise on your phone on the way, review on your laptop at night. Same plan, same mistakes, same redo queue.</p>
        </div>
      </aside>

      <section aria-labelledby="signin-title" className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          {ticket ? (
            <Suspense fallback={null}>
              <SignInStep ticket={ticket} onDone={(text) => { setTicket(""); if (text.startsWith("Signed in")) nav(then, { replace: true }); else setNote(text); }} />
            </Suspense>
          ) : account ? (
            <>
              <div className="flex flex-col gap-2">
                <h1 id="signin-title" className="text-title font-semibold">You are signed in</h1>
                <p className="text-base text-muted-foreground">As <span className="font-semibold text-foreground">{account.email}</span>. Your progress syncs to your account.</p>
              </div>
              <div className="flex flex-col gap-2">
                <LinkButton to={then} size="lg" className="w-full">Continue</LinkButton>
                <LinkButton to="/you#sync" variant="ghost" className="w-full">Devices and sign out</LinkButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h1 id="signin-title" className="text-title font-semibold">Keep your progress safe</h1>
                <p className="text-base text-muted-foreground">Sign in or make your account in one step. 99ile stays free and works without it too.</p>
              </div>
              {SIGNIN_ENABLED
                ? <GoogleButton onClick={() => startSignIn(back)} />
                : <p className="rounded-lg bg-muted p-4 text-base">Sign in with Google is coming soon. You can already keep your devices in step with a code.</p>}
              <ul className="flex flex-col gap-3">
                {REASONS.map((r) => (
                  <li key={r} className="flex gap-3 text-base"><Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />{r}</li>
                ))}
              </ul>
              <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              <div className="flex flex-col gap-2">
                <LinkButton to="/link" variant="secondary" className="w-full">Use a code from another device</LinkButton>
                <LinkButton to={then} variant="ghost" className="w-full">Continue without signing in</LinkButton>
              </div>
              <p className="text-sm text-muted-foreground">For people 18 and over. What we keep is in the <Link to="/privacy" className="underline underline-offset-4">privacy notice</Link>.</p>
            </>
          )}
          {note && <p className="rounded-lg bg-muted p-3 text-base" role="status">{note}</p>}
        </div>
      </section>
    </div>
    </Page>
  );
}
