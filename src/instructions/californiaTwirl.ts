import { z } from "zod";

import { isLark, parseProtoId } from "../contraCore";
import { getDir, PI } from "../geometry";
import { Dancer } from "../worldState";
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
    position: arc("person_larks_right_robins_left", {
      semiMinor: 0.25,
      phi: PI,
    }),
    facing: lerpFacingTo(
      (id, segInit) => {
        // TODO: this loses the robin's rotation. We shouldn't be lerping facing, we should .rotateByRadians() a lerped value. Or add some kind of helper for it.
        const them = resolveMatch(
          Dancer.get(id, segInit),
          "person_larks_right_robins_left",
        );
        const myRole = parseProtoId(id).role;
        return getDir({
          from: segInit[id].pos,
          to: Dancer.get(them, segInit).pos,
        }).rotateByDegrees(90 * (myRole === "lark" ? -1 : 1));
      },
      {
        forceDir: (id) => (isLark(id) ? "cw" : "ccw"),
      },
    ),
    hands: (id, _frac, segInit) => {
      const them = resolveMatch(
        Dancer.get(id, segInit),
        "person_larks_right_robins_left",
      );
      return isLark(id)
        ? hold(["right", them, "left"])
        : hold(["left", them, "right"]);
    },
    interactedWith: (id, segInit) => [
      resolveMatch(Dancer.get(id, segInit), "person_larks_right_robins_left"),
    ],
  },
];
