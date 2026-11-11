/**
 * A small MP4 writer for one H.264 video track with no sound (Replay clips, F101, D94). The browser's VideoEncoder
 * gives encoded frames in AVCC form and a decoder configuration (`avcC`); this wraps them in the boxes a player
 * needs: ftyp, then moov (put first so the clip can play before it has fully loaded), then mdat with every frame
 * in one chunk. Frames are in decode order with no reordering (Baseline H.264, or an encoder that keeps order), so
 * no composition offsets are written.
 */

export interface Mp4Sample {
  /** One encoded frame, as the encoder gives it (length-prefixed NAL units). */
  data: Uint8Array;
  /** How long the frame shows, in `timescale` units. */
  duration: number;
  /** A key frame (sync sample): a player can start here. */
  key: boolean;
}

export interface Mp4Track {
  width: number;
  height: number;
  /** Units per second for `Mp4Sample.duration`. */
  timescale: number;
  /** The decoder configuration record (`VideoDecoderConfig.description` from the encoder). */
  avcC: Uint8Array;
  samples: Mp4Sample[];
}

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

/** Big-endian unsigned integers of 1, 2, 3 and 4 bytes. */
function uint(n: number, bytes: 1 | 2 | 3 | 4): Uint8Array {
  const out = new Uint8Array(bytes);
  for (let i = bytes - 1; i >= 0; i--) { out[i] = n & 0xff; n = Math.floor(n / 256); }
  return out;
}
const u8 = (n: number) => uint(n, 1), u16 = (n: number) => uint(n, 2), u24 = (n: number) => uint(n, 3), u32 = (n: number) => uint(n, 4);
const zeros = (n: number) => new Uint8Array(n);

function join(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function box(type: string, ...parts: Uint8Array[]): Uint8Array {
  const body = join(parts);
  return join([u32(8 + body.length), ascii(type), body]);
}
/** A "full box": a box whose body starts with a version byte and three bytes of flags. */
const fullBox = (type: string, version: number, flags: number, ...parts: Uint8Array[]) => box(type, u8(version), u24(flags), ...parts);

/** The identity transform, in 16.16 and 2.30 fixed point, as every track and movie header carries it. */
const MATRIX = join([0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].map(u32));

/** Runs of equal durations, as `stts` stores them. */
function runs(samples: Mp4Sample[]): [count: number, delta: number][] {
  const out: [number, number][] = [];
  for (const s of samples) {
    const last = out[out.length - 1];
    if (last && last[1] === s.duration) last[0]++;
    else out.push([1, s.duration]);
  }
  return out;
}

function moov(t: Mp4Track, dataOffset: number): Uint8Array {
  const units = t.samples.reduce((n, s) => n + s.duration, 0);
  const ms = Math.round((units / t.timescale) * 1000);
  const mvhd = fullBox("mvhd", 0, 0,
    u32(0), u32(0), u32(1000), u32(ms), u32(0x00010000), u16(0x0100), zeros(10), MATRIX, zeros(24), u32(2));
  const tkhd = fullBox("tkhd", 0, 3,
    u32(0), u32(0), u32(1), zeros(4), u32(ms), zeros(8), u16(0), u16(0), u16(0), zeros(2), MATRIX,
    u32(t.width * 65536), u32(t.height * 65536));
  // Language "und", packed as three five-bit letters.
  const mdhd = fullBox("mdhd", 0, 0, u32(0), u32(0), u32(t.timescale), u32(units), u16(0x55c4), u16(0));
  const hdlr = fullBox("hdlr", 0, 0, u32(0), ascii("vide"), zeros(12), ascii("VideoHandler\0"));
  const avc1 = box("avc1",
    zeros(6), u16(1), // reserved, data reference index
    zeros(16), // pre-defined and reserved
    u16(t.width), u16(t.height),
    u32(0x00480000), u32(0x00480000), // 72 dpi
    zeros(4), u16(1), // reserved, frames per sample
    zeros(32), // compressor name
    u16(0x0018), u16(0xffff), // depth 24, pre-defined -1
    box("avcC", t.avcC));
  const keys = t.samples.flatMap((s, i) => (s.key ? [i + 1] : []));
  const stts = runs(t.samples);
  const stbl = box("stbl",
    fullBox("stsd", 0, 0, u32(1), avc1),
    fullBox("stts", 0, 0, u32(stts.length), ...stts.flatMap(([n, d]) => [u32(n), u32(d)])),
    fullBox("stss", 0, 0, u32(keys.length), ...keys.map(u32)),
    fullBox("stsc", 0, 0, u32(1), u32(1), u32(t.samples.length), u32(1)),
    fullBox("stsz", 0, 0, u32(0), u32(t.samples.length), ...t.samples.map((s) => u32(s.data.length))),
    fullBox("stco", 0, 0, u32(1), u32(dataOffset)));
  const minf = box("minf",
    fullBox("vmhd", 0, 1, zeros(8)),
    box("dinf", fullBox("dref", 0, 0, u32(1), fullBox("url ", 0, 1))),
    stbl);
  return box("moov", mvhd, box("trak", tkhd, box("mdia", mdhd, hdlr, minf)));
}

/** The file's parts in order (header boxes, then each frame), ready for `new Blob(parts)` without one more copy. */
export function writeMp4(t: Mp4Track): Uint8Array[] {
  if (!t.samples.length) throw new Error("An MP4 needs at least one frame.");
  if (!t.samples[0].key) throw new Error("The first frame must be a key frame.");
  const ftyp = box("ftyp", ascii("isom"), u32(0x200), ascii("isom"), ascii("iso2"), ascii("avc1"), ascii("mp41"));
  const bytes = t.samples.reduce((n, s) => n + s.data.length, 0);
  if (bytes + 1e6 > 0xffffffff) throw new Error("The clip is too large for a 32-bit MP4.");
  // moov's size does not depend on the offset it records, so it is built once to measure and once to keep.
  const offset = ftyp.length + moov(t, 0).length + 8;
  return [ftyp, moov(t, offset), join([u32(8 + bytes), ascii("mdat")]), ...t.samples.map((s) => s.data)];
}
