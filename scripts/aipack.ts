/**
 * Writes dist/ai/rc.json after the build: each RC set's passage and model summary, as the AI service reads them
 * (src/practice/aipack.ts, F36, D105). The server fetches it from the live site, like daily.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { aiPack } from "../src/practice/aipack";
import { RC_SETS } from "../src/practice/rc";

const pack = aiPack(RC_SETS);
mkdirSync("dist/ai", { recursive: true });
writeFileSync("dist/ai/rc.json", JSON.stringify(pack) + "\n");
console.log(`dist/ai/rc.json: ${pack.sets.length} sets with a model summary`);
