import { lazy, Suspense, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { Page, PageHeader, Section } from "@/components/kit";
import { iosSafariTab } from "@/lib/keep";
import { formatCode, LINK_LEN, normalizeCode } from "@/lib/sync/codes";
import { getStatus, subscribe } from "@/lib/sync/runner";

const JoinForm = lazy(() => import("@/components/sync/JoinForm"));

/**
 * Where a scanned QR lands with the phone's own camera app: /link#ABCDEFGH. The code is in the fragment, so it never
 * reaches a server log. In Safari on iPhone a tab and the Home Screen app keep separate progress, so the page says
 * to scan from inside the app if that is where the student studies.
 */
export default function Link() {
  const navigate = useNavigate();
  const code = normalizeCode(decodeURIComponent(location.hash.slice(1)), LINK_LEN);
  const s = useSyncExternalStore(subscribe, getStatus);
  return (
    <Page width="read">
      <PageHeader title="Link this device">Join the progress of your other device. Nothing on either device is overwritten.</PageHeader>
      {iosSafariTab() && (
        <p className="rounded-lg bg-warning-soft px-5 py-4 text-base">If you study in 99ile from your Home Screen, open it there instead and scan the code from Settings: Safari and the Home Screen app keep separate progress.</p>
      )}
      {s.phase !== "off" && <p className="rounded-lg bg-muted px-5 py-4 text-base">This device already syncs. Linking moves it to the other device's progress.</p>}
      <Section>
        <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">
          <Suspense fallback={null}>
            <JoinForm initial={code ? formatCode(code) : ""} submitVariant="default" onDone={() => navigate("/settings", { replace: true })} />
          </Suspense>
        </div>
      </Section>
    </Page>
  );
}
