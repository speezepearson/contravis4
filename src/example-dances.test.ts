import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it } from "vitest";

import { DanceSchema } from "./instructions/index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = resolve(__dirname, "../example-dances");
const files = readdirSync(dir).filter((f: string) => f.endsWith(".json"));

describe("example dances", () => {
  it.each(files)("%s parses as a valid Dance", (file: string) => {
    const raw = JSON.parse(readFileSync(resolve(dir, file), "utf-8"));
    const result = DanceSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(
        result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      );
    }
  });
});
