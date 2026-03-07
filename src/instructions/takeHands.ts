import { z } from "zod";

import { type Hand } from "../contraCore";
import { SnazzyError } from "../snazzyError";
import { assertNever, safeThreshold } from "../utils";
import { connectHands, Dancer } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
} from "./_base";
import { type InstructionAnimator, makeImmediateSegment } from "./_segment";

export const TakeHandSchema = z.enum(["left", "right", "inside"]);
export type TakeHand = z.infer<typeof TakeHandSchema>;

/** Determine a dancer's inside hand (the hand closer to the target).
 *  Throws if the target is directly in front of or behind the dancer. */
export function resolveInsideHand(
  dancer: Dancer,
  target: Dancer,
): Hand | undefined {
  const delta = target.pos.subtract(dancer.pos);
  const cross = dancer.facing.x * delta.y - dancer.facing.y * delta.x;
  return safeThreshold(cross, { neg: "right", pos: "left" });
}

export const TakeHandsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("take_hands"),
  beats: z.literal(0),
  cid: CalledIdentifierSchema,
  hand: TakeHandSchema,
});
export type TakeHandsInstruction = z.infer<typeof TakeHandsInstructionSchema>;

export const takeHandsSegments: InstructionAnimator<TakeHandsInstruction> = (
  instr,
  init,
) => {
  const matches = resolveMatches(instr.cid, init);
  return [
    makeImmediateSegment(init, (id, draft) => {
      const other = matches[id];
      switch (instr.hand) {
        case "left":
          connectHands(draft, id, "left", other.id, "left");
          break;
        case "right":
          connectHands(draft, id, "right", other.id, "right");
          break;
        case "inside": {
          const ourHand = resolveInsideHand(draft[id], other);
          if (!ourHand)
            throw new SnazzyError([
              { dancerId: id },
              " can't determine inside hand with ",
              { dancerId: other.id },
            ]);
          const theirHand = resolveInsideHand(other, draft[id]);
          if (!theirHand)
            throw new SnazzyError([
              { dancerId: other.id },
              " can't determine inside hand with ",
              { dancerId: id },
            ]);
          connectHands(draft, id, ourHand, other.id, theirHand);
          break;
        }
        default:
          assertNever(instr.hand);
      }
    }),
  ];
};
