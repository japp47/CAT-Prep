import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseLink } from "@/lib/sync/codes";

type Detect = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>;

/** BarcodeDetector where the browser has it (Chrome on Android), else jsqr, loaded only now. */
async function detector(): Promise<Detect> {
  const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (BD) {
    try {
      const d = new BD({ formats: ["qr_code"] });
      return async (video) => (await d.detect(video))[0]?.rawValue ?? null;
    } catch { /* fall through to jsqr */ }
  }
  const jsQR = (await import("jsqr")).default;
  return async (video, canvas) => {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
  };
}

/**
 * Scans the other device's QR with the rear camera, inside 99ile (docs/research/step-3.md, findings 11 to 15). Only
 * our own link is accepted; any other QR is ignored. The camera stops as soon as a code is read or the scan closes.
 */
export default function LinkScan({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [note, setNote] = useState("Point the camera at the code on your other device.");

  useEffect(() => {
    let stream: MediaStream | null = null, stop = false, timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setNote("The camera is not available or not allowed. Type the code instead.");
        return;
      }
      if (stop || !video.current) return;
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      const detect = await detector();
      const tick = async () => {
        if (stop || !video.current || !canvas.current) return;
        const text = await detect(video.current, canvas.current).catch(() => null);
        const code = text ? parseLink(text, location.origin, import.meta.env.BASE_URL) : null;
        if (code) { stop = true; onCode(code); return; }
        if (text) setNote("That QR is not a 99ile link code. Scan the code shown in 99ile on your other device.");
        timer = setTimeout(tick, 250);
      };
      void tick();
    })();
    return () => { stop = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);

  return (
    <div className="flex flex-col gap-3">
      <video ref={video} playsInline muted className="aspect-square w-full max-w-xs rounded-md bg-black object-cover" />
      <canvas ref={canvas} hidden />
      <p className="text-base" role="status">{note}</p>
      <div><Button variant="ghost" onClick={onClose}>Type the code instead</Button></div>
    </div>
  );
}
