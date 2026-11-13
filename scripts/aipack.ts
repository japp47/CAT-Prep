/**
 * Writes dist/ai/rc.json after the build: the RC sets as the AI service reads them (src/practice/aipack.ts, F35, D100).
 * The server fetches it from the live site, like daily.json, so a prompt is built from published content and ids only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { aiPack } from "../src/practice/aipack";
import { RC_SETS } from "../src/practice/rc";

const pack = aiPack(RC_SETS);
mkdirSync("dist/ai", { recursive: true });
writeFileSync("dist/ai/rc.json", JSON.stringify(pack) + "\n");
console.log(`dist/ai/rc.json: ${pack.sets.length} sets, ${pack.sets.reduce((n, s) => n + s.questions.length, 0)} questions`);
