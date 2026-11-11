import { ways, cellKey, cellLabel, biggestCut, type BoardGroup, type ReplayPuzzle, type TrailStep } from "../practice/replay";
import { FORMAT } from "../practice/replay";
import { stateAt, type ClipState, type Scene } from "../practice/clip";
import type { GridModel } from "../practice/solver";

/**
 * Draws one frame of a Replay clip (F101, docs/design/replay-clips.md) on a 1080 × 1920 canvas: the title, the count
 * and its staircase, the step's clues and worked line, and the board. Loaded only with the clip panel.
 */

export const W = 1080, H = 1920;
/** Side margins, and the bottom fifth left clear for Instagram's own controls and caption. */
const X = 72, CW = W - 2 * X, SAFE_BOTTOM = H - 260;
const FONT = '"Schibsted Grotesk", "Schibsted Fallback", system-ui, sans-serif';

export type ClipTheme = "light" | "dark";
/** The site's tokens (src/index.css), copied so a clip looks the same whatever theme the page is in. */
const PALETTE = {
  light: { bg: "#f5f6f8", fg: "#141a24", card: "#ffffff", muted: "#edeff3", mutedFg: "#586274", secondary: "#e9ecf2", primary: "#2340c8", primaryFg: "#ffffff", hl: "#ffe15a", hlFg: "#2e2600", accent: "#e7ebfa", success: "#15803d", successSoft: "#dcf2e3" },
  dark: { bg: "#0e1218", fg: "#e7ebf2", card: "#161b24", muted: "#1b212b", mutedFg: "#a1abbd", secondary: "#1f2531", primary: "#8fa3ff", primaryFg: "#0e1218", hl: "#f2d04f", hlFg: "#241c00", accent: "#222b45", success: "#4cc380", successSoft: "#153322" },
};
type Palette = (typeof PALETTE)["light"];

/** The weights a clip uses, loaded before the first frame so no frame falls back to another font. */
export const loadClipFonts = () => Promise.all(["400", "600", "800"].map((w) => document.fonts.load(`${w} 40px "Schibsted Grotesk"`))).catch(() => undefined);

const font = (px: number, weight = 400) => `${weight} ${px}px ${FONT}`;

/** Splits text into lines no wider than `width`, cutting at words; past `max` lines the last one ends with "…". */
export function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max = 99): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last && ctx.measureText(`${last}…`).width > width) last = last.replace(/\s*\S+$/, "");
  kept[max - 1] = `${last}…`;
  return kept;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

const listNums = (xs: number[]) => (xs.length < 2 ? String(xs[0]) : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Where the board goes: each group's cell size and position, chosen so the cells are as large as the space allows. */
interface Placed { g: BoardGroup; x: number; y: number; cell: number; label: number; cellW: number; names: boolean; title: boolean }
function placeBoard(ctx: CanvasRenderingContext2D, groups: BoardGroup[], top: number, bottom: number): Placed[] {
  ctx.font = font(30, 600);
  const labelW = (g: BoardGroup) => Math.ceil(Math.max(...g.rows.map((r) => ctx.measureText(r.label).width))) + 20;
  const GAP = 8, HEAD = 44, TITLE = 44, BETWEEN = 24;
  // One grid needs no title (the page names it); grids side by side with the same rows share one column of names.
  const titled = groups.length > 1;
  const sameRows = (a: BoardGroup, b: BoardGroup) => a.rows.map((r) => r.label).join() === b.rows.map((r) => r.label).join();
  let best: Placed[] = [];
  let bestCell = 0;
  // Try 1, 2 or 3 groups to a row and keep the arrangement with the largest cells that fits.
  for (let perLine = 1; perLine <= groups.length; perLine++) {
    const lines: BoardGroup[][] = [];
    for (let i = 0; i < groups.length; i += perLine) lines.push(groups.slice(i, i + perLine));
    const named = (g: BoardGroup, line: BoardGroup[]) => line.indexOf(g) === 0 || g.perRow || !sameRows(g, line[0]);
    // A league's cells hold words ("Aces won"), so they are wider than tall.
    const widthOf = (g: BoardGroup, line: BoardGroup[], c: number) => (named(g, line) ? labelW(g) : 0) + (g.perRow ? 3 * (c * 2.6 + GAP) : g.cols.length * (c + GAP));
    const widthIn = (line: BoardGroup[], c: number) => line.reduce((n, g) => n + widthOf(g, line, c), 0) + BETWEEN * (line.length - 1);
    const heightIn = (g: BoardGroup, c: number) => (titled && g.title ? TITLE : 0) + (g.perRow ? 0 : HEAD) + g.rows.length * (c + GAP);
    let lo = 30, hi = 96;
    const fits = (c: number) => {
      const tall = lines.reduce((n, line) => n + Math.max(...line.map((g) => heightIn(g, c))), 0) + BETWEEN * (lines.length - 1);
      return tall <= bottom - top && lines.every((line) => widthIn(line, c) <= CW);
    };
    if (!fits(lo)) continue;
    while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (fits(mid)) lo = mid; else hi = mid; }
    if (lo <= bestCell) continue;
    bestCell = lo;
    best = [];
    let y = top;
    for (const line of lines) {
      let x = X + (CW - widthIn(line, lo)) / 2;
      for (const g of line) {
        const names = named(g, line);
        best.push({ g, x, y, cell: lo, label: names ? labelW(g) : 0, cellW: g.perRow ? lo * 2.6 : lo, names, title: titled && !!g.title });
        x += widthOf(g, line, lo) + BETWEEN;
      }
      y += Math.max(...line.map((g) => heightIn(g, lo))) + BETWEEN;
    }
  }
  return best;
}

function tick(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(4, s * 0.13); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy); ctx.lineTo(cx - s * 0.08, cy + s * 0.22); ctx.lineTo(cx + s * 0.32, cy - s * 0.22); ctx.stroke();
}
function cross(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(3, s * 0.09); ctx.lineCap = "round";
  const r = s * 0.2;
  ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
}

export interface ClipInput { p: ReplayPuzzle; m: GridModel; groups: BoardGroup[]; trail: TrailStep[]; scenes: Scene[]; theme: ClipTheme; link: string }

/** Lays the clip out once (text wrapping, board size) and returns a function that draws the frame at `t` seconds. */
export function clipPainter(ctx: CanvasRenderingContext2D, input: ClipInput): (t: number) => void {
  const { p, m, groups, trail, scenes, link } = input;
  const c = PALETTE[input.theme];
  const best = biggestCut(trail);

  // Top down: brand and title, the count, the staircase, the step's text, then the board in whatever height is left.
  ctx.font = font(64, 800);
  const title = wrap(ctx, p.title, CW, 2);
  const titleY = 206;
  const countY = titleY + (title.length - 1) * 74 + 84;
  const ROW = 38;
  const stairY = countY + 176;
  const textY = stairY + trail.length * ROW + 36;
  // The text panel is as tall as the longest scene needs (measured by drawing each once), within limits.
  let need = 0;
  for (const s of scenes) need = Math.max(need, drawText(ctx, c, stateAt(trail, scenes, s.start + 0.01), p, trail, textY, 0, link, best) - textY);
  const textH = Math.min(600, need + 10);
  // A tall, narrow grid (nine students in three teams) may read better as two halves side by side: keep the larger cells.
  const boardTop = textY + textH + 40;
  let board = placeBoard(ctx, groups, boardTop, SAFE_BOTTOM);
  const g0 = groups[0];
  if (groups.length === 1 && !g0.perRow && g0.rows.length >= 6) {
    const half = Math.ceil(g0.rows.length / 2);
    const split = placeBoard(ctx, [{ ...g0, title: "", rows: g0.rows.slice(0, half) }, { ...g0, title: "", rows: g0.rows.slice(half) }], boardTop, SAFE_BOTTOM);
    if ((split[0]?.cell ?? 0) > (board[0]?.cell ?? 0)) board = split;
  }
  const order = new Map<string, number>();

  return (t: number) => {
    const st = stateAt(trail, scenes, t);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    // Brand and title.
    ctx.font = font(40, 800); ctx.fillStyle = c.primary; ctx.fillText("99ile", X, 132);
    ctx.font = font(32); ctx.fillStyle = c.mutedFg;
    const kicker = `DILR replay, ${FORMAT[p.format].label.toLowerCase()}`;
    ctx.textAlign = "right"; ctx.fillText(kicker, W - X, 130); ctx.textAlign = "left";
    ctx.font = font(64, 800); ctx.fillStyle = c.fg;
    title.forEach((l, i) => ctx.fillText(l, X, titleY + i * 74));

    drawCount(ctx, c, st, trail, countY);
    drawStairs(ctx, c, st, trail, stairY, ROW, best);
    drawText(ctx, c, st, p, trail, textY, textH, link, best);
    drawBoard(ctx, c, st, m, board, trail, order);
  };
}

function drawCount(ctx: CanvasRenderingContext2D, c: Palette, st: ClipState, trail: TrailStep[], y: number) {
  ctx.font = font(34); ctx.fillStyle = c.mutedFg;
  ctx.fillText(st.scene.at === 0 ? "Before any clue" : "Ways left", X, y);
  if (st.scene.at > 0) { ctx.textAlign = "right"; ctx.fillText(`from ${ways(trail[0].settled.count, trail[0].settled.capped)}`, W - X, y); ctx.textAlign = "left"; }
  ctx.font = font(st.capped ? 104 : 140, 800); ctx.fillStyle = st.scene.kind === "close" && trail[st.scene.at].settled.count === 1 ? c.success : c.fg;
  ctx.fillText(st.capped ? ways(st.count, true) : st.count.toLocaleString("en-IN"), X - 5, y + 138);
}

function drawStairs(ctx: CanvasRenderingContext2D, c: Palette, st: ClipState, trail: TrailStep[], y: number, row: number, best: number) {
  const top = Math.log(trail[0].settled.count + 1);
  const len = (i: number) => Math.max(0.04, Math.log(trail[i].settled.count + 1) / top);
  const at = st.scene.at;
  ctx.font = font(30, 600);
  const valueW = Math.max(110, ...trail.map((s) => ctx.measureText(ways(s.settled.count, s.settled.capped)).width + 30));
  const labelW = 140, barW = CW - labelW - valueW - 20;
  trail.forEach((s, i) => {
    const cy = y + i * row + row / 2;
    const reached = i < at || (i === at && (st.scene.kind !== "step" || st.fall > 0));
    ctx.font = font(30, i === at ? 600 : 400); ctx.fillStyle = i === at ? c.fg : c.mutedFg;
    ctx.fillText(i === 0 ? "Start" : `Step ${i}`, X, cy + 10);
    rounded(ctx, X + labelW, cy - 9, barW, 18, 9, c.secondary);
    const grow = i === at && st.scene.kind === "step" ? len(i - 1) + (len(i) - len(i - 1)) * st.fall : len(i);
    if (i <= at) rounded(ctx, X + labelW, cy - 9, Math.max(18, barW * grow), 18, 9, i === at ? c.primary : withAlpha(c.primary, 0.45));
    else rounded(ctx, X + labelW, cy - 9, Math.max(18, barW * len(i)), 18, 9, withAlpha(c.primary, 0.12));
    // The current step's value counts down with the big number.
    const value = !reached ? "?" : i === at && st.scene.kind === "step" && st.fall < 1 ? st.count.toLocaleString("en-IN") : ways(s.settled.count, s.settled.capped);
    ctx.font = font(30, i === best && reached ? 600 : 400);
    const vw = ctx.measureText(value).width;
    if (i === best && reached && i <= at && st.scene.kind !== "open") {
      rounded(ctx, W - X - vw - 12, cy - 20, vw + 18, 40, 8, c.hl);
      ctx.fillStyle = c.hlFg;
    } else ctx.fillStyle = reached ? c.fg : c.mutedFg;
    ctx.textAlign = "right"; ctx.fillText(value, W - X - 3, cy + 10); ctx.textAlign = "left";
  });
}

/** The scene's words on a card. Returns where the text ended, so the layout can size the card (`h` 0: measure only). */
function drawText(ctx: CanvasRenderingContext2D, c: Palette, st: ClipState, p: ReplayPuzzle, trail: TrailStep[], y: number, h: number, link: string, best: number): number {
  if (h) rounded(ctx, X - 28, y - 4, CW + 56, h, 32, c.card);
  const x = X + 8, w = CW - 16;
  let at = y + 62;
  const para = (text: string, px: number, weight: number, color: string, max: number, gap = 1.32) => {
    ctx.font = font(px, weight); ctx.fillStyle = color;
    for (const l of wrap(ctx, text, w, max)) { ctx.fillText(l, x, at); at += px * gap; }
    at += px * 0.45;
  };
  const s = st.scene;
  if (s.kind === "open") {
    const first = trail[0].settled;
    para(p.intro.join(" "), 34, 400, c.fg, 5);
    para(`${ways(first.count, first.capped)} arrangements fit the story. ${p.clues.length} clues cut them to one.`, 36, 600, c.primary, 3);
    return at;
  }
  if (s.kind === "close") {
    const left = trail[s.at].settled.count;
    const done = left === 1;
    if (done) {
      para("One arrangement left: the answer.", 50, 800, c.fg, 2, 1.22);
      para(`Step ${best} cut the most, ${ways(trail[best - 1].settled.count, trail[best - 1].settled.capped)} to ${ways(trail[best].settled.count)}. Look for that move first.`, 36, 400, c.mutedFg, 3);
    } else {
      // The clip stopped a step short: say which clues are left to use, not what they settle.
      const next = p.steps[s.at].use;
      para(`${left.toLocaleString("en-IN")} ways left. Can you get it to one?`, 50, 800, c.fg, 2, 1.22);
      para(`Hint: ${next.length === 1 ? "clue" : "clues"} ${listNums(next)} finish it.`, 36, 400, c.mutedFg, 2);
    }
    para(done ? "Try another set on 99ile" : "Finish it on 99ile", 36, 600, c.fg, 1);
    ctx.font = font(36, 600);
    const lines = wrap(ctx, link, w, 2);
    lines.forEach((l) => { ctx.fillStyle = c.primary; ctx.fillText(l, x, at); at += 46; });
    return at;
  }
  const step = p.steps[s.at - 1];
  para(`Step ${s.at} of ${p.steps.length}: ${step.use.length === 1 ? "clue" : "clues"} ${listNums(step.use)}`, 40, 600, c.fg, 1);
  // The step's clues, quoted, on a tinted strip.
  for (const n of step.use) {
    ctx.font = font(32, 400);
    const lines = wrap(ctx, `${n}. ${p.clues[n - 1]}`, w - 40, 2);
    rounded(ctx, x - 12, at - 38, w + 24, lines.length * 42 + 16, 14, c.accent);
    ctx.fillStyle = c.fg;
    lines.forEach((l) => { ctx.fillText(l, x + 8, at); at += 42; });
    at += 20;
  }
  at += 8;
  const room = h ? Math.max(1, Math.min(5, Math.floor((y + h - at + 8) / (32 * 1.32)))) : 5;
  para(step.say, 32, 400, c.mutedFg, room);
  return at;
}

function drawBoard(ctx: CanvasRenderingContext2D, c: Palette, st: ClipState, m: GridModel, board: Placed[], trail: TrailStep[], order: Map<string, number>) {
  const t = trail[st.scene.at];
  const before = st.scene.kind === "step" ? trail[st.scene.at - 1].settled.cells : t.settled.cells;
  // Newly settled cells appear in the order the step settles them (the trail lists them in board order).
  if (st.scene.kind === "step") { order.clear(); t.fresh.forEach((k, i) => order.set(k, i)); }
  const pop = (k: string) => {
    if (st.scene.kind !== "step" || before.has(k)) return 1;
    const i = order.get(k);
    if (i === undefined) return 1;
    // Each cell takes three of the stagger's slots to grow in; the slots run two past the last cell so it finishes too.
    const n = Math.max(1, order.size);
    return Math.min(1, Math.max(0, ((st.cells / n) * (n + 2) - i) / 3));
  };
  for (const { g, x, y, cell, label, cellW, names, title } of board) {
    let top = y;
    if (title) { ctx.font = font(30, 600); ctx.fillStyle = c.fg; ctx.fillText(g.title, x + label, top + 30); top += 44; }
    if (!g.perRow) {
      // Column names shrink to fit their cells ("Mon" over a narrow column), never below 22 px.
      const px = Math.max(22, Math.min(28, ...g.cols.map((col) => { ctx.font = font(28, 600); return Math.floor((28 * (cell + 4)) / Math.max(1, ctx.measureText(col.label).width)); })));
      ctx.font = font(px, 600); ctx.fillStyle = c.mutedFg; ctx.textAlign = "center";
      g.cols.forEach((col, j) => ctx.fillText(col.label, x + label + j * (cell + 8) + cell / 2, top + 30));
      ctx.textAlign = "left";
      top += 44;
    }
    g.rows.forEach((r, i) => {
      const cy = top + i * (cell + 8);
      ctx.font = font(30, 600); ctx.fillStyle = c.fg; ctx.textBaseline = "middle";
      if (names) ctx.fillText(g.perRow ? wrap(ctx, r.label, label - 20, 1)[0] : r.label, x, cy + cell / 2);
      g.cols.forEach((col, j) => {
        const k = cellKey(r.name, col.v);
        // A cell this step settles grows in; until its turn it reads as empty.
        const fresh = st.scene.kind === "step" && !before.has(k) && t.settled.cells.has(k);
        const q = fresh ? pop(k) : 1;
        const mark = fresh && q === 0 ? undefined : t.settled.cells.get(k);
        const cx = x + label + j * (cellW + 8), r8 = Math.min(16, cell * 0.22);
        ctx.save();
        ctx.translate(cx + cellW / 2, cy + cell / 2);
        rounded(ctx, -cellW / 2, -cell / 2, cellW, cell, r8, c.muted);
        if (g.perRow && !mark) {
          ctx.font = font(Math.min(28, cell * 0.42), 600); ctx.textAlign = "center"; ctx.fillStyle = c.mutedFg;
          ctx.fillText(wrap(ctx, cellLabel(m, g, r.name, col.v), cellW - 16, 1)[0], 0, 0);
        }
        if (mark) {
          ctx.globalAlpha = q;
          ctx.scale(0.7 + 0.3 * q, 0.7 + 0.3 * q);
          rounded(ctx, -cellW / 2, -cell / 2, cellW, cell, r8, mark === "in" ? c.successSoft : c.bg);
          if (g.perRow) {
            ctx.font = font(Math.min(28, cell * 0.42), 600); ctx.textAlign = "center";
            ctx.fillStyle = mark === "in" ? c.success : withAlpha(c.mutedFg, 0.5);
            ctx.fillText(wrap(ctx, cellLabel(m, g, r.name, col.v), cellW - 16, 1)[0], 0, 0);
          } else if (mark === "in") tick(ctx, 0, 0, cell, c.success);
          else cross(ctx, 0, 0, cell, withAlpha(c.mutedFg, 0.75));
        }
        ctx.restore();
      });
      ctx.textBaseline = "alphabetic";
    });
  }
}

/** A hex colour with an alpha, for the faint bars and crosses. */
function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
