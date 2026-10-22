import { describe, expect, it } from "vitest";
import { formatCode, LINK_LEN, linkUrl, normalizeCode, parseLink, RECOVERY_LEN } from "./codes";

describe("codes", () => {
  it("forgive how people type, like the server", () => {
    expect(normalizeCode("abcd-efgh", LINK_LEN)).toBe("ABCDEFGH");
    expect(normalizeCode(" ab cd ef gh ", LINK_LEN)).toBe("ABCDEFGH");
    expect(normalizeCode("IL0O-1234", LINK_LEN)).toBe("11001234");
    expect(normalizeCode("ABCD-EFGU", LINK_LEN)).toBe("");
    expect(normalizeCode("ABCD-EFG", LINK_LEN)).toBe("");
    expect(normalizeCode("abcd-efgh-jkmn-pqrs", RECOVERY_LEN)).toBe("ABCDEFGHJKMNPQRS");
    expect(formatCode("ABCDEFGH")).toBe("ABCD-EFGH");
  });

  it("the scanner accepts only our own link", () => {
    const origin = "https://99ile.pages.dev";
    expect(parseLink(linkUrl(origin, "/", "ABCDEFGH"), origin)).toBe("ABCDEFGH");
    expect(parseLink("https://99ile.pages.dev/link#abcd-efgh", origin)).toBe("ABCDEFGH");
    for (const bad of [
      "https://evil.example/link#ABCDEFGH",
      "https://99ile.pages.dev/other#ABCDEFGH",
      "https://99ile.pages.dev/link#ABCD",
      "https://99ile.pages.dev/link?code=ABCDEFGH",
      "upi://pay?pa=x@bank",
      "ABCDEFGH",
      "",
    ]) expect(parseLink(bad, origin), bad).toBeNull();
  });
});
