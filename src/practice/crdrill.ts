import { shuffle } from "./random";
import { CR_TYPES, type CrItem, type CrType } from "./types";

/** A drill's items in shuffled order, with the ones the student has not seen before first. */
const unseenFirst = (items: CrItem[], seed: string, seen: Set<string>) =>
  shuffle(items, seed).sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));

/**
 * The questions for a critical reasoning drill. One type gives that type only.
 * A mixed drill takes one question from each type in turn, so six questions cover all six types.
 */
export function customCr(items: CrItem[], type: CrType | "mix", n: number, seed: string, seen: Set<string>): CrItem[] {
  if (type !== "mix") return unseenFirst(items.filter((c) => c.type === type), seed, seen).slice(0, n);
  const lists = shuffle(CR_TYPES, seed).map((t) => unseenFirst(items.filter((c) => c.type === t), seed + t, seen));
  const out: CrItem[] = [];
  for (let round = 0; out.length < n && lists.some((l) => l[round]); round++) {
    for (const l of lists) if (l[round] && out.length < n) out.push(l[round]);
  }
  return out;
}
