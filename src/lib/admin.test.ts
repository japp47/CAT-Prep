import { describe, expect, it } from "vitest";
import { groupReports, type Report } from "./admin";

const r = (id: number, itemId: string, createdAt: string): Report => ({ id, itemId, createdAt, page: "/x", kind: "typo", note: "", status: "new", handledAt: null, handledBy: "" });

describe("grouping reports by question", () => {
  it("puts the question with more reports first, then the newest, and the newest report first in each", () => {
    const g = groupReports([r(1, "a", "2026-10-20T10:00:00Z"), r(2, "b", "2026-10-21T10:00:00Z"), r(3, "a", "2026-10-22T09:00:00Z"), r(4, "c", "2026-10-23T09:00:00Z")]);
    expect(g.map((x) => x.itemId)).toEqual(["a", "c", "b"]);
    expect(g[0].reports.map((x) => x.id)).toEqual([3, 1]);
    expect(g[0].latest).toBe("2026-10-22T09:00:00Z");
  });
});
