import { describe as suite, expect, it } from "vitest";
import { GUIDES } from "../data/guides";
import { describe, guideDescription, publicPaths, sitemapXml } from "./seo";

suite("the sitemap", () => {
  const paths = publicPaths(GUIDES.map((g) => g.id));
  const xml = sitemapXml(paths);

  it("lists the home page, the public pages and every guide but the CAT 2026 one", () => {
    for (const p of ["/", "/varc", "/dilr", "/guides", "/privacy", "/contact", "/guides/start-here", "/guides/exam-day"]) expect(paths, p).toContain(p);
    expect(paths).not.toContain("/guides/last-25-days");
    expect(paths.filter((p) => p.startsWith("/guides/"))).toHaveLength(GUIDES.length - 1);
  });
  it("leaves out the personal pages, the players and the pages that are not there yet", () => {
    for (const p of ["/today", "/progress", "/history", "/errors", "/settings", "/you", "/admin", "/signin", "/quant"]) expect(paths, p).not.toContain(p);
    expect(paths.some((p) => p.startsWith("/practice/"))).toBe(false);
  });
  it("has no address twice, and writes each as a full https://99ile.in address", () => {
    expect(new Set(paths).size).toBe(paths.length);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toHaveLength(paths.length);
    locs.forEach((l) => expect(l).toMatch(/^https:\/\/99ile\.in\//));
  });
  it("escapes what XML cannot hold", () => {
    expect(sitemapXml(["/a&b"])).toContain("<loc>https://99ile.in/a&amp;b</loc>");
  });
});

suite("a page description", () => {
  it("is one tidy line that ends in a full stop", () => {
    expect(describe("  Short\n  and   plain  ")).toBe("Short and plain.");
    expect(describe("Already ends here.")).toBe("Already ends here.");
  });
  it("is cut at a whole word inside the limit, never mid-word", () => {
    const long = "word ".repeat(80);
    const d = describe(long);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith("…")).toBe(true);
    expect(d).not.toMatch(/\bwor…$/);
  });
  it("gives every guide a description that names it and is short enough to show whole", () => {
    for (const g of GUIDES) {
      const d = guideDescription(g);
      expect(d.length, g.id).toBeLessThanOrEqual(160);
      expect(d, g.id).toContain("99ile");
      expect(d, g.id).toContain(`${g.minutes}-minute`);
    }
  });
});
