import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { generateDanceAnimation } from "./generate";
import { inferProgression } from "./inferProgression";
import { DanceSchema, initFormationStates } from "./instructions/index";

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

const nonDummyFiles = files.filter((f) => !f.includes(".dummy."));

describe.skip("non-dummy dances have valid nonzero progressions", () => {
  it.each(nonDummyFiles)("%s", (file: string) => {
    const dance = DanceSchema.parse(
      JSON.parse(readFileSync(resolve(dir, file), "utf-8")),
    );
    const initState = initFormationStates[dance.initFormation];
    const { animation, errors } = generateDanceAnimation(
      dance.instructions,
      initState,
    );
    expect(errors).toEqual([]);
    expect(animation).not.toBeNull();
    if (!animation) return;
    const progression = inferProgression(animation, initState);
    expect(
      progression,
      `expected a nonzero integer progression`,
    ).not.toBeNull();
    expect(progression).toBeGreaterThan(0);
  });
});

describe("non-dummy dances are 64 beats long", () => {
  it.each(nonDummyFiles)("%s", (file: string) => {
    const dance = DanceSchema.parse(
      JSON.parse(readFileSync(resolve(dir, file), "utf-8")),
    );
    const initState = initFormationStates[dance.initFormation];
    const { animation, errors } = generateDanceAnimation(
      dance.instructions,
      initState,
    );
    expect(errors).toEqual([]);
    expect(animation).not.toBeNull();
    if (!animation) return;
    expect(animation.dur).toBe(64);
  });
});
