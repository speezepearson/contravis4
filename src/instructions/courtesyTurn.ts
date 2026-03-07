import { z } from "zod";

import { PI, revolve } from "../geometry";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields, resolveMatch } from "./_base";
import { hold, type InstructionAnimator, rotateFacingBy } from "./_segment";

export const CourtesyTurnInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("courtesy_turn"),
});
export type CourtesyTurnInstruction = z.infer<
  typeof CourtesyTurnInstructionSchema
>;

export const courtesyTurnSegments: InstructionAnimator<
  CourtesyTurnInstruction
> = (instr) => [
  {
    dur: instr.beats,
    position: (dancer, frac) => {
      const them = resolveMatch(dancer, "person_larks_right_robins_left", {
        roles: "different",
      });
      const myPos = dancer.pos;
      const theirPos = Dancer.get(them, dancer.state).pos;
      const center = myPos.add(theirPos).divide(2);
      return revolve(myPos, { around: center, radians: PI * frac });
    },
    facing: rotateFacingBy(() => PI),
    hands: (dancer) => {
      const them = resolveMatch(dancer, "person_larks_right_robins_left", {
        roles: "different",
      });
      return hold(["left", them, "left"], ["right", them, "right"]);
    },
  },
];
