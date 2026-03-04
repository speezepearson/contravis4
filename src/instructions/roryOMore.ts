import { z } from "zod";

import { HandSchema, otherHand } from "../contraCore";
import { TWO_PI } from "../geometry";
import { getDancerState } from "../worldState";
import { instructionBaseSchemaFields, resolveMatches } from "./_base";
import {
  hold,
  linearTo,
  rotateFacingBy,
  type SegmentAnimator,
} from "./_segment";

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
        dur: instr.beats,
        position: linearTo((id) => getDancerState(matches[id], init).pos),
        facing: rotateFacingBy(() => rotationRadians),
        hands: () => ({}),
      },
      {
        dur: 0,
        hands: (id) =>
          hold([
            otherHand(instr.direction),
            matches[id],
            otherHand(instr.direction),
          ]),
      },
    ];
  };
