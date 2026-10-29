/**
 * Fails the build when the first download grows past its budget. The first download is what
 * index.html loads before anything else: the main script and the stylesheet, gzipped as a browser receives them,
 * and the two latin font files every page uses (already compressed; they are not preloaded, which tested slower).
 * Practice content loads later, one file at a time (src/practice/bank.ts): the largest of those has its own budget.
 * The stylesheet budget is 30 KB gzipped (D54): Tailwind v4 builds one stylesheet for the whole site, so it covers
 * every page; Cloudflare sends it brotli-compressed, about a fifth smaller than measured here.
 * Run after `npm run build`: `npm run size`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGET = { script: 150 * KB, style: 30 * KB, fonts: 100 * KB, content: 70 * KB };

const html = readFileSync("dist/index.html", "utf8");
const first = (re) => html.match(re)?.[1];
const gz = (path) => gzipSync(readFileSync("dist" + path)).length;

// Vite replaces non-filename characters (such as `&`) with underscores in chunk names.
const contentNames = new Set([...readdirSync("content/rc").map((f) => f.replace(/\.json$/, "").replace(/[^a-zA-Z0-9_-]/g, "_")), "paragraphs"]);
const content = readdirSync("dist/assets")
  .filter((f) => f.endsWith(".js") && contentNames.has(f.replace(/-[\w-]{8}\.js$/, "")))
  .map((f) => ({ f, size: gz("/assets/" + f) }))
  .sort((a, b) => b.size - a.size);
const fonts = readdirSync("dist/fonts").filter((f) => f.endsWith("-latin.woff2")).map((f) => "/fonts/" + f);
const fontBytes = fonts.reduce((s, f) => s + statSync("dist" + f).size, 0);

const rows = [
  ["Main script", first(/<script[^>]+src="([^"]+\.js)"/), BUDGET.script, gz],
  ["Stylesheet", first(/<link[^>]+href="([^"]+\.css)"/), BUDGET.style, gz],
  ["Fonts", fonts.length ? fonts.join(", ") : null, BUDGET.fonts, () => fontBytes],
  ["Largest content", content[0] && "/assets/" + content[0].f, BUDGET.content, gz],
];
let failed = false;
for (const [name, path, budget, measure] of rows) {
  if (!path) { console.error(`${name}: not found in dist/. Run npm run build first.`); failed = true; continue; }
  const size = measure(path.replace(/^.*\/assets\//, "/assets/"));
  const over = size > budget;
  failed ||= over;
  console.log(`${over ? "OVER" : "ok  "}  ${name.padEnd(17)} ${(size / KB).toFixed(1).padStart(6)} KB, budget ${budget / KB} KB  (${path})`);
}
if (content.length) console.log(`      ${content.length} content files: ${content.map((c) => c.f.replace(/-[\w-]{8}\.js$/, "") + " " + (c.size / KB).toFixed(0)).join(", ")} KB`);
process.exit(failed ? 1 : 0);
