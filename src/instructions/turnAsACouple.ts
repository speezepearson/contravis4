import { z } from "zod";

import { ccwRadsBetween, PI } from "../geometry";
import { getDancer } from "../worldState";
import { instructionBaseSchemaFields, resolveMatch } from "./_base";
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
    const themId = resolveMatch(id, "larks_right_robins_left", init);
    const pairKey = [id, themId].sort().join(",");
    if (checked.has(pairKey)) continue;
    checked.add(pairKey);
    const angleDiff = Math.abs(
      ccwRadsBetween(init[id].facing, getDancer(themId, init).facing),
    );
    if (angleDiff > PI / 4) {
      throw new Error(
        `${id} and ${themId} are not facing the same direction for turn_as_a_couple`,
      );
    }
  }

  return californiaTwirlSegments(
    { id: instr.id, beats: instr.beats, type: "california_twirl" },
    init,
    who,
  );
};
