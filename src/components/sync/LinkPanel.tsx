import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { linkUrl } from "@/lib/sync/codes";
import { makeLinkCode } from "@/lib/sync/runner";

const LinkQR = lazy(() => import("./LinkQR"));

/** "Link a device": a code for another device, as a QR and as text, for 10 minutes. */
export default function LinkPanel({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [now, setNow] = useState(Date.now());

  const fresh = useCallback(async () => {
    setError("");
    setCopyStatus("");
    setCode(null);
    const res = await makeLinkCode();
    if ("data" in res && res.ok) setCode({ code: res.data.code, expiresAt: Date.parse(res.data.expiresAt) });
    else setError(res.ok ? "" : res.message);
  }, []);
  const asked = useRef(false); // one code per opening, also when React runs effects twice in development
  useEffect(() => { if (!asked.current) { asked.current = true; void fresh(); } }, [fresh]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const left = code ? Math.max(0, Math.round((code.expiresAt - now) / 1000)) : 0;
  const expired = !!code && left === 0;
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopyStatus("Code copied.");
    } catch {
      setCopyStatus("Could not copy. Select the code and copy it manually.");
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-xl bg-muted p-4 sm:grid-cols-2 sm:items-center sm:gap-6 sm:p-6">
        <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-lg bg-card p-4">
          {code && !expired ? (
            <Suspense fallback={<div className="size-48 animate-pulse rounded-md bg-muted sm:size-56" aria-label="Loading QR code" />}>
              <LinkQR url={linkUrl(location.origin, import.meta.env.BASE_URL, code.code.replace("-", ""))} label={"QR code for link code " + code.code} />
            </Suspense>
          ) : (
            <div className="flex min-h-48 items-center justify-center text-center text-base text-muted-foreground sm:min-h-56">
              {expired ? "This code has expired." : error ? "QR code unavailable." : "Getting a secure link code…"}
            </div>
          )}
          {code && !expired && <p className="text-sm text-muted-foreground" role="timer">Expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} · works once</p>}
        </div>

        <div className="flex min-w-0 flex-col items-start gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-heading font-semibold">Scan with your other device</h3>
            <p className="text-base text-muted-foreground">On that device, open Settings → Sync between devices → “I use 99ile on another device”, then scan this QR code.</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <p className="text-base font-medium">Or type this code</p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="select-all text-2xl font-semibold tracking-wider tabular-nums" aria-label={code ? "Link code " + code.code.split("").join(" ") : undefined}>
                {code && !expired ? code.code : "—"}
              </p>
              {code && !expired && <Button variant="outline" size="sm" className="cursor-pointer" onClick={copy}>Copy code</Button>}
            </div>
            {copyStatus && <p className="text-sm text-muted-foreground" role="status">{copyStatus}</p>}
          </div>
          {error && <p className="text-base text-danger" role="alert">{error}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {(expired || error) && <Button variant="secondary" className="cursor-pointer" onClick={fresh}>New code</Button>}
        <Button variant="ghost" className="cursor-pointer" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
