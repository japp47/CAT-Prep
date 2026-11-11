import { describe, expect, it } from "vitest";
import replayJson from "../../content/lrdrill/replay.json";
import { CELLS_AT, CELLS_SECS, CLOSE_SECS, FALL_AT, FALL_SECS, FPS, OPEN_SECS, clipScenes, lastShown, stateAt, stepSecs } from "./clip";
import { trailOf, type ReplayPuzzle } from "./replay";

const PUZZLES = replayJson as unknown as ReplayPuzzle[];

describe("replay clips (F101): the timeline", () => {
  for (const p of PUZZLES) {
    const trail = trailOf(p);
    const last = trail.length - 1;

    it(`${p.id}: opens, gives each step a scene, closes, and adds up`, () => {
      for (const ending of ["tease", "answer"] as const) {
        const { scenes, secs, frames } = clipScenes(p, trail, ending);
        expect(scenes[0]).toMatchObject({ kind: "open", at: 0, start: 0, secs: OPEN_SECS });
        expect(scenes[scenes.length - 1]).toMatchObject({ kind: "close", secs: CLOSE_SECS });
        const steps = scenes.filter((s) => s.kind === "step");
        expect(steps.map((s) => s.at)).toEqual(Array.from({ length: lastShown(trail, ending) }, (_, i) => i + 1));
        // Scenes follow one another with no gap.
        scenes.slice(1).forEach((s, i) => expect(s.start).toBeCloseTo(scenes[i].start + scenes[i].secs, 6));
        expect(secs).toBeCloseTo(scenes[scenes.length - 1].start + CLOSE_SECS, 6);
        expect(frames).toBe(Math.round(secs * FPS));
        // Long enough to post, short enough to watch.
        expect(secs).toBeGreaterThanOrEqual(15);
        expect(secs).toBeLessThanOrEqual(60);
      }
    });

    it(`${p.id}: "leave the last step" stops with more than one arrangement left; "show the answer" ends on one`, () => {
      const tease = clipScenes(p, trail, "tease").scenes;
      expect(trail[tease[tease.length - 1].at].settled.count).toBeGreaterThan(1);
      const answer = clipScenes(p, trail, "answer").scenes;
      expect(answer[answer.length - 1].at).toBe(last);
      expect(trail[last].settled.count).toBe(1);
    });

    it(`${p.id}: a step's count falls from the step before to its own, never outside them`, () => {
      const { scenes } = clipScenes(p, trail, "answer");
      for (const s of scenes.filter((x) => x.kind === "step")) {
        const from = trail[s.at - 1].settled.count, to = trail[s.at].settled.count;
        expect(stateAt(trail, scenes, s.start).count).toBe(from);
        expect(stateAt(trail, scenes, s.start + FALL_AT + FALL_SECS + 0.01).count).toBe(to);
        for (let t = s.start; t < s.start + s.secs; t += 0.1) {
          const st = stateAt(trail, scenes, t);
          expect(st.scene).toBe(s);
          expect(st.count).toBeLessThanOrEqual(from);
          expect(st.count).toBeGreaterThanOrEqual(to);
          expect(st.fall).toBeGreaterThanOrEqual(0);
          expect(st.fall).toBeLessThanOrEqual(1);
        }
        // Newly settled cells: none before they start, all once their time is up.
        expect(stateAt(trail, scenes, s.start + CELLS_AT - 0.01).cells).toBe(0);
        expect(stateAt(trail, scenes, s.start + CELLS_AT + CELLS_SECS + 0.001).cells).toBe(trail[s.at].fresh.length);
      }
    });

    it(`${p.id}: step scenes last 4 to 10 seconds`, () => {
      p.steps.forEach((_, i) => {
        expect(stepSecs(p, i + 1)).toBeGreaterThanOrEqual(4);
        expect(stepSecs(p, i + 1)).toBeLessThanOrEqual(10);
      });
    });
  }

  it("shows the capped start until the count begins to fall (archery starts above the cap)", () => {
    const p = PUZZLES.find((x) => x.id === "rp-archery")!;
    const trail = trailOf(p);
    expect(trail[0].settled.capped).toBe(true);
    const { scenes } = clipScenes(p, trail, "tease");
    expect(stateAt(trail, scenes, 1).capped).toBe(true);
    const first = scenes[1];
    expect(stateAt(trail, scenes, first.start + 0.1).capped).toBe(true);
    expect(stateAt(trail, scenes, first.start + FALL_AT + FALL_SECS).capped).toBe(false);
  });
});
