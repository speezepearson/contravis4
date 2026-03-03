import { z } from "zod";

import { HandSchema } from "../contraCore";
import { TWO_PI } from "../geometry";
import { connectHands, getDancerState } from "../worldState";
import { instructionBaseSchemaFields, resolveMatches } from "./_base";
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
    const matches = resolveMatches(
      ({ left: "in left hand", right: "in right hand" } as const)[
        instr.direction
      ],
      init,
    );

    // CW for right, CCW for left
    const rotationRadians = instr.direction === "right" ? -TWO_PI : TWO_PI;

    return [
      {
        dur: 0,
        hands: disconnect(),
      },
      {
        dur: instr.beats,
        position: linearTo((id) => getDancerState(matches[id], init).pos),
        facing: rotateFacingBy(() => rotationRadians),
        hands: (id, frac, draft) => {
          if (frac < 1) return;
          const me = draft[id];
          const them = getDancerState(matches[id], draft);
          const myHand = resolveInsideHand(me, them);
          const theirHand = resolveInsideHand(them, me);
          connectHands(draft, id, myHand, matches[id], theirHand);
        },
      },
    ];
  };
