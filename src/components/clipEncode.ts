import { writeMp4, type Mp4Sample } from "../lib/mp4";
import { W, H } from "./clipDraw";

/**
 * Turns drawn frames into a video file for Replay clips (F101, D94). First choice: WebCodecs H.264 into our MP4
 * writer, frame by frame and faster than real time. Where the browser cannot encode H.264 that way: record the
 * canvas in real time with MediaRecorder, as MP4 where offered, else WebM. Neither: the panel offers only a picture.
 */

export type VideoKind = "mp4" | "webm";
export interface Made { blob: Blob; kind: VideoKind }
export type Way = { by: "codecs"; codec: string } | { by: "recorder"; mime: string; kind: VideoKind } | { by: "none" };

/** Baseline, Main and High profiles at level 4.2: 1080 × 1920 at 30 a second fits, and none reorders frames in practice. */
const CODECS = ["avc1.42002a", "avc1.4d002a", "avc1.64002a"];
const BITRATE = 6_000_000;
const config = (codec: string, fps: number): VideoEncoderConfig => ({ codec, width: W, height: H, bitrate: BITRATE, framerate: fps, avc: { format: "avc" } });

export async function bestWay(fps: number): Promise<Way> {
  if (typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined") {
    for (const codec of CODECS) {
      try { if ((await VideoEncoder.isConfigSupported(config(codec, fps))).supported) return { by: "codecs", codec }; } catch { /* try the next */ }
    }
  }
  if (typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function") {
    for (const mime of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"]) {
      if (MediaRecorder.isTypeSupported(mime)) return { by: "recorder", mime, kind: mime.startsWith("video/mp4") ? "mp4" : "webm" };
    }
  }
  return { by: "none" };
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bytesOf = (d: AllowSharedBufferSource): Uint8Array => (d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array((d as ArrayBufferView).buffer, (d as ArrayBufferView).byteOffset, (d as ArrayBufferView).byteLength).slice());

export interface MakeArgs { canvas: HTMLCanvasElement; paint: (t: number) => void; frames: number; fps: number; onProgress: (done: number) => void; signal: AbortSignal }

export async function makeVideo(way: Way, a: MakeArgs): Promise<Made> {
  if (way.by === "codecs") return encode(way.codec, a);
  if (way.by === "recorder") return record(way.mime, way.kind, a);
  throw new Error("This browser cannot make a video.");
}

async function encode(codec: string, { canvas, paint, frames, fps, onProgress, signal }: MakeArgs): Promise<Made> {
  const samples: Mp4Sample[] = [];
  let avcC: Uint8Array | null = null;
  let failed: unknown = null;
  const tick = 1000; // units of the track's timescale (fps × 1000) per frame
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      const d = meta?.decoderConfig?.description;
      if (d && !avcC) avcC = bytesOf(d);
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      samples.push({ data, duration: tick, key: chunk.type === "key" });
    },
    error: (e) => { failed = e; },
  });
  try {
    encoder.configure(config(codec, fps));
    for (let i = 0; i < frames; i++) {
      if (signal.aborted) throw new DOMException("Stopped", "AbortError");
      if (failed) throw failed;
      paint(i / fps);
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      // A key frame every two seconds, so a player can jump about.
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 6) await pause(2);
      if (i % 6 === 0) { onProgress(i / frames); await pause(0); }
    }
    await encoder.flush();
    if (failed) throw failed;
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }
  if (!avcC) throw new Error("The encoder gave no decoder configuration.");
  onProgress(1);
  return { blob: new Blob(writeMp4({ width: W, height: H, timescale: fps * tick, avcC, samples }) as BlobPart[], { type: "video/mp4" }), kind: "mp4" };
}

/** Real time: the clip takes as long to make as to watch, and the tab must stay open. */
async function record(mime: string, kind: VideoKind, { canvas, paint, frames, fps, onProgress, signal }: MakeArgs): Promise<Made> {
  const secs = frames / fps;
  paint(0);
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: BITRATE });
  const parts: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
  const stopped = new Promise<void>((r) => { rec.onstop = () => r(); });
  rec.start(500);
  const t0 = performance.now();
  try {
    for (;;) {
      if (signal.aborted) throw new DOMException("Stopped", "AbortError");
      const t = (performance.now() - t0) / 1000;
      if (t >= secs) break;
      paint(t);
      onProgress(t / secs);
      await pause(1000 / fps);
    }
  } finally {
    rec.stop();
    stream.getTracks().forEach((tr) => tr.stop());
    await stopped;
  }
  onProgress(1);
  return { blob: new Blob(parts, { type: kind === "mp4" ? "video/mp4" : "video/webm" }), kind };
}
