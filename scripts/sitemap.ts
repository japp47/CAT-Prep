/**
 * Writes dist/sitemap.xml after the build: the public pages and one entry per guide (src/lib/seo.ts). robots.txt, which
 * points at it, is a plain file in public/. Search Console is given the address once; it re-reads the file on its own.
 */
import { writeFileSync } from "node:fs";
import { GUIDES } from "../src/data/guides";
import { publicPaths, sitemapXml } from "../src/lib/seo";

const paths = publicPaths(GUIDES.map((g) => g.id));
writeFileSync("dist/sitemap.xml", sitemapXml(paths));
console.log(`dist/sitemap.xml: ${paths.length} addresses`);
