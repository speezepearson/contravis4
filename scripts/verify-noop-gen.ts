import { enableMapSet } from "immer";

import { generateDanceAnimation } from "../src/generate";
import { danceLength, resolveInitFormation } from "../src/instructions/index";
import { loadDance } from "./lib";

enableMapSet();

const results: Record<
  string,
  { frames: { t: number; state: unknown }[] } | { error: string }
> = {};
for (const path of process.argv.slice(2)) {
  try {
    const dance = await loadDance(path);
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
