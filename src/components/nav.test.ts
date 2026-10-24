import { describe, expect, it } from "vitest";
import { PRACTICE_PATH } from "./SiteHeader";

describe("Practice in the navigation (D39)", () => {
  it("is current on every section's practice page and on the players", () => {
    ["/practice", "/practice/rc/arts-perspective", "/practice/lr/arr-six-colleagues", "/varc/practice", "/dilr/practice", "/quant/practice"]
      .forEach((p) => expect(PRACTICE_PATH.test(p), p).toBe(true));
  });
  it("is not current on a section's own page or on look-alike addresses", () => {
    ["/varc", "/dilr", "/practiced", "/dilr/practices", "/progress"].forEach((p) => expect(PRACTICE_PATH.test(p), p).toBe(false));
  });
});
