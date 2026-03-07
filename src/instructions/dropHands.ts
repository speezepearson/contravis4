import { z } from "zod";

import { ALL_HANDS } from "../contraCore";
import { Dancer } from "../worldState";
import {
  type CalledIdentifier,
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
} from "./_base";
import { type InstructionAnimator } from "./_segment";

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
          hands: (dancer) => ({
            left: undefined,
            right: init[dancer.protoId].hands.right,
          }),
        },
      ];
    case "right":
      return [
        {
          dur: 0,
          hands: (dancer) => ({
            right: undefined,
            left: init[dancer.protoId].hands.left,
          }),
        },
      ];
    case "both":
      return [{ dur: 0, hands: () => ({}) }];
    default: {
      instr.which satisfies CalledIdentifier;
      return [
        {
          dur: 0,
          hands: (dancer) => {
            const match = dancer.resolveMatch(instr.which as CalledIdentifier);
            const result: Dancer["hands"] = {};
            for (const hand of ALL_HANDS) {
              const existing = dancer.hands[hand];
              if (existing && existing.theirId !== match.id) {
                result[hand] = existing;
              }
            }
            return result;
          },
        },
      ];
    }
  }
};
