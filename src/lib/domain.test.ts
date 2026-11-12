import { describe, expect, it } from "vitest";
import { canonicalUrl, movedTo } from "./domain";

const at = (hostname: string, pathname = "/", search = "", hash = "") => ({ hostname, pathname, search, hash });

describe("the old address", () => {
  it("sends students to 99ile.in, keeping the page, the query and the hash", () => {
    expect(movedTo(at("99ile.pages.dev"))).toBe("https://99ile.in/");
    expect(movedTo(at("99ile.pages.dev", "/settings", "", "#reminders"))).toBe("https://99ile.in/settings#reminders");
    expect(movedTo(at("99ile.pages.dev", "/settings", "?from=reminder-daily&m=42", "#reminders")))
      .toBe("https://99ile.in/settings?from=reminder-daily&m=42#reminders");
    expect(movedTo(at("99ile.pages.dev", "/practice/rc/arts-x", "?review=abc"))).toBe("https://99ile.in/practice/rc/arts-x?review=abc");
  });
  it("leaves every other address alone", () => {
    for (const h of ["99ile.in", "www.99ile.in", "localhost", "127.0.0.1", "abc123.99ile.pages.dev", "evil-99ile.pages.dev", "99ile.pages.dev.evil.com"]) {
      expect(movedTo(at(h, "/today")), h).toBeNull();
    }
  });
});

describe("the canonical address", () => {
  it("is 99ile.in plus the path, with no trailing slash and no query", () => {
    expect(canonicalUrl("/")).toBe("https://99ile.in/");
    expect(canonicalUrl("")).toBe("https://99ile.in/");
    expect(canonicalUrl("/privacy")).toBe("https://99ile.in/privacy");
    expect(canonicalUrl("/privacy/")).toBe("https://99ile.in/privacy");
    expect(canonicalUrl("/guides/rc-method///")).toBe("https://99ile.in/guides/rc-method");
  });
});
