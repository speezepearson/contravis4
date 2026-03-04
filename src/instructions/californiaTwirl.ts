import { z } from "zod";

import { isLark, parseProtoId } from "../contraCore";
import { getDir, PI } from "../geometry";
import { getDancerState } from "../worldState";
import { instructionBaseSchemaFields, resolveMatches } from "./_base";
import { arc, hold, lerpFacingTo, type SegmentAnimator } from "./_segment";

export const CaliforniaTwirlInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("california_twirl"),
});
export type CaliforniaTwirlInstruction = z.infer<
  typeof CaliforniaTwirlInstructionSchema
>;

export const californiaTwirlSegments =
  (instr: CaliforniaTwirlInstruction): SegmentAnimator =>
  (init) => {
    const matches = resolveMatches('larks_right_robins_left', init);
    return [
      {
        dur: instr.beats,
        position: arc('larks_right_robins_left', { semiMinor: 0.25, phi: PI }),
        facing: lerpFacingTo((id, segInit) => {
          // TODO: this loses the robin's rotation. We shouldn't be lerping facing, we should .rotateByRadians() a lerped value. Or add some kind of helper for it.
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
