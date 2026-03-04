import { z } from "zod";

import { PI, revolve } from "../geometry";
import { getDancerState } from "../worldState";
import { instructionBaseSchemaFields, resolveMatch } from "./_base";
import { hold, rotateFacingBy, type SegmentAnimator } from "./_segment";

export const CourtesyTurnInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("courtesy_turn"),
});
export type CourtesyTurnInstruction = z.infer<
  typeof CourtesyTurnInstructionSchema
>;

export const courtesyTurnSegments =
  (instr: CourtesyTurnInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      position: (id, frac, segInit) => {
        const them = resolveMatch(id, "larks_right_robins_left", segInit, {
          roles: "different",
        });
        const myPos = segInit[id].pos;
        const theirPos = getDancerState(them, segInit).pos;
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
