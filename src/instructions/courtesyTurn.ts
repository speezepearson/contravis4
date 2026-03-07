import { z } from "zod";

import { PI, revolve } from "../geometry";
import { instructionBaseSchemaFields } from "./_base";
import { hold, type InstructionAnimator, rotateFacingBy, type Segment } from "./_segment";

export const CourtesyTurnInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("courtesy_turn"),
});
export type CourtesyTurnInstruction = z.infer<
  typeof CourtesyTurnInstructionSchema
>;

export const courtesyTurnSegments: InstructionAnimator<
  CourtesyTurnInstruction
> = (instr): Segment[] => [
  {
    dur: instr.beats,
    position: (dancer, frac) => {
      const them = dancer.resolveMatch("person_larks_right_robins_left", {
        roles: "different",
      });
      const myPos = dancer.pos;
      const center = myPos.add(them.pos).divide(2);
      return revolve(myPos, { around: center, radians: PI * frac });
    },
    facing: rotateFacingBy(() => PI),
    hands: (dancer) => {
      const them = dancer.resolveMatch("person_larks_right_robins_left", {
        roles: "different",
      });
      return hold(["left", them.id, "left"], ["right", them.id, "right"]);
    },
  },
];
