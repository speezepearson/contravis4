import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import { generateDanceJsonSchemas } from "../scripts/dance-json-schema";

test("generated JSON schemas are up to date", () => {
  const expected = generateDanceJsonSchemas();

  const outDir = join(
    fileURLToPath(import.meta.url),
    "..",
    "..",
    "_generated",
    "json-schemas",
  );
  const actualFiles = readdirSync(outDir).filter((f) =>
    f.endsWith(".schema.json"),
  );

  const expectedFilenames = new Set(Object.keys(expected));
  const actualFilenames = new Set(actualFiles);
  expect(actualFilenames).toEqual(expectedFilenames);

  for (const filename of expectedFilenames) {
    const actual = JSON.parse(readFileSync(join(outDir, filename), "utf-8"));
    expect(actual, filename).toEqual(expected[filename]);
  }
});
