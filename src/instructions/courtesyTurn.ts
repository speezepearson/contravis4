import { z } from "zod";

import { PI, revolve } from "../geometry";
import { connectHands, getDancerState } from "../worldState";
import { instructionBaseSchemaFields, resolveMatches } from "./_base";
import { rotateFacingBy, type SegmentAnimator } from "./_segment";

export const CourtesyTurnInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("courtesy_turn"),
});
export type CourtesyTurnInstruction = z.infer<
  typeof CourtesyTurnInstructionSchema
>;

export const courtesyTurnSegments =
  (instr: CourtesyTurnInstruction): SegmentAnimator =>
  (init) => {
    // TODO: need `who`
    const matches = resolveMatches("larks_right_robins_left", init, {
      roles: "different",
    });

    return [
      {
        dur: instr.beats,
        position: (id, frac, segInit) => {
          const myPos = segInit[id].pos;
          const theirPos = getDancerState(matches[id], segInit).pos;
          const center = myPos.add(theirPos).divide(2);
          return revolve(myPos, { around: center, radians: PI * frac });
        },
        facing: rotateFacingBy(() => PI),
        hands: (id, _frac, _segInit, draft) => {
          connectHands(draft, id, "left", matches[id], "left");
          connectHands(draft, id, "right", matches[id], "right");
        },
      },
    ];
  };
