// Builds the Chrome extension (F53, D110) into extension/dist, ready for "Load unpacked" or zipping for the store.
//
//   npm run ext:build          for 99ile.in
//   npm run ext:dev            for the local site at http://localhost:5173 (npm run dev)
//   npm run ext:store          for 99ile.in without the `key` field, zipped for the Chrome Web Store
//
// Readability is bundled in (the store forbids remote code). The manifest's `key` is our public key, so the
// extension's id stays jdbigbpnbadjaphglkhomapjbhajbphe, the one the site's panel allows (src/lib/panel.ts, _headers).
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes("--dev");
// The store gives the listing its own id and key; our key.txt only pins the id of local builds.
const store = process.argv.includes("--store");
// --site=<origin> and --test-host=<origin> are for automated tests only: another site, and access to a test page
// (a real build reads a page only after the student's click, through activeTab).
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const site = arg("site") ?? (dev ? "http://localhost:5173" : "https://99ile.in");
const testHost = arg("test-host");
const out = join(here, "dist");
const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: { background: join(here, "src/background.ts"), panel: join(here, "src/panel.ts"), reader: join(here, "src/reader.ts"), select: join(here, "src/select.ts") },
  outdir: out, bundle: true, format: "iife", target: "chrome116", minify: false, legalComments: "inline",
  define: {
    __SITE__: JSON.stringify(site),
    __LOGO__: JSON.stringify(readFileSync(join(here, "..", "public/favicon.svg"), "utf8").trim()),
  },
});

const manifest = {
  manifest_version: 3,
  // The store shows these as the listing's title and summary (title up to 75 characters, summary up to 132).
  name: "99ile: CAT RC practice from any article",
  short_name: "99ile",
  version: pkg.version.replace(/[^0-9.]/g, "") || "0.1.0",
  description: "Turn the essay or editorial you are reading into a free CAT-style RC set, answered in a panel beside it.",
  ...(store ? {} : { key: readFileSync(join(here, "key.txt"), "utf8").trim() }),
  minimum_chrome_version: "116",
  permissions: ["activeTab", "scripting", "contextMenus", "sidePanel", "storage"],
  host_permissions: [site + "/*", ...(testHost ? [testHost + "/*"] : [])],
  // Only if the student switches on "Add to RC set" as they select (D112): Chrome asks then, never at install.
  optional_host_permissions: ["<all_urls>"],
  background: { service_worker: "background.js" },
  action: { default_title: "Make an RC set from this page", default_icon: { 16: "icon-48.png", 32: "icon-48.png", 48: "icon-48.png" } },
  icons: { 48: "icon-48.png", 128: "icon-128.png" },
  side_panel: { default_path: "panel.html" },
  commands: { "make-set": { suggested_key: { default: "Alt+Shift+R" }, description: "Make an RC set from this page" } },
};
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
copyFileSync(join(here, "static/panel.html"), join(out, "panel.html"));
for (const f of ["icon-48.png", "icon-128.png"]) copyFileSync(join(here, "static", f), join(out, f));
console.log(`extension/dist built for ${site}`);
if (store) {
  const zip = join(here, `99ile-chrome-${manifest.version}.zip`);
  rmSync(zip, { force: true });
  execFileSync("zip", ["-qr", zip, "."], { cwd: out });
  console.log(`store package: ${zip}`);
}
