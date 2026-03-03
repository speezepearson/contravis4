import { z } from "zod";

import { ALL_HANDS } from "../contraCore";
import { disconnectHands } from "../worldState";
import {
  type CalledIdentifier,
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
} from "./_base";
import { disconnect, type SegmentAnimator } from "./_segment";

export const DropHandsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("drop_hands"),
  beats: z.literal(0),
  which: z.enum(["both", "left", "right", ...CalledIdentifierSchema.options]),
});
export type DropHandsInstruction = z.infer<typeof DropHandsInstructionSchema>;

export const dropHandsSegments =
  (instr: DropHandsInstruction): SegmentAnimator =>
  (init) => {
    switch (instr.which) {
      case "left":
        return [{ dur: 0, hands: disconnect("left") }];
      case "right":
        return [{ dur: 0, hands: disconnect("right") }];
      case "both":
        return [{ dur: 0, hands: disconnect() }];
      default: {
        instr.which satisfies CalledIdentifier;
        const matches = resolveMatches(instr.which, init);
        return [
          {
            dur: 0,
            hands: (id, _frac, draft) => {
              for (const hand of ALL_HANDS) {
                if (draft[id].hands.get(hand)?.theirId === matches[id]) {
                  disconnectHands(draft, id, hand);
                }
              }
            },
          },
        ];
      }
    }
  };
