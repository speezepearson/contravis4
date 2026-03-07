import { z } from "zod";

import { isLark, parseProtoId } from "../contraCore";
import { getDir, PI } from "../geometry";
import { instructionBaseSchemaFields } from "./_base";
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
    position: arc("person_larks_right_robins_left", {
      semiMinor: 0.25,
      phi: PI,
    }),
    facing: lerpFacingTo(
      (dancer) => {
        // TODO: this loses the robin's rotation. We shouldn't be lerping facing, we should .rotateByRadians() a lerped value. Or add some kind of helper for it.
        const them = dancer.resolveMatch("person_larks_right_robins_left");
        const myRole = parseProtoId(dancer.protoId).role;
        return getDir({
          from: dancer.pos,
          to: them.pos,
        }).rotateByDegrees(90 * (myRole === "lark" ? -1 : 1));
      },
      {
        forceDir: (id) => (isLark(id) ? "cw" : "ccw"),
      },
    ),
    hands: (dancer) => {
      const them = dancer.resolveMatch("person_larks_right_robins_left");
      return isLark(dancer.protoId)
        ? hold(["right", them.id, "left"])
        : hold(["left", them.id, "right"]);
    },
    interactedWith: (dancer) => [
      dancer.resolveMatch("person_larks_right_robins_left").id,
    ],
  },
];
