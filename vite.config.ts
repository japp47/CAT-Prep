import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/**
 * Writes dist/sw.js, a small service worker that precaches every built file so the site
 * opens without internet after the first visit. Its cache name is a hash of the files,
 * so each deploy replaces the old cache. No dependency: the file list comes from dist/.
 */
function offline(): Plugin {
  let outDir = "dist", base = "/";
  const skip = (f: string) => f === "sw.js" || f === "_redirects" || f.endsWith(".map");
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  return {
    name: "offline-sw",
    apply: "build",
    configResolved(c) { outDir = c.build.outDir; base = c.base; },
    closeBundle() {
      const files = walk(outDir).map((p) => relative(outDir, p).split(sep).join("/")).filter((f) => !skip(f)).sort();
      const hash = createHash("sha256");
      files.forEach((f) => hash.update(f).update(readFileSync(join(outDir, f))));
      const sw = readFileSync("pwa/sw.js", "utf8")
        .replace("__VERSION__", hash.digest("hex").slice(0, 12))
        .replace("__BASE__", base)
        .replace('["__FILES__"]', JSON.stringify(files));
      writeFileSync(join(outDir, "sw.js"), sw);
    },
  };
}

// VITE_BASE lets the same build run at the domain root (Vercel, Netlify, Cloudflare Pages)
// or under a sub-path such as /CAT-Prep/ on GitHub Pages.
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react(), tailwindcss(), offline()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node" },
});
