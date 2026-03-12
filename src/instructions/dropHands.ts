import { z } from "zod";

import { ALL_HANDS, type ProtoId } from "../contraCore";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator } from "./_segment";

export const DropHandsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("drop_hands"),
  beats: z.literal(0),
  which: z.union([z.enum(["both", "left", "right"]), CalledIdentifierSchema]),
});
export type DropHandsInstruction = z.infer<typeof DropHandsInstructionSchema>;

export function planDropHands(
  instr: DropHandsInstruction,
  dancer: Dancer,
): DancerSegment[] {
  switch (instr.which) {
    case "left":
      return [
        {
          dur: 0,
          hands: () => ({
            left: undefined,
            right: dancer.hands.right,
          }),
        },
      ];
    case "right":
      return [
        {
          dur: 0,
          hands: () => ({
            right: undefined,
            left: dancer.hands.left,
          }),
        },
      ];
    case "both":
      return [{ dur: 0, hands: () => ({}) }];
    default: {
      const which = instr.which;
      const match = dancer.resolveMatch(which);
      const result: Dancer["hands"] = {};
      for (const hand of ALL_HANDS) {
        const existing = dancer.hands[hand];
        if (existing && existing.theirId !== match.id) {
          result[hand] = existing;
        }
      }
      return [{ dur: 0, hands: () => result }];
    }
  }
}

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
      const which = instr.which;
      return [
        {
          dur: 0,
          hands: (dancer) => {
            const match = dancer.resolveMatch(which);
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

export function dropHandsAnimator(
  instr: DropHandsInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planDropHands(instr, dancer));
}
