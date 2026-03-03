import { z } from "zod";

import { ALL_HANDS } from "../contraCore";
import { must } from "../utils";
import { disconnectHands } from "../worldState";
import {
  type CalledIdentifier,
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { type SegmentAnimator } from "./_segment";

export const DropHandsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("drop_hands"),
  beats: z.literal(0),
  which: z.enum(["both", "left", "right", ...CalledIdentifierSchema.options]),
});
export type DropHandsInstruction = z.infer<typeof DropHandsInstructionSchema>;

export const dropHandsSegments =
  (instr: DropHandsInstruction): SegmentAnimator =>
  () => [
    {
      dur: 0,
      hands: (id, _frac, draft) => {
        switch (instr.which) {
          case "left":
            disconnectHands(draft, id, "left");
            break;
          case "right":
            disconnectHands(draft, id, "right");
            break;
          case "both":
            disconnectHands(draft, id);
            break;
          default: {
            instr.which satisfies CalledIdentifier;
            const theirId = must(
              resolveCalledIdentifier(id, instr.which, draft),
            );
            for (const hand of ALL_HANDS) {
              if (draft[id].hands.get(hand)?.theirId === theirId) {
                disconnectHands(draft, id, hand);
              }
            }
            break;
          }
        }
      },
    },
  ];
