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
export interface Fact {
  test: (v: (row: string, col: string) => number) => boolean;
  /** The fact that sets the values a blank may take: the domain, so it cannot be dropped to test it. */
  domain?: true;
  /** The cells the fact reads, so the search tests it as soon as they are filled; without it, on a full table. */
  cells?: [row: string, col: string][];
}

/**
 * Every way to fill a table's blanks from `domain` that keeps its "Total" row and column right and meets `facts`
 * (up to `cap`). Totals prune the search as soon as a row or column is complete; a fact is tested once the cells it
 * names are filled (all of them if it names none). A Total left blank is not a rule: it is worked out from the fill and
 * returned with it, so a fill covers every blank in the table.
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
    if (deps.length && !Number.isNaN(cellOf(d, r.name, totalCol))) rules.push({ deps, test: (g) => cols.reduce((s, c) => s + value(g, r.name, c), 0) === cellOf(d, r.name, totalCol) });
  });
  if (totalRow) cols.forEach((c) => {
    const deps = body.map((r) => key(r.name, c)).filter((k) => blanks.includes(k));
    if (deps.length && !Number.isNaN(cellOf(d, totalRow.name, c))) rules.push({ deps, test: (g) => body.reduce((s, r) => s + value(g, r.name, c), 0) === cellOf(d, totalRow.name, c) });
  });
  facts.forEach((f) => rules.push({
    deps: f.cells ? f.cells.map(([r, c]) => key(r, c)).filter((k) => blanks.includes(k)) : blanks,
    test: (g) => f.test((r, c) => value(g, r, c)),
  }));
  const csp: Csp = { vars: blanks.map((name) => ({ name, domain })), distinct: [], rules };
  return (allCases(csp, cap) as Map<string, number>[]).map((m) => {
    const v = (r: string, c: string) => { const x = cellOf(d, r, c); return Number.isNaN(x) ? m.get(key(r, c))! : x; };
    if (totalCol) body.forEach((r) => { if (Number.isNaN(cellOf(d, r.name, totalCol))) m.set(key(r.name, totalCol), sum(cols.map((c) => v(r.name, c)))); });
    if (totalRow) cols.forEach((c) => { if (Number.isNaN(cellOf(d, totalRow.name, c))) m.set(key(totalRow.name, c), sum(body.map((r) => v(r.name, c)))); });
    if (totalRow && totalCol && Number.isNaN(cellOf(d, totalRow.name, totalCol))) m.set(key(totalRow.name, totalCol), sum(body.flatMap((r) => cols.map((c) => v(r.name, c)))));
    return m;
  });
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

  // The six harder sets (owner's batch, 11 Nov 2026; D95).
  "di-streaming-growth": (s) => {
    const g = dataOf(s, "growth"), base = dataOf(s, "base"), years = g.cols, ps = g.rows.map((r) => r.name);
    // Subscribers by platform, 2019 then each year, from a table of rates that a what-if may change.
    const run = (rate: (p: string, y: string) => number) => Object.fromEntries(ps.map((p) => {
      const xs = [cellOf(base, p, "2019")];
      years.forEach((y) => xs.push(xs[xs.length - 1] * (1 + rate(p, y) / 100)));
      return [p, xs];
    })) as Record<string, number[]>;
    const actual = run((p, y) => cellOf(g, p, y));
    const scenario = run((p, y) => (p === "Bhava" && y === "2022" ? 8 : p === "Chitra" && y === "2023" ? 15 : cellOf(g, p, y)));
    const all = (S: Record<string, number[]>, i: number) => sum(ps.map((p) => S[p][i]));
    const q1 = String(ps.reduce((n, p) => n + years.filter((_, i) => actual[p][i + 1] - actual[p][i] >= 10).length, 0));
    const moved = ps.map((p) => Math.abs(actual[p][5] / all(actual, 5) - actual[p][0] / all(actual, 0)));
    const q2 = ps[moved.indexOf(Math.min(...moved))];
    const q3 = String(years.filter((y, i) => all(actual, i + 1) / all(actual, i) - 1 > sum(ps.map((p) => cellOf(g, p, y))) / 300).length);
    const q4 = pct(all(scenario, 5), all(actual, 5)) - 100;
    const q5 = `${Math.round(pct(scenario.Chitra[5] - scenario.Chitra[0], all(scenario, 5) - all(scenario, 0)))}%`;
    return { answers: [q1, q2, q3, q4, q5] };
  },

  "di-group-segments": (s) => {
    const share = dataOf(s, "share"), seg = dataOf(s, "seg"), names = seg.rows.map((r) => r.name);
    const [growth, m25, m24] = seg.cols;
    // The one rupee figure: Finance's 2025 profit of ₹ 4,320 crore (intro), with its margin and share, sizes the group.
    const group25 = 4320 / (cellOf(seg, "Finance", m25) / 100) / (cellOf(share, "Finance", "Share") / 100);
    const r25 = (n: string) => (group25 * cellOf(share, n, "Share")) / 100, r24 = (n: string) => r25(n) / (1 + cellOf(seg, n, growth) / 100);
    const p25 = (n: string) => (r25(n) * cellOf(seg, n, m25)) / 100, p24 = (n: string) => (r24(n) * cellOf(seg, n, m24)) / 100;
    const all = (f: (n: string) => number) => sum(names.map(f));
    const q1 = pct(all(r25), all(r24)) - 100;
    const q2 = all((n) => (r25(n) * (cellOf(seg, n, m25) - cellOf(seg, n, m24))) / 100);
    const q3 = pct(all(p25) - p25("Media"), all(r25) - r25("Media"));
    const q4 = `+${(pct(all(p25), all(p24)) - 100).toFixed(1)}%`;
    const energy = r24("Energy") - r25("Energy");
    const q5 = `${pct(all(p25) + (energy * cellOf(seg, "Energy", m25)) / 100, all(r25) + energy).toFixed(1)}%`;
    return {
      answers: [q1, q2, q3, q4, q5],
      // The volume part and the margin part add up to the whole rise, as the explanation says.
      extra: () => {
        const volume = all((n) => ((r25(n) - r24(n)) * cellOf(seg, n, m24)) / 100);
        if (Math.abs(volume + q2 - (all(p25) - all(p24))) > 1e-6) throw new Error("volume + margin parts do not add up to the rise");
      },
    };
  },

  "di-car-zones": (s) => {
    const d = dataOf(s, "cars");
    const models = ["Model P", "Model Q", "Model R", "Model S"], zones = ["North", "South", "East", "West"];
    const domain = Array.from({ length: 39 }, (_, k) => 10 + 5 * k);
    const row = (m: string) => zones.map((z) => [m, z] as [string, string]), col = (z: string) => models.map((m) => [m, z] as [string, string]);
    const tot = (v: (r: string, c: string) => number, m: string) => sum(zones.map((z) => v(m, z)));
    const ztot = (v: (r: string, c: string) => number, z: string) => sum(models.map((m) => v(m, z)));
    const facts: Fact[] = [
      // 1: the domain (multiples of 5, at least 10; 200 is above anything the totals allow).
      { domain: true, test: (v) => models.every((m) => zones.every((z) => v(m, z) % 5 === 0 && v(m, z) >= 10)) },
      // 2: East's total is North's + 10.
      { cells: [...col("East"), ...col("North")], test: (v) => ztot(v, "East") === ztot(v, "North") + 10 },
      // 3: Q in West is 25% more than P in West.
      { cells: [["Model Q", "West"], ["Model P", "West"]], test: (v) => v("Model Q", "West") * 4 === v("Model P", "West") * 5 },
      // 4: R in South is the average of R in North and R in East.
      { cells: [["Model R", "South"], ["Model R", "North"], ["Model R", "East"]], test: (v) => 2 * v("Model R", "South") === v("Model R", "North") + v("Model R", "East") },
      // 5: Q and S have equal totals.
      { cells: [...row("Model Q"), ...row("Model S")], test: (v) => tot(v, "Model Q") === tot(v, "Model S") },
      // 6: no entry exceeds P in East.
      { test: (v) => models.every((m) => zones.every((z) => v(m, z) <= v("Model P", "East"))) },
      // 7: P's total is R's + 45.
      { cells: [...row("Model P"), ...row("Model R")], test: (v) => tot(v, "Model P") === tot(v, "Model R") + 45 },
    ];
    const [f] = fills(d, domain, facts, 2);
    const v = (r: string, c: string) => { const x = cellOf(d, r, c); return Number.isNaN(x) ? f.get(`${r}|${c}`)! : x; };
    const rLow = [...zones].sort((a, b) => v("Model R", a) - v("Model R", b)).slice(0, 2);
    const q1 = String(sum(rLow.map((z) => v("Model P", z) + v("Model R", z))));
    const zt = zones.map((z) => ztot(v, z)), top = Math.max(...zt);
    const q2 = `${Math.round(pct(top, (sum(zt) - top) / 3) - 100)}%`;
    const q3 = String(sum(zones.map((z, i) => models.filter((m) => v(m, z) > zt[i] / 4).length)));
    const sTop = zones.filter((z) => v("Model S", z) === Math.max(...models.map((m) => v(m, z))));
    const q4 = pct(0.3 * sum(sTop.map((z) => v("Model S", z))), tot(v, "Model S"));
    const ratio = models.map((m) => { const xs = zones.map((z) => v(m, z)).sort((a, b) => b - a); return xs[0] / (sum(xs.slice(1)) / 3); });
    const q5 = models[ratio.indexOf(Math.max(...ratio))];
    return { answers: [q1, q2, q3, q4, q5], table: { data: d, domain, facts } };
  },

  "di-sales-funnel": (s) => {
    const leads = dataOf(s, "leads"), funnel = dataOf(s, "funnel"), rs = leads.rows.map((r) => r.name);
    const [convCol, dealCol] = funnel.cols;
    const L = (r: string) => cellOf(leads, r, "Leads"), C = (r: string) => cellOf(funnel, r, convCol), D = (r: string) => cellOf(funnel, r, dealCol);
    const rev = (r: string, l = L(r), c = C(r)) => (l * c * D(r)) / 10;
    const rank = (f: (r: string) => number) => (r: string) => 1 + rs.filter((x) => f(x) > f(r)).length;
    const byLeads = rank(L), byRev = rank((r) => rev(r));
    const q1 = String(rs.filter((r) => Math.abs(byLeads(r) - byRev(r)) >= 2).length);
    const overall = sum(rs.map((r) => L(r) * C(r))) / sum(rs.map(L)), avgDeal = sum(rs.map(D)) / rs.length;
    const q2 = sum(rs.filter((r) => C(r) > overall && D(r) < avgDeal).map((r) => rev(r)));
    // The rate a region needs for ₹ 150 crore, capped at 3 points more.
    const q3 = sum(rs.filter((r) => rev(r) < 150).map((r) => 150 - rev(r, L(r), Math.min((150 * 10) / (L(r) * D(r)), C(r) + 3))));
    const L2 = (r: string) => (r === "North-East" ? 2 * L(r) : L(r)), C2 = (r: string) => (r === "North-East" ? C(r) - 1 : C(r));
    const q4 = `${(sum(rs.map((r) => L2(r) * C2(r))) / sum(rs.map(L2))).toFixed(2)}%`;
    const perLead = (r: string) => (C(r) * D(r)) / 10, order = [...rs].sort((a, b) => perLead(a) - perLead(b));
    const low = order[0], [second, first] = order.slice(-2);
    const q5 = 6 * (perLead(first) - perLead(low)) + 4 * (perLead(second) - perLead(low));
    return { answers: [q1, q2, q3, q4, q5] };
  },

  "di-food-delivery": (s) => {
    const d = dataOf(s, "cities"), cs = d.rows.map((r) => r.name);
    const [ORD, AOV, COM, DEL, MKT, FIX] = d.cols;
    const x = (c: string, col: string) => cellOf(d, c, col);
    const profit = (c: string, o: { del?: number; com?: number; mkt?: number; orders?: number } = {}) =>
      x(c, ORD) * (o.orders ?? 1) * ((x(c, AOV) * (x(c, COM) + (o.com ?? 0))) / 100 - x(c, DEL) * (o.del ?? 1) - (x(c, MKT) + (o.mkt ?? 0))) - x(c, FIX);
    const base = cs.map((c) => profit(c));
    const q1 = pct(base[0], sum(base.filter((p) => p > 0)));
    let q2 = 0;
    while (cs.filter((c) => profit(c, { del: 1 + q2 / 100 }) < 0).length !== 3) q2++;
    // Jaipur: x points more commission, 3% of the orders lost per point; the lowest rate with profit not negative.
    const jaipur = (k: number) => profit("Jaipur", { com: k, orders: 1 - 0.03 * k });
    let lo = 0, hi = 5;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (jaipur(mid) < 0) lo = mid; else hi = mid; }
    const q3 = x("Jaipur", COM) + hi;
    const q4 = `+₹ ${Math.round(sum(cs.map((c) => profit(c, { mkt: -5, orders: 0.94 }))) - sum(base))} lakh`;
    const q5 = sum(cs.map((c) => profit(c, { del: 1.15, com: 1.5, orders: 0.97 })));
    return { answers: [q1, String(q2), q3, q4, q5] };
  },

  "di-equity-funds": (s) => {
    const d = dataOf(s, "returns"), years = d.cols, funds = d.rows.map((r) => r.name).filter((n) => n !== "Index");
    const r = (f: string, y: string) => cellOf(d, f, y);
    const rank = (f: string, y: string) => 1 + funds.filter((g) => r(g, y) > r(f, y)).length;
    const grow = (f: string, ys = years) => ys.reduce((v, y) => v * (1 + r(f, y) / 100), 1);
    const q1 = String(funds.filter((f) => years.filter((y) => rank(f, y) <= 3).length >= 3 && years.filter((y) => rank(f, y) >= 5).length >= 3).length);
    const q2 = [...funds].sort((a, b) => grow(b) - grow(a))[1];
    const q3 = String(funds.filter((f) => grow(f) > grow("Index") && years.filter((y) => r(f, y) > r("Index", y)).length < 4).length);
    const early = years.slice(0, 3), late = years.slice(3);
    const q4 = (100000 * grow("Contra", early) * (grow("Contra", late) - 0.985 * grow("Dividend Yield", late))) / 1000;
    const climbs = (f: string) => years.slice(1).map((y, i) => rank(f, y) < rank(f, years[i]));
    const q5 = String(funds.filter((f) => climbs(f).some((_, i, c) => c[i] && c[i + 1] && c[i + 2])).length);
    return {
      answers: [q1, q2, q3, q4, q5],
      extra: () => {
        // No two funds tie in a year, as the intro says, and the stem's index return is right.
        years.forEach((y) => { if (new Set(funds.map((f) => r(f, y))).size !== funds.length) throw new Error(`a tie in ${y}`); });
        if ((grow("Index") * 100 - 100).toFixed(1) !== "68.2") throw new Error("the index's six-year return is not 68.2%");
      },
    };
  },
};
