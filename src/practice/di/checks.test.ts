import { describe, expect, it } from "vitest";
import { LR_SETS } from "../lr";
import { isDi, type LrSet } from "../types";
import { CHECKS, fills } from "./checks";

const DI = LR_SETS.filter((s) => isDi(s.type));

/** A TITA answer's stated precision: decimals in the key. */
const decimals = (x: string) => (x.includes(".") ? x.split(".")[1].length : 0);

describe("DI sets (F90): every answer recomputed from the set's own numbers", () => {
  it("has a check for every DI set, and DI sets only of DI types", () => {
    expect(DI.length).toBeGreaterThanOrEqual(2);
    DI.forEach((s) => expect(CHECKS[s.id], s.id).toBeDefined());
    LR_SETS.filter((s) => !isDi(s.type)).forEach((s) => expect(s.data, s.id).toBeUndefined());
  });
  for (const s of DI) {
    it(`${s.id}: its data is well formed and every chart draws a table it has`, () => {
      expect(s.data?.length, s.id).toBeGreaterThan(0);
      s.data!.forEach((d) => d.rows.forEach((r) => expect(r.cells, `${d.id} ${r.name}`).toHaveLength(d.cols.length)));
      expect(s.charts?.length, s.id).toBeGreaterThan(0);
      s.charts!.forEach((c) => expect(s.data!.some((d) => d.id === c.data), c.data).toBe(true));
      // Every table is drawn, so nothing the questions need is hidden.
      s.data!.forEach((d) => expect(s.charts!.some((c) => c.data === d.id), d.id).toBe(true));
    });
    it(`${s.id}: the key matches the computed answers`, () => {
      const c = CHECKS[s.id](s);
      expect(c.answers, s.id).toHaveLength(s.questions.length);
      s.questions.forEach((q, i) => {
        const at = `${s.id} Q${i + 1}`, got = c.answers[i];
        if (q.kind === "mcq") {
          expect(q.options![q.answer as number], at).toBe(String(got));
        } else if (q.tol !== undefined) {
          // Typed to a stated precision: the key is the computed value rounded to it, and tol is half a unit of it. The
          // exact value stays at least 0.02 of a unit away from a rounding edge, so careful rounding cannot change it.
          const n = decimals(String(q.answer)), unit = 10 ** -n;
          expect(Number(got).toFixed(n), at).toBe(String(q.answer));
          expect(q.tol, at).toBeCloseTo(0.5 * unit, 9);
          expect(Math.abs(((Number(got) / unit) % 1) - 0.5), at).toBeGreaterThan(0.02);
          expect(q.stem, at).toMatch(n ? /decimal place/ : /nearest integer/);
        } else {
          expect(String(got), at).toBe(String(q.answer));
        }
      });
      c.extra?.();
    });
    const table = CHECKS[s.id](s).table;
    if (table) it(`${s.id}: the blanks fill exactly one way, as in the solution, and no fact is spare`, () => {
      const all = fills(table.data, table.domain, table.facts, 3);
      expect(all, "fills").toHaveLength(1);
      const want = s.solution.fills?.find((f) => f.data === table.data.id);
      expect(want, "solution.fills").toBeDefined();
      const blanks = table.data.rows.flatMap((r) => r.cells.filter((v) => v === null)).length;
      expect(want!.cells, "every blank in the solution").toHaveLength(blanks);
      want!.cells.forEach(([r, c, v]) => expect(all[0].get(`${r}|${c}`), `${r} ${c}`).toBe(v));
      table.facts.forEach((f, i) => {
        if (f.domain) return;
        const rest = table.facts.filter((_, j) => j !== i);
        expect(fills(table.data, table.domain, rest, 3).length, `fact ${i + 1} is needed`).toBeGreaterThan(1);
      });
      expect(table.facts, "one fact per clue").toHaveLength((s as LrSet).clues.length);
    });
  }
});
