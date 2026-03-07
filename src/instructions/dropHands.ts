import { z } from "zod";

import { ALL_HANDS } from "../contraCore";
import { Dancer } from "../worldState";
import {
  type CalledIdentifier,
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatch,
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
      return [
        {
          dur: 0,
          hands: (id, _frac, segInit) => {
            const matchId = resolveMatch(
              Dancer.get(id, segInit),
              instr.which as CalledIdentifier,
            );
            const result: (typeof segInit)[typeof id]["hands"] = {};
            for (const hand of ALL_HANDS) {
              const existing = segInit[id].hands[hand];
              if (existing && existing.theirId !== matchId) {
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
