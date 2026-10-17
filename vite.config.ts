import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// VITE_BASE lets the same build run at the domain root (Vercel, Netlify, Cloudflare Pages)
// or under a sub-path such as /CAT-Prep/ on GitHub Pages.
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  test: { environment: "node" },
});
