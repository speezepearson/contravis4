import { z } from "zod";

import { isLark, parseProtoId } from "../contraCore";
import { getDir, PI } from "../geometry";
import { getDancerState } from "../worldState";
import { instructionBaseSchemaFields, resolveMatch } from "./_base";
import { arc, hold, type InstructionAnimator, lerpFacingTo } from "./_segment";

export const CaliforniaTwirlInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("california_twirl"),
});
export type CaliforniaTwirlInstruction = z.infer<
  typeof CaliforniaTwirlInstructionSchema
>;

export const californiaTwirlSegments: InstructionAnimator<
  CaliforniaTwirlInstruction
> = (instr) => [
  {
    dur: instr.beats,
    position: arc("larks_right_robins_left", { semiMinor: 0.25, phi: PI }),
    facing: lerpFacingTo(
      (id, segInit) => {
        // TODO: this loses the robin's rotation. We shouldn't be lerping facing, we should .rotateByRadians() a lerped value. Or add some kind of helper for it.
        const them = resolveMatch(id, "larks_right_robins_left", segInit);
        const myRole = parseProtoId(id).role;
        return getDir({
          from: segInit[id].pos,
          to: getDancerState(them, segInit).pos,
        }).rotateByDegrees(90 * (myRole === "lark" ? -1 : 1));
      },
      {
        forceDir: (id) => (isLark(id) ? "cw" : "ccw"),
      },
    ),
    hands: (id, _frac, segInit) => {
      const them = resolveMatch(id, "larks_right_robins_left", segInit);
      return isLark(id)
        ? hold(["right", them, "left"])
        : hold(["left", them, "right"]);
    },
  },
];
