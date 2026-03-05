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
    position: (id, frac, segInit) => {
      const them = resolveMatch(id, "larks_right_robins_left", segInit, {
        roles: "different",
      });
      const myPos = segInit[id].pos;
      const theirPos = Dancer.get(them, segInit).pos;
      const center = myPos.add(theirPos).divide(2);
      return revolve(myPos, { around: center, radians: PI * frac });
    },
    facing: rotateFacingBy(() => PI),
    hands: (id, _frac, segInit) => {
      const them = resolveMatch(id, "larks_right_robins_left", segInit, {
        roles: "different",
      });
      return hold(["left", them, "left"], ["right", them, "right"]);
    },
  },
];
