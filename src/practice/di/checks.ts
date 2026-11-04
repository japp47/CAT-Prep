import { allCases, type CRule, type Csp } from "../solver";
import type { DiData, LrSet } from "../types";

/**
 * Every DI set's answers, recomputed from its own numbers (F90, D71). One plain function per set: it reads the set's
 * `data` and returns, per question, the computed answer (an option's text for an MCQ, a number for a TITA). A table
 * with blanks is also solved: its blanks, the row and column totals and the set's facts go to the general solver
 * (D64), which must find exactly one fill, and none of the facts may be spare. practice/di/checks.test.ts runs them.
 */

/** A table's value by row and column name; a blank is NaN until filled. */
export function cellOf(d: DiData, row: string, col: string): number {
  const r = d.rows.find((x) => x.name === row), j = d.cols.indexOf(col);
  if (!r || j < 0) throw new Error(`No cell ${row}, ${col} in ${d.id}`);
  return r.cells[j] ?? NaN;
}
export const dataOf = (s: LrSet, id: string): DiData => {
  const d = s.data?.find((x) => x.id === id);
  if (!d) throw new Error(`No data ${id} in ${s.id}`);
  return d;
};

/** A table with blanks: the facts a fill must meet, each reading the filled table through `v(row, col)`. */
export interface Fact { test: (v: (row: string, col: string) => number) => boolean; /** The fact that sets the values a blank may take: the domain, so it cannot be dropped to test it. */ domain?: true }

/**
 * Every way to fill a table's blanks from `domain` that keeps its "Total" row and column right and meets `facts`
 * (up to `cap`). Totals prune the search as soon as a row or column is complete; facts are tested on a full table.
 */
export function fills(d: DiData, domain: number[], facts: Fact[], cap = 100): Map<string, number>[] {
  const key = (r: string, c: string) => `${r}|${c}`;
  const body = d.rows.filter((r) => !/^total$/i.test(r.name)), cols = d.cols.filter((c) => !/^total$/i.test(c));
  const blanks = body.flatMap((r) => cols.filter((c) => r.cells[d.cols.indexOf(c)] === null).map((c) => key(r.name, c)));
  const value = (g: (n: string) => number | string, r: string, c: string) => { const x = cellOf(d, r, c); return Number.isNaN(x) ? (g(key(r, c)) as number) : x; };
  const rules: CRule[] = [];
  const totalCol = d.cols.find((c) => /^total$/i.test(c)), totalRow = d.rows.find((r) => /^total$/i.test(r.name));
  if (totalCol) body.forEach((r) => {
    const deps = cols.map((c) => key(r.name, c)).filter((k) => blanks.includes(k));
    if (deps.length) rules.push({ deps, test: (g) => cols.reduce((s, c) => s + value(g, r.name, c), 0) === cellOf(d, r.name, totalCol) });
  });
  if (totalRow) cols.forEach((c) => {
    const deps = body.map((r) => key(r.name, c)).filter((k) => blanks.includes(k));
    if (deps.length) rules.push({ deps, test: (g) => body.reduce((s, r) => s + value(g, r.name, c), 0) === cellOf(d, totalRow.name, c) });
  });
  facts.forEach((f) => rules.push({ deps: blanks, test: (g) => f.test((r, c) => value(g, r, c)) }));
  const csp: Csp = { vars: blanks.map((name) => ({ name, domain })), distinct: [], rules };
  return allCases(csp, cap) as Map<string, number>[];
}

export interface Checked {
  /** Per question: an MCQ's right option text, or a TITA's number. */
  answers: (string | number)[];
  /** A table with blanks: its facts in clue order, the values a blank may take, and the table. */
  table?: { data: DiData; domain: number[]; facts: Fact[] };
  /** Extra claims a question makes, checked by code (a "could not" question's possible values, say). */
  extra?: () => void;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (a: number, b: number) => (a / b) * 100;

export const CHECKS: Record<string, (s: LrSet) => Checked> = {
  "di-port-cargo": (s) => {
    const cargo = dataOf(s, "cargo"), share = dataOf(s, "share");
    const ports = cargo.rows.map((r) => r.name);
    const tot = (p: string, y: string) => cellOf(cargo, p, y), cont = (p: string, y: string) => (tot(p, y) * cellOf(share, p, y)) / 100;
    const all = (f: (p: string) => number) => sum(ports.map(f));
    const T0 = all((p) => tot(p, "2023")), T1 = all((p) => tot(p, "2024")), C0 = all((p) => cont(p, "2023")), C1 = all((p) => cont(p, "2024"));
    // Q1: the largest rise in containerised tonnes.
    const rise = ports.map((p) => cont(p, "2024") - cont(p, "2023"));
    const q1 = ports[rise.indexOf(Math.max(...rise))];
    // Q2: growth of bulk cargo over all ports, approximately.
    const q2 = (pct(T1 - C1, T0 - C0) - 100).toFixed(1) + "%";
    // Q3: ports whose containerised cargo grew at a higher rate than their total.
    const q3 = String(ports.filter((p) => cont(p, "2024") / cont(p, "2023") > tot(p, "2024") / tot(p, "2023")).length);
    // Q4: with P and T unchanged and Q and S adding their most (10% of their cargo), the least share R can have.
    const gap = T1 / 2 - C1;
    const fromR = gap - (tot("Q", "2024") + tot("S", "2024")) / 10;
    if (fromR < 0 || fromR > tot("R", "2024") / 10) throw new Error("R's least share needs R to add something within its limit");
    const q4 = pct(cont("R", "2024") + fromR, tot("R", "2024"));
    // Q5: the fewest ports that, each adding at most 10% of its cargo, cover the gap to half of all cargo.
    const caps = ports.map((p) => tot(p, "2024") / 10).sort((a, b) => b - a);
    let q5 = 0;
    for (let acc = 0; acc < gap; q5++) acc += caps[q5];
    return { answers: [q1, q2, q3, q4, q5] };
  },

  "di-batch-enrolments": (s) => {
    const d = dataOf(s, "enrol");
    const months = ["Jan", "Feb", "Mar", "Apr"], batches = ["A", "B", "C", "D", "E"];
    const domain = Array.from({ length: 11 }, (_, k) => 10 + 5 * k);
    const facts: Fact[] = [
      // 1: the domain (every entry a multiple of 5 from 10 to 60), and the given entries keep to it too.
      { domain: true, test: (v) => batches.every((b) => months.every((m) => v(b, m) % 5 === 0 && v(b, m) >= 10 && v(b, m) <= 60)) },
      // 2: no two batches tie in a month.
      { test: (v) => months.every((m) => new Set(batches.map((b) => v(b, m))).size === batches.length) },
      // 3: C rises every month.
      { test: (v) => months.every((m, i) => i === 0 || v("C", m) > v("C", months[i - 1])) },
      // 4: B second-highest in April. Read here as "exactly one entry is higher", which allows a tie with B; fact 2
      // rules ties out. Read strictly (no tie), fact 4 alone gives the same single fill, so fact 2 then matters only
      // in Q5. Every answer is the same under both readings (checked 1 Nov 2026, with four independent solvers).
      { test: (v) => { const xs = batches.map((b) => v(b, "Apr")).sort((a, b) => b - a); return v("B", "Apr") === xs[1]; } },
    ];
    const [f] = fills(d, domain, facts, 2);
    const v = (b: string, m: string) => { const x = cellOf(d, b, m); return Number.isNaN(x) ? f.get(`${b}|${m}`)! : x; };
    const q1 = v("D", "Jan");
    const q2 = String(months.filter((m) => v("E", m) > v("A", m)).length);
    const q3 = pct(v("B", "Apr") + v("D", "Apr"), cellOf(d, "Total", "Apr"));
    const shares = batches.map((b) => Math.max(...months.map((m) => v(b, m))) / cellOf(d, b, "Total"));
    const q4 = (Math.max(...shares) * 100).toFixed(1) + "%";
    // Q5: without fact 4, the values B's February can take; the right option is the one it cannot.
    const without4 = fills(d, domain, facts.slice(0, 3), 100);
    const can = new Set(without4.map((c) => c.get("B|Feb")));
    const options = s.questions[4].options!;
    const cannot = options.filter((o) => !can.has(Number(o)));
    return {
      answers: [q1, q2, q3, q4, cannot.length === 1 ? cannot[0] : `${cannot.length} options cannot`],
      table: { data: d, domain, facts },
    };
  },

  "di-six-economies": (s) => {
    const e = dataOf(s, "econ");
    const names = e.rows.map((r) => r.name);
    const head = (c: string) => cellOf(e, c, "GDP per head"), rate = (c: string) => 1 + cellOf(e, c, "Growth") / 100;
    const gdp = (c: string) => head(c) * cellOf(e, c, "Population");
    // Q1: the countries under US$ 5,000 together, against China.
    const q1 = pct(sum(names.filter((c) => head(c) < 5000).map(gdp)), gdp("China"));
    // Q2: faster than every richer country (the richest is not counted).
    const q2 = String(names.filter((c) => { const richer = names.filter((r) => head(r) > head(c)); return richer.length > 0 && richer.every((r) => rate(c) > rate(r)); }).length);
    // Q3 and Q5: whole years of compounding until the mark is reached, as the end of 2023 + n.
    const yearsTo = (start: number, grow: number, mark: number) => { let n = 0; for (let x = start; x < mark; n++) x *= grow; return n; };
    const q3 = String(2023 + yearsTo(gdp("India") / gdp("China"), rate("India") / rate("China"), 1 / 3));
    const q4 = pct(gdp("Bangladesh") * rate("Bangladesh") ** 5, gdp("Vietnam") * rate("Vietnam") ** 5) - 100;
    const q5 = String(2023 + Math.max(...["India", "Indonesia", "Vietnam", "Bangladesh"].map((c) => yearsTo(head(c), rate(c), 6000))));
    return { answers: [q1, q2, q3, q4, q5] };
  },

  "di-india-trade-partners": (s) => {
    const ex = dataOf(s, "exports"), ra = dataOf(s, "ratio"), ps = ex.rows.map((r) => r.name), [y0, y1] = ex.cols;
    const exp = (p: string, y: string) => cellOf(ex, p, y), imp = (p: string, y: string) => (exp(p, y) * cellOf(ra, p, y)) / 100;
    const deficit = (p: string, y: string) => imp(p, y) - exp(p, y);
    const q1 = sum(ps.filter((p) => deficit(p, y1) > 0).map((p) => deficit(p, y1)));
    const four = ["China", "UAE", "Saudi Arabia", "Singapore"], growth = four.map((p) => deficit(p, y1) / deficit(p, y0));
    const q2 = four[growth.indexOf(Math.max(...growth))];
    const net = (y: string) => sum(ps.map((p) => deficit(p, y)));
    if (net(y0) <= 0 || net(y1) <= 0) throw new Error("the stem says the net balance was negative in both years");
    const q3 = Math.round(pct(net(y1), net(y0)) - 100) + "%";
    const q4 = String(ps.filter((p) => imp(p, y1) > imp(p, y0) && cellOf(ra, p, y1) < cellOf(ra, p, y0)).length);
    const newExports = imp("China", y1) - 0.6 * deficit("China", y1);
    const q5 = Math.round(pct(newExports, exp("China", y1)) - 100) + "%";
    return { answers: [q1, q2, q3, q4, q5] };
  },

  "di-monsoon-2025": (s) => {
    const d = dataOf(s, "rain"), N = "Normal (mm)", A = "Actual (mm)", D = "Departure (%)";
    // A shown departure k stands for [k − 0.5, k + 0.5) when positive and (k − 0.5, k + 0.5] when negative: halves
    // round away from zero (clue 1). The question's bounds are taken at their ends, reached or not (clue 3).
    const band = (k: number) => [k - 0.5, k + 0.5];
    const shown = (x: number) => Math.sign(x) * Math.round(Math.abs(x) + 1e-12);
    const [nwLo] = band(cellOf(d, "North West India", D)), [enLo, enHi] = band(cellOf(d, "East & North East India", D));
    const nwMin = cellOf(d, "North West India", N) * (1 + nwLo / 100);
    const enN = cellOf(d, "East & North East India", N), enMin = enN * (1 + enLo / 100), enMax = enN * (1 + enHi / 100);
    const sp = "South Peninsula", spA = cellOf(d, sp, A), [spLo] = band(cellOf(d, sp, D));
    const central = pct(cellOf(d, "Central India", A) - cellOf(d, "Central India", N), cellOf(d, "Central India", N));
    const q2 = s.questions[1].options!.filter((o) => shown(pct(spA - Number(o), Number(o))) !== cellOf(d, sp, D));
    const q3 = String(Math.round(nwMin + cellOf(d, "Central India", A) + enMin + spA));
    // Certain to be 10% or more above: the lowest departure each row allows.
    const least = [nwLo, central, enLo, spLo];
    const q4 = String(least.filter((x) => x >= 10).length);
    return { answers: [nwMin, q2.length === 1 ? q2[0] : `${q2.length} options cannot`, q3, q4, enN - enMax] };
  },

  "di-power-capacity": (s) => {
    const cap = dataOf(s, "cap"), mix = dataOf(s, "mix"), ys = cap.cols;
    const total = (y: string) => sum(cap.rows.map((r) => cellOf(cap, r.name, y)));
    const v = (src: string, y: string) => mix.rows.some((r) => r.name === src) ? (cellOf(cap, "Renewables", y) * cellOf(mix, src, y)) / 100 : cellOf(cap, src, y);
    const sources = ["Solar", "Wind", "Other RE", "Hydro (large)", "Nuclear", "Thermal"];
    const q1 = pct(v("Solar", ys[2]), v("Solar", ys[0])) - 100;
    const q2 = String(sources.filter((x) => [1, 2].every((i) => v(x, ys[i]) > v(x, ys[i - 1]) && v(x, ys[i]) / total(ys[i]) < v(x, ys[i - 1]) / total(ys[i - 1]))).length);
    const gap = v("Thermal", ys[2]) - v("Solar", ys[2]), closes = v("Solar", ys[2]) - v("Solar", ys[1]) - (v("Thermal", ys[2]) - v("Thermal", ys[1]));
    const q3 = String(Math.floor(gap / closes) + 1);
    const q4 = pct(v("Solar", ys[0]), v("Solar", ys[0]) + v("Wind", ys[2]) + v("Other RE", ys[2])).toFixed(1) + "%";
    const rest = total(ys[2]) - cellOf(cap, "Renewables", ys[2]);
    const q5 = (rest * 40) / 60 - cellOf(cap, "Renewables", ys[2]);
    return { answers: [q1, q2, q3, q4, q5] };
  },
};
