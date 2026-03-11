import { z } from "zod";

import { ccwRadsBetween, PI } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields, personInDir } from "./_base";
import { type InstructionAnimator } from "./_segment";
import { californiaTwirlSegments } from "./californiaTwirl";

export const TurnAsACoupleInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("turn_as_a_couple"),
});
export type TurnAsACoupleInstruction = z.infer<
  typeof TurnAsACoupleInstructionSchema
>;

export const turnAsACoupleSegments: InstructionAnimator<
  TurnAsACoupleInstruction
> = (instr, init, who) => {
  const checked = new Set<string>();
  for (const id of who) {
    const them = Dancer.get(id, init).resolveMatch(
      personInDir("larks_right_robins_left"),
    );
    const pairKey = [id, them.id].sort().join(",");
    if (checked.has(pairKey)) continue;
    checked.add(pairKey);
    const angleDiff = Math.abs(ccwRadsBetween(init[id].facing, them.facing));
    if (angleDiff > PI / 4) {
      throw new SnazzyError([
        { dancerId: id },
        " and ",
        { dancerId: them.id },
        " are not facing the same direction for turn_as_a_couple",
      ]);
    }
  }

  return californiaTwirlSegments(
    { id: instr.id, beats: instr.beats, type: "california_twirl" },
    init,
    who,
  );
};
