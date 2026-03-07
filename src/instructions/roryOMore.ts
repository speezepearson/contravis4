import { z } from "zod";

import { HandSchema, otherHand } from "../contraCore";
import { TWO_PI } from "../geometry";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields, resolveMatch } from "./_base";
import {
  hold,
  type InstructionAnimator,
  linearTo,
  rotateFacingBy,
} from "./_segment";

export const RoryOMoreInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("rory_o_more"),
  direction: HandSchema,
});
export type RoryOMoreInstruction = z.infer<typeof RoryOMoreInstructionSchema>;

export const roryOMoreSegments: InstructionAnimator<RoryOMoreInstruction> = (
  instr,
  init,
) => {
  const cid = (
    { left: "person_in_left_hand", right: "person_in_right_hand" } as const
  )[instr.direction];

  // CW for right, CCW for left
  const rotationRadians = instr.direction === "right" ? -TWO_PI : TWO_PI;

  return [
    {
      dur: instr.beats,
      position: linearTo((id, segInit) => {
        const them = resolveMatch(Dancer.get(id, segInit), cid);
        return Dancer.get(them, segInit).pos;
      }),
      facing: rotateFacingBy(() => rotationRadians),
      hands: () => ({}),
    },
    {
      dur: 0,
      // Resolve against init (not segInit) because the first segment drops hands
      hands: (id) => {
        const them = resolveMatch(Dancer.get(id, init), cid);
        return hold([
          otherHand(instr.direction),
          them,
          otherHand(instr.direction),
        ]);
      },
    },
  ];
};
