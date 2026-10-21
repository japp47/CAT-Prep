import { describe, expect, it } from "vitest";
import { iosSafariTab } from "./keep";
import { appleMobile } from "./pwa";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
// iPad Safari asks for the desktop site by default and sends a Mac user agent.
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const IPAD_CHROME = "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0 Mobile/15E148 Safari/604.1";

describe("iPhone and iPad", () => {
  it("an iPad that calls itself a Mac counts, a real Mac does not", () => {
    expect(appleMobile(IPHONE, 5)).toBe(true);
    expect(appleMobile(IPAD, 5)).toBe(true);
    expect(appleMobile(IPAD, 0)).toBe(false);
  });
  it("the Home Screen note is for Safari tabs only", () => {
    expect(iosSafariTab(IPAD, 5, false)).toBe(true);
    expect(iosSafariTab(IPAD, 5, true)).toBe(false);
    expect(iosSafariTab(IPAD_CHROME, 5, false)).toBe(false);
  });
});
