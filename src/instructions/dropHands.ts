import { z } from "zod";

import { ALL_HANDS } from "../contraCore";
import { disconnectHands } from "../worldState";
import {
  type CalledIdentifier,
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
} from "./_base";
import { type InstructionAnimator, makeImmediateSegment } from "./_segment";

export const DropHandsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("drop_hands"),
  beats: z.literal(0),
  which: z.enum(["both", "left", "right", ...CalledIdentifierSchema.options]),
});
export type DropHandsInstruction = z.infer<typeof DropHandsInstructionSchema>;

export const dropHandsSegments: InstructionAnimator<DropHandsInstruction> = (
  instr,
  init,
) => {
  switch (instr.which) {
    case "left":
      return [
        {
          dur: 0,
          hands: (id) => ({ left: undefined, right: init[id].hands.right }),
        },
      ];
    case "right":
      return [
        {
          dur: 0,
          hands: (id) => ({ right: undefined, left: init[id].hands.left }),
        },
      ];
    case "both":
      return [{ dur: 0, hands: () => ({}) }];
    default: {
      instr.which satisfies CalledIdentifier;
      const matches = resolveMatches(instr.which, init);
      return [
        makeImmediateSegment(init, (id, draft) => {
          for (const hand of ALL_HANDS) {
            if (draft[id].hands[hand]?.theirId === matches[id]) {
              disconnectHands(draft, id, hand);
            }
          }
        }),
      ];
    }
  }
};
