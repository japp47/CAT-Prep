import { describe as suite, expect, it } from "vitest";
import html from "../../index.html?raw";
import { GUIDES } from "../data/guides";
import { describe, guideDescription, isPersonalPath, publicPaths, sitemapXml } from "./seo";

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

suite("the site's name as people type it", () => {
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@graph"] as Record<string, unknown>[];

  it("tells search that 99 ile and 99-ile mean this site, on the site and on its owner", () => {
    for (const type of ["WebSite", "Organization"]) {
      const names = graph.find((n) => n["@type"] === type)!.alternateName as string[];
      expect(names, type).toEqual(expect.arrayContaining(["99 ile", "99-ile"]));
    }
  });
  // Owner, 18 Nov 2026: the other spellings are for search only; people see the one name.
  it("shows only the one name to people: the title and the script-less text say 99ile", () => {
    expect(html).toMatch(/<title>99ile: free CAT prep<\/title>/);
    expect(html.match(/<noscript>[\s\S]*<\/noscript>/)![0]).not.toContain("99 ile");
  });
});

suite("pages search is asked not to index", () => {
  it("covers Sign in and the personal pages, with or without a slash or a sub-page", () => {
    for (const p of ["/signin", "/today", "/progress/", "/progress/mock-review/abc", "/review/2026-w46", "/settings", "/you"]) expect(isPersonalPath(p), p).toBe(true);
  });
  it("never covers a page the sitemap lists", () => {
    const paths = publicPaths(GUIDES.map((g) => g.id));
    for (const p of paths) expect(isPersonalPath(p), p).toBe(false);
  });
});
