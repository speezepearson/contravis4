import * as fs from "node:fs";
import { parseArgs } from "node:util";

import { parseDanceInstruction } from "../src/parseDanceInstruction";

const { positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
});

const file = positionals[0];
if (!file) {
  console.error("Usage: tsx scripts/parse-scraped-lines.ts <file>");
  process.exit(1);
}

const content = fs.readFileSync(file, "utf-8");

function withoutId(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(withoutId);
  if (obj !== null && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "id") continue;
      out[k] = withoutId(v);
    }
    return out;
  }
  return obj;
}

for (const line of content.split("\n")) {
  const match = line.match(/^\s*(\d+)\s+beats?\s+(.+)/);
  if (!match) continue;

  const figureText = match[2];
  const result = parseDanceInstruction(figureText);

  console.log(line);
  if (result.length === 0) {
    console.log("  (no parse)");
  } else {
    for (const r of result) {
      console.log("  " + JSON.stringify(withoutId(r)));
    }
  }
  console.log();
}
