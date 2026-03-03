import { z } from "zod";

import { type Hand } from "../contraCore";
import { assertNever, must } from "../utils";
import { connectHands, type DancerState, getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { type SegmentAnimator } from "./_segment";

export const TakeHandSchema = z.enum(["left", "right", "inside"]);
export type TakeHand = z.infer<typeof TakeHandSchema>;

/** Determine a dancer's inside hand (the hand closer to the target).
 *  Throws if the target is directly in front of or behind the dancer. */
export function resolveInsideHand(
  dancer: DancerState,
  target: DancerState,
): Hand {
  const delta = target.pos.subtract(dancer.pos);
  const cross = dancer.facing.x * delta.y - dancer.facing.y * delta.x;
  if (Math.abs(cross) < 1e-9) {
    throw new Error(
      "Cannot determine inside hand: target is neither to the left nor to the right",
    );
  }
  return cross < 0 ? "right" : "left";
}

export const TakeHandsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("take_hands"),
  beats: z.literal(0),
  cid: CalledIdentifierSchema,
  hand: TakeHandSchema,
});
export type TakeHandsInstruction = z.infer<typeof TakeHandsInstructionSchema>;

export const takeHandsSegments =
  (instr: TakeHandsInstruction): SegmentAnimator =>
  () => [
    {
      dur: 0,
      hands: (id, _frac, segInit, draft) => {
        const otherId = must(resolveCalledIdentifier(id, instr.cid, segInit));
        const other = getDancerState(otherId, segInit);
        switch (instr.hand) {
          case "left":
            connectHands(draft, id, "left", otherId, "left");
            break;
          case "right":
            connectHands(draft, id, "right", otherId, "right");
            break;
          case "inside": {
            const ourHand = resolveInsideHand(draft[id], other);
            connectHands(draft, id, ourHand, otherId, ourHand);
            break;
          }
          default:
            assertNever(instr.hand);
        }
      },
    },
  ];
