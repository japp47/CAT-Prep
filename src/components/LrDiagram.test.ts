import { describe, expect, it } from "vitest";
import type { LrDiagram } from "../practice/types";
import { blankScratch, writeScratch } from "./LrDiagram";

const g: LrDiagram = {
  layout: "grid", rows: ["Aces", "Bulls", "Chargers"], seats: ["A", "B", "C", "Points"], mirror: { W: "L", L: "W", D: "D" },
  frames: [[[null, [], [], []], [[], null, [], []], [[], [], null, []]]],
};

describe("the scratch pad of a results grid", () => {
  it("fills in the other team's result", () => {
    let v = writeScratch(g, blankScratch(g), 0, 1, "w");
    expect(v[1][0]).toBe("L");
    v = writeScratch(g, v, 0, 1, "D");
    expect(v[1][0]).toBe("D");
    v = writeScratch(g, v, 0, 1, "");
    expect(v[1][0]).toBe("");
  });

  it("leaves alone what the student wrote, and the columns that are not teams", () => {
    let v = writeScratch(g, blankScratch(g), 2, 0, "draw?");
    v = writeScratch(g, v, 0, 2, "W");
    expect(v[2][0]).toBe("draw?");
    v = writeScratch(g, v, 0, 3, "W");
    expect(v.map((r) => r[3])).toEqual(["W", "", ""]);
  });
});
