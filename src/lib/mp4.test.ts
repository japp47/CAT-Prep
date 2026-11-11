import { describe, expect, it } from "vitest";
import { writeMp4, type Mp4Sample } from "./mp4";

/** Reads boxes back: type, start and size, descending into the containers this writer makes. */
interface Box { type: string; start: number; size: number; kids: Box[] }
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "dinf"]);
function boxes(b: Uint8Array, start: number, end: number): Box[] {
  const dv = new DataView(b.buffer, b.byteOffset);
  const out: Box[] = [];
  for (let at = start; at < end;) {
    const size = dv.getUint32(at);
    const type = String.fromCharCode(...b.subarray(at + 4, at + 8));
    expect(size).toBeGreaterThanOrEqual(8);
    out.push({ type, start: at, size, kids: CONTAINERS.has(type) ? boxes(b, at + 8, at + size) : [] });
    at += size;
  }
  expect(out.reduce((n, x) => n + x.size, 0)).toBe(end - start);
  return out;
}
const find = (list: Box[], path: string[]): Box => {
  const [head, ...rest] = path;
  const hit = list.find((x) => x.type === head);
  if (!hit) throw new Error(`no ${head}`);
  return rest.length ? find(hit.kids, rest) : hit;
};
const u32At = (b: Uint8Array, at: number) => new DataView(b.buffer, b.byteOffset).getUint32(at);

function frames(n: number): Mp4Sample[] {
  return Array.from({ length: n }, (_, i) => ({ data: Uint8Array.from({ length: 10 + i }, (_, j) => (i * 7 + j) & 0xff), duration: 1000, key: i % 30 === 0 }));
}
const AVCC = Uint8Array.from([1, 0x42, 0xc0, 0x2a, 0xff, 0xe1, 0, 4, 0x67, 0x42, 0xc0, 0x2a, 1, 0, 2, 0x68, 0xce]);
const file = (samples: Mp4Sample[]) => {
  const parts = writeMp4({ width: 1080, height: 1920, timescale: 30000, avcC: AVCC, samples });
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

describe("writeMp4", () => {
  const samples = frames(75);
  const b = file(samples);
  const top = boxes(b, 0, b.length);

  it("puts ftyp, moov and mdat in that order and nothing else", () => {
    expect(top.map((x) => x.type)).toEqual(["ftyp", "moov", "mdat"]);
  });

  it("records the size and the length in the headers", () => {
    const tkhd = find(top, ["moov", "trak", "tkhd"]);
    // Width and height are the last eight bytes, in 16.16 fixed point.
    expect(u32At(b, tkhd.start + tkhd.size - 8) / 65536).toBe(1080);
    expect(u32At(b, tkhd.start + tkhd.size - 4) / 65536).toBe(1920);
    const mvhd = find(top, ["moov", "mvhd"]);
    expect(u32At(b, mvhd.start + 20)).toBe(1000); // movie timescale
    expect(u32At(b, mvhd.start + 24)).toBe(2500); // 75 frames at 30 a second: 2.5 s
    const mdhd = find(top, ["moov", "trak", "mdia", "mdhd"]);
    expect(u32At(b, mdhd.start + 20)).toBe(30000);
    expect(u32At(b, mdhd.start + 24)).toBe(75000);
  });

  it("lists every frame's size, one run of durations, and the key frames", () => {
    const stsz = find(top, ["moov", "trak", "mdia", "minf", "stbl", "stsz"]);
    expect(u32At(b, stsz.start + 16)).toBe(75);
    samples.forEach((s, i) => expect(u32At(b, stsz.start + 20 + i * 4)).toBe(s.data.length));
    const stts = find(top, ["moov", "trak", "mdia", "minf", "stbl", "stts"]);
    expect([u32At(b, stts.start + 12), u32At(b, stts.start + 16), u32At(b, stts.start + 20)]).toEqual([1, 75, 1000]);
    const stss = find(top, ["moov", "trak", "mdia", "minf", "stbl", "stss"]);
    expect(u32At(b, stss.start + 12)).toBe(3);
    expect([16, 20, 24].map((o) => u32At(b, stss.start + o))).toEqual([1, 31, 61]);
  });

  it("points the chunk offset at the first frame inside mdat", () => {
    const stco = find(top, ["moov", "trak", "mdia", "minf", "stbl", "stco"]);
    const offset = u32At(b, stco.start + 16);
    const mdat = find(top, ["mdat"]);
    expect(offset).toBe(mdat.start + 8);
    expect([...b.subarray(offset, offset + samples[0].data.length)]).toEqual([...samples[0].data]);
    // The frames follow one another to the end of the file.
    expect(mdat.start + mdat.size).toBe(b.length);
  });

  it("carries the decoder configuration in avc1's avcC", () => {
    const stsd = find(top, ["moov", "trak", "mdia", "minf", "stbl", "stsd"]);
    const at = b.indexOf(0x61, stsd.start); // search from stsd for the 'avcC' box
    const i = [...b.subarray(at, stsd.start + stsd.size)].findIndex((_, k) => String.fromCharCode(...b.subarray(at + k, at + k + 4)) === "avcC");
    expect([...b.subarray(at + i + 4, at + i + 4 + AVCC.length)]).toEqual([...AVCC]);
  });

  it("refuses an empty clip and one that does not start on a key frame", () => {
    expect(() => file([])).toThrow();
    expect(() => file(frames(3).map((s) => ({ ...s, key: false })))).toThrow();
  });

  it("stores runs of changing durations", () => {
    const mixed = frames(4).map((s, i) => ({ ...s, duration: i < 3 ? 1000 : 2000 }));
    const m = file(mixed);
    const stts = find(boxes(m, 0, m.length), ["moov", "trak", "mdia", "minf", "stbl", "stts"]);
    expect([12, 16, 20, 24, 28].map((o) => u32At(m, stts.start + o))).toEqual([2, 3, 1000, 1, 2000]);
  });
});
