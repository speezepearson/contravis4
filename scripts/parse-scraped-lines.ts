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
      if (r.type === "split") {
        if (r.by === "role") {
          const fmtSide = (instrs: typeof r.larks) =>
            instrs.length === 0
              ? "(empty)"
              : instrs.map((i) => i.type).join(", ");
          console.log(
            `  → split(role): larks=[${fmtSide(r.larks)}], robins=[${fmtSide(r.robins)}]`,
          );
        } else {
          const fmtSide = (instrs: typeof r.ups) =>
            instrs.length === 0
              ? "(empty)"
              : instrs.map((i) => i.type).join(", ");
          console.log(
            `  → split(dir): ups=[${fmtSide(r.ups)}], downs=[${fmtSide(r.downs)}]`,
          );
        }
      } else {
        const fields: string[] = [`type=${r.type}`, `beats=${r.beats}`];
        if ("cid" in r) {
          const cid = r.cid;
          if (cid.type === "label") fields.push(`cid=${cid.label}`);
          else if (cid.type === "PersonInDirection")
            fields.push(`cid=person_${cid.dir}`);
        }
        if ("handedness" in r) fields.push(`hand=${r.handedness}`);
        if ("rotations" in r) fields.push(`rot=${r.rotations}`);
        if ("direction" in r) {
          const d = r.direction;
          fields.push(`dir=${typeof d === "string" ? d : JSON.stringify(d)}`);
        }
        if ("nPlaces" in r) fields.push(`nPlaces=${r.nPlaces}`);
        if ("full" in r) fields.push(`full=${r.full}`);
        console.log(`  → ${fields.join(", ")}`);
      }
    }
  }
  console.log();
}
