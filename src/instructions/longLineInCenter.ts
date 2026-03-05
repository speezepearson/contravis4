import { Vector } from "vecti";
import { z } from "zod";

import { getRole, RoleSchema } from "../contraCore";
import {
  instructionBaseSchemaFields,
  resolveCardinalDirection,
  resolveMatch,
} from "./_base";
import { hold, type InstructionAnimator, lerpFacingTo } from "./_segment";

export const LongLineInCenterInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("long_line_in_center"),
  role: RoleSchema,
});
export type LongLineInCenterInstruction = z.infer<
  typeof LongLineInCenterInstructionSchema
>;

export const longLineInCenterSegments: InstructionAnimator<
  LongLineInCenterInstruction
> = (instr) => {
  return [
    {
      dur: instr.beats,
      position: (id, frac, segInit) => {
        if (getRole(id) !== instr.role) return segInit[id].pos;
        const target = new Vector(0, segInit[id].pos.y);
        return segInit[id].pos.add(
          target.subtract(segInit[id].pos).multiply(frac),
        );
      },
      facing: lerpFacingTo((id, segInit) => {
        if (getRole(id) !== instr.role) return segInit[id].facing;
        return resolveCardinalDirection("across", segInit[id].pos);
      }),
      hands: () => ({}),
    },
    {
      dur: 0,
      hands: (id, _frac, segInit) => {
        if (getRole(id) !== instr.role) return {};
        return hold(
          ["left", resolveMatch(id, "on_left", segInit), "left"],
          ["right", resolveMatch(id, "on_right", segInit), "right"],
        );
      },
    },
  ];
};
