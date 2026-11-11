import type { ReplayPuzzle, TrailStep } from "./replay";

/**
 * Replay clips (F101, docs/design/replay-clips.md, D94): when each part of a clip happens. A clip opens on the story's
 * count, gives each worked step a scene, and closes either one step short ("tease", the default, so it spoils nothing)
 * or on the answer. Pure, so its lengths and states are tested; the drawing is in `components/clipDraw.ts`.
 */

export type ClipEnding = "tease" | "answer";
export const ENDING: Record<ClipEnding, string> = { tease: "Leave the last step", answer: "Show the answer" };

export const FPS = 30;
export const OPEN_SECS = 3;
export const CLOSE_SECS = 4;
/** When, inside a step, the count starts to fall, how long it takes, and when its newly settled cells start to appear. */
export const FALL_AT = 0.4, FALL_SECS = 0.8, CELLS_AT = 0.6, CELLS_SECS = 1.2;

export interface Scene {
  kind: "open" | "step" | "close";
  /** The trail index the scene ends on (0 before any clue). */
  at: number;
  start: number;
  secs: number;
}

/** A step's scene is long enough to read its clues and worked line, about 28 characters a second, within 4 to 10 s. */
export function stepSecs(p: ReplayPuzzle, step: number): number {
  const s = p.steps[step - 1];
  const chars = s.say.length + s.use.reduce((n, c) => n + p.clues[c - 1].length, 0);
  return Math.min(10, Math.max(4, Math.round((2.5 + chars / 28) * 10) / 10));
}

/** The last step a clip shows: the answer, or the one before it. */
export const lastShown = (trail: TrailStep[], ending: ClipEnding) => Math.max(1, trail.length - 1 - (ending === "tease" ? 1 : 0));

export function clipScenes(p: ReplayPuzzle, trail: TrailStep[], ending: ClipEnding): { scenes: Scene[]; secs: number; frames: number } {
  const scenes: Scene[] = [{ kind: "open", at: 0, start: 0, secs: OPEN_SECS }];
  let t = OPEN_SECS;
  for (let k = 1; k <= lastShown(trail, ending); k++) {
    const secs = stepSecs(p, k);
    scenes.push({ kind: "step", at: k, start: t, secs });
    t += secs;
  }
  scenes.push({ kind: "close", at: lastShown(trail, ending), start: t, secs: CLOSE_SECS });
  t += CLOSE_SECS;
  return { scenes, secs: t, frames: Math.round(t * FPS) };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

export interface ClipState {
  scene: Scene;
  /** Seconds into the scene. */
  local: number;
  /** The count to print, falling on a log scale so 1,680 to 40 and 4 to 1 both read as cuts. */
  count: number;
  /** True while the number shown is the capped start ("over 2,00,000"). */
  capped: boolean;
  /** How far the current step's bar has grown, 0 to 1. */
  fall: number;
  /** How many of the step's newly settled cells are showing (fractional: the last one is still popping in). */
  cells: number;
}

export function stateAt(trail: TrailStep[], scenes: Scene[], t: number): ClipState {
  let scene = scenes[0];
  for (const s of scenes) if (s.start <= t) scene = s;
  const local = t - scene.start;
  const now = trail[scene.at].settled;
  if (scene.kind !== "step") return { scene, local, count: now.count, capped: now.capped, fall: 1, cells: trail[scene.at].fresh.length };
  const before = trail[scene.at - 1].settled;
  const fall = easeOut((local - FALL_AT) / FALL_SECS);
  const count = fall >= 1 ? now.count : Math.round(Math.exp(Math.log(before.count) + (Math.log(now.count) - Math.log(before.count)) * fall));
  const fresh = trail[scene.at].fresh.length;
  const cells = fresh * clamp01((local - CELLS_AT) / CELLS_SECS);
  return { scene, local, count, capped: before.capped && fall === 0, fall, cells };
}
