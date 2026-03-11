import { z } from "zod";

import { isLark, parseProtoId } from "../contraCore";
import { getDir, PI } from "../geometry";
import { instructionBaseSchemaFields, personInDir } from "./_base";
import {
  arc,
  hold,
  type InstructionAnimator,
  lerpFacingTo,
  type Segment,
} from "./_segment";

export const CaliforniaTwirlInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("california_twirl"),
});
export type CaliforniaTwirlInstruction = z.infer<
  typeof CaliforniaTwirlInstructionSchema
>;

export const californiaTwirlSegments: InstructionAnimator<
  CaliforniaTwirlInstruction
> = (instr): Segment[] => [
  {
    dur: instr.beats,
    position: arc(personInDir("larks_right_robins_left", "different"), {
      semiMinor: 0.25,
      phi: PI,
    }),
    facing: lerpFacingTo(
      (dancer) => {
        // TODO: this loses the robin's rotation. We shouldn't be lerping facing, we should .rotateByRadians() a lerped value. Or add some kind of helper for it.
        const them = dancer.resolveMatch(
          personInDir("larks_right_robins_left", "different"),
        );
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
      const them = dancer.resolveMatch(
        personInDir("larks_right_robins_left", "different"),
      );
      return isLark(dancer.protoId)
        ? hold(["right", them.id, "left"])
        : hold(["left", them.id, "right"]);
    },
    interactedWith: (dancer) => [
      dancer.resolveMatch(personInDir("larks_right_robins_left", "different"))
        .id,
    ],
  },
];
