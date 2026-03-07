import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { generateDanceJsonSchemas } from "./dance-json-schema";

const schemas = generateDanceJsonSchemas();

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "_generated",
  "json-schemas",
);
mkdirSync(outDir, { recursive: true });

let count = 0;
for (const [filename, schema] of Object.entries(schemas)) {
  const path = join(outDir, filename);
  writeFileSync(path, JSON.stringify(schema, null, 2) + "\n");
  count++;
}

console.log(`Wrote ${count} schema files to ${outDir}`);
