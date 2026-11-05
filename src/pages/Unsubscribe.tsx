import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Page, PageHeader, TextLink } from "../components/kit";
import { api } from "../lib/api";

/**
 * Where "Stop these emails" in a reminder leads (docs/design/notifications.md §8). It asks first, because mail
 * scanners open every link in an email; the signed link says who and which emails, so no sign-in is needed.
 */
export default function Unsubscribe() {
  const [search] = useSearchParams();
  const token = search.get("t") ?? "";
  const [state, setState] = useState<{ phase: "ask" | "working" | "done" | "error"; scope?: string; text?: string }>({ phase: token ? "ask" : "error", text: "This link is missing its code." });
  const stop = async () => {
    setState({ phase: "working" });
    const r = await api<{ done: boolean; scope: string }>("/unsubscribe?t=" + encodeURIComponent(token), {}, { method: "POST" });
    setState(r.ok ? { phase: "done", scope: r.data.scope } : { phase: "error", text: r.message });
  };
  return (
    <Page width="read">
      <PageHeader title={state.phase === "done" ? "Emails stopped" : "Stop reminder emails?"}>
        {state.phase === "done"
          ? state.scope === "weekly" ? "You won't get the Sunday review by email any more." : "You won't get reminder emails any more. Notifications on your devices, if you turned them on, stay as they were."
          : "We'll stop the emails this link came in. Your progress and everything else stay as they are."}
      </PageHeader>
      {state.phase !== "done" && state.phase !== "error" && (
        <div className="flex flex-wrap items-center gap-4">
          <Button disabled={state.phase === "working"} onClick={() => void stop()}>Stop these emails</Button>
          <TextLink to="/settings#reminders">Change reminders instead</TextLink>
        </div>
      )}
      {state.phase === "done" && <p className="text-base">Changed your mind? Turn them on again in <TextLink to="/settings#reminders">Settings</TextLink>.</p>}
      {state.phase === "error" && <p role="alert" className="rounded-lg bg-danger-soft px-5 py-4 text-base">{state.text}{!state.text?.includes("Settings") && <> You can also stop emails in <TextLink to="/settings#reminders">Settings</TextLink>.</>}</p>}
    </Page>
  );
}
