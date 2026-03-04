import { z } from "zod";

import { ccwRadsBetween, PI } from "../geometry";
import { getDancerState } from "../worldState";
import { instructionBaseSchemaFields, resolveMatches } from "./_base";
import { type SegmentAnimator } from "./_segment";
import { californiaTwirlSegments } from "./californiaTwirl";

export const TurnAsACoupleInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("turn_as_a_couple"),
});
export type TurnAsACoupleInstruction = z.infer<
  typeof TurnAsACoupleInstructionSchema
>;

export const turnAsACoupleSegments =
  (instr: TurnAsACoupleInstruction): SegmentAnimator =>
  (init, who) => {
    const matches = resolveMatches("larks_right_robins_left", init);

    const checked = new Set<string>();
    for (const id of who) {
      const themId = matches[id];
      const pairKey = [id, themId].sort().join(",");
      if (checked.has(pairKey)) continue;
      checked.add(pairKey);
      const angleDiff = Math.abs(
        ccwRadsBetween(init[id].facing, getDancerState(themId, init).facing),
      );
      if (angleDiff > PI / 4) {
        throw new Error(
          `${id} and ${themId} are not facing the same direction for turn_as_a_couple`,
        );
      }
    }

    return californiaTwirlSegments({
      id: instr.id,
      beats: instr.beats,
      type: "california_twirl",
    })(init, who);
  };
