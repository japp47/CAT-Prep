import { describe, expect, it } from "vitest";
import { signInNext } from "./words";

// Google's return must reach a page that reads ?signin=, or the student is never signed in (19 Nov 2026).
describe("where Google sends the student back", () => {
  it("goes through /signin from any other page, and back to that page after", () => {
    expect(signInNext("/extension")).toBe("/signin?then=%2Fextension");
    expect(signInNext("/extension?from=install")).toBe("/signin?then=%2Fextension%3Ffrom%3Dinstall");
    expect(signInNext("/practice/article")).toBe("/signin?then=%2Fpractice%2Farticle");
    expect(signInNext("/settings#reminders")).toBe("/settings#reminders");
  });
  it("leaves the pages that read the ticket themselves as they are", () => {
    expect(signInNext("/signin?then=%2Ftoday")).toBe("/signin?then=%2Ftoday");
    expect(signInNext("/you")).toBe("/you");
    expect(signInNext("/settings")).toBe("/settings");
  });
  it("never sends anyone off the site", () => {
    expect(signInNext("//evil.example")).toBe("/signin?then=%2F");
    expect(signInNext("https://evil.example")).toBe("/signin?then=%2F");
    expect(signInNext("/youtube-fake")).toBe("/signin?then=%2Fyoutube-fake");
  });
});
