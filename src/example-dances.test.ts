import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { generateDanceAnimation } from "./generate";
import { inferProgression } from "./inferProgression";
import type { Dance } from "./instructions/index";
import { initFormationStates } from "./instructions/index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = resolve(__dirname, "example-dances");
const files = readdirSync(dir).filter((f: string) => f.endsWith(".ts"));

async function loadDance(file: string): Promise<Dance> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- dynamic import of known dance module shape
  const mod = (await import(resolve(dir, file))) as { default: Dance };
  return mod.default;
}

describe("verified dances have valid nonzero progressions", () => {
  it.each(files)("%s", async (file: string) => {
    const dance = await loadDance(file);
    if (dance.status !== "verified") return;
    const initState =
      typeof dance.initFormation === "string"
        ? initFormationStates[dance.initFormation]
        : dance.initFormation;
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
    expect(progression).not.toBe(0);
  });
});

describe("verified dances are 64 beats long", () => {
  it.each(files)("%s", async (file: string) => {
    const dance = await loadDance(file);
    if (dance.status !== "verified") return;
    const initState =
      typeof dance.initFormation === "string"
        ? initFormationStates[dance.initFormation]
        : dance.initFormation;
    const { animation, errors } = generateDanceAnimation(
      dance.instructions,
      initState,
    );
    expect(errors).toHaveLength(0);
    expect(animation).not.toBeNull();
    if (!animation) return;
    expect(animation.dur).toBe(64);
  });
});
