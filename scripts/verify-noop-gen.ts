import { resolve } from "node:path";

import { enableMapSet } from "immer";

import { generateDanceAnimation } from "../src/generate";
import type { Dance } from "../src/instructions/index";
import { danceLength, resolveInitFormation } from "../src/instructions/index";

enableMapSet();

const results: Record<
  string,
  { frames: { t: number; state: unknown }[] } | { error: string }
> = {};
for (const path of process.argv.slice(2)) {
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- dynamic import of known dance module shape
    const mod = (await import(resolve(path))) as { default: Dance };
    const dance = mod.default;
    const { animation, errors } = generateDanceAnimation(
      dance.instructions,
      resolveInitFormation(dance.initFormation),
    );
    if (!animation) {
      results[path] = {
        error:
          errors.map((e) => e.message).join("; ") || "no animation produced",
      };
      continue;
    }
    const dur = danceLength(dance.instructions);
    const count = Math.max(1, Math.round(dur * 4));
    const frames: { t: number; state: unknown }[] = [];
    for (let i = 0; i <= count; i++) {
      const t = (dur * i) / count;
      frames.push({ t, state: animation.getFrame(t) });
    }
    results[path] = { frames };
  } catch (e) {
    results[path] = { error: String(e) };
  }
}
process.stdout.write(JSON.stringify(results));
