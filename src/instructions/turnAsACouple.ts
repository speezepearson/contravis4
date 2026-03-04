import { z } from "zod";

import { isLark, parseProtoId } from "../contraCore";
import { ccwRadsBetween, getDir, PI } from "../geometry";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
} from "./_base";
import { arc, hold, lerpFacingTo, type SegmentAnimator } from "./_segment";

export const TurnAsACoupleInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("turn_as_a_couple"),
  cid: CalledIdentifierSchema,
});
export type TurnAsACoupleInstruction = z.infer<
  typeof TurnAsACoupleInstructionSchema
>;

export const turnAsACoupleSegments =
  (instr: TurnAsACoupleInstruction): SegmentAnimator =>
  (init, who) => {
    const matches = resolveMatches(instr.cid, init);

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

    return [
      {
        dur: instr.beats,
        position: arc(instr.cid, { semiMinor: 0.25, phi: PI }),
        facing: lerpFacingTo((id, segInit) => {
          const myRole = parseProtoId(id).role;
          return getDir({
            from: segInit[id].pos,
            to: getDancerState(matches[id], segInit).pos,
          }).rotateByDegrees(90 * (myRole === "lark" ? 1 : -1));
        }),
        hands: (id) =>
          isLark(id)
            ? hold(["right", matches[id], "left"])
            : hold(["left", matches[id], "right"]),
      },
    ];
  };
