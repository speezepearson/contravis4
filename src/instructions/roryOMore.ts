import { z } from "zod";

import { HandSchema } from "../contraCore";
import { TWO_PI } from "../geometry";
import { buildProtoRecord, connectHands, getDancerState } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
import {
  disconnect,
  linearTo,
  rotateFacingBy,
  type SegmentAnimator,
} from "./_segment";
import { resolveInsideHand } from "./takeHands";

export const RoryOMoreInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("rory_o_more"),
  direction: HandSchema,
});
export type RoryOMoreInstruction = z.infer<typeof RoryOMoreInstructionSchema>;

export const roryOMoreSegments =
  (instr: RoryOMoreInstruction): SegmentAnimator =>
  (init) => {
    const partners = buildProtoRecord((id) => {
      const holding = init[id].hands.get(instr.direction);
      if (!holding) {
        throw new Error(`${id} has no one in their ${instr.direction} hand`);
      }
      return holding.theirId;
    });

    // CW for right, CCW for left
    const rotationRadians = instr.direction === "right" ? -TWO_PI : TWO_PI;

    return [
      {
        dur: 0,
        hands: disconnect(),
      },
      {
        dur: instr.beats,
        position: linearTo((id) => getDancerState(partners[id], init).pos),
        facing: rotateFacingBy(() => rotationRadians),
      },
      {
        dur: 0,
        hands: (id, _frac, draft) => {
          const partnerId = partners[id];
          const me = draft[id];
          const them = getDancerState(partnerId, draft);
          const myHand = resolveInsideHand(me, them);
          const theirHand = resolveInsideHand(them, me);
          connectHands(draft, id, myHand, partnerId, theirHand);
        },
      },
    ];
  };
