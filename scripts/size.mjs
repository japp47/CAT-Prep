/**
 * Fails the build when the first download grows past its budget. The first download is what
 * index.html loads before anything else: the main script and the stylesheet, gzipped as a
 * browser receives them. Practice content loads later in its own chunk, with a looser budget.
 * Run after `npm run build`: `npm run size`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGET = { script: 150 * KB, style: 20 * KB, content: 200 * KB };

const html = readFileSync("dist/index.html", "utf8");
const first = (re) => html.match(re)?.[1];
const gz = (path) => gzipSync(readFileSync("dist" + path)).length;
const bank = readdirSync("dist/assets").find((f) => /^bank-.*\.js$/.test(f));

const rows = [
  ["Main script", first(/<script[^>]+src="([^"]+\.js)"/), BUDGET.script],
  ["Stylesheet", first(/<link[^>]+href="([^"]+\.css)"/), BUDGET.style],
  ["Practice content", bank && "/assets/" + bank, BUDGET.content],
];
let failed = false;
for (const [name, path, budget] of rows) {
  if (!path) { console.error(`${name}: not found in dist/. Run npm run build first.`); failed = true; continue; }
  const size = gz(path.replace(/^.*\/assets\//, "/assets/"));
  const over = size > budget;
  failed ||= over;
  console.log(`${over ? "OVER" : "ok  "}  ${name.padEnd(17)} ${(size / KB).toFixed(1).padStart(6)} KB gzipped, budget ${budget / KB} KB  (${path})`);
}
process.exit(failed ? 1 : 0);
