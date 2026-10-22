import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { linkUrl } from "@/lib/sync/codes";
import { makeLinkCode } from "@/lib/sync/runner";

const LinkQR = lazy(() => import("./LinkQR"));

/** "Link a device": a code for another device, as a QR and as text, for 10 minutes. */
export default function LinkPanel({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const fresh = useCallback(async () => {
    setError("");
    const res = await makeLinkCode();
    if ("data" in res && res.ok) setCode({ code: res.data.code, expiresAt: Date.parse(res.data.expiresAt) });
    else setError(res.ok ? "" : res.message);
  }, []);
  const asked = useRef(false); // one code per opening, also when React runs effects twice in development
  useEffect(() => { if (!asked.current) { asked.current = true; void fresh(); } }, [fresh]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const left = code ? Math.max(0, Math.round((code.expiresAt - now) / 1000)) : 0;
  const expired = !!code && left === 0;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base">On the other device, open 99ile, then Settings, Sync between devices, and tap “I use 99ile on another device”. Scan this code, or type it.</p>
      {error && <p className="text-base text-danger" role="alert">{error}</p>}
      {code && !expired && (
        <div className="flex flex-col items-start gap-3">
          <Suspense fallback={<div className="size-52 rounded-md bg-muted" />}>
            <LinkQR url={linkUrl(location.origin, import.meta.env.BASE_URL, code.code.replace("-", ""))} label={"QR code for link code " + code.code} />
          </Suspense>
          <p className="select-all text-2xl font-semibold tracking-wider tabular-nums">{code.code}</p>
          <p className="text-base text-muted-foreground" role="timer">Works for {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} more, once.</p>
        </div>
      )}
      {expired && <p className="text-base">This code has expired.</p>}
      <div className="flex flex-wrap gap-3">
        {(expired || error) && <Button variant="secondary" onClick={fresh}>New code</Button>}
        <Button variant="ghost" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
