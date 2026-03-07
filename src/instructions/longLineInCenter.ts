import { Vector } from "vecti";
import { z } from "zod";

import { getRole, RoleSchema } from "../contraCore";
import { must } from "../utils";
import { instructionBaseSchemaFields, resolveCardinalDirection } from "./_base";
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
      position: (dancer, frac) => {
        if (getRole(dancer.protoId) !== instr.role) return dancer.pos;
        const target = new Vector(0, dancer.pos.y);
        return dancer.pos.add(target.subtract(dancer.pos).multiply(frac));
      },
      facing: lerpFacingTo((dancer) => {
        if (getRole(dancer.protoId) !== instr.role) return dancer.facing;
        return must(
          resolveCardinalDirection("across", dancer.pos),
          `[long line in center] dancer ${dancer.protoId} is too close to the center, can't tell which way they should move`,
        );
      }),
      hands: () => ({}),
    },
    {
      dur: 0,
      hands: (dancer) => {
        if (getRole(dancer.protoId) !== instr.role) return {};
        return hold(
          ["left", dancer.resolveMatch("person_on_left").id, "left"],
          ["right", dancer.resolveMatch("person_on_right").id, "right"],
        );
      },
    },
  ];
};
