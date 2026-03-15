import { z } from "zod";

import { type Hand, type ProtoId } from "../contraCore";
import { SnazzyError } from "../snazzyError";
import { assertNever, safeThreshold } from "../utils";
import { Dancer, type DancerHandPointer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

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

export function planTakeHands(
  instr: TakeHandsInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const match = dancer.resolveMatch(instr.cid);

  const hands: Partial<Record<Hand, DancerHandPointer>> = {};
  switch (instr.hand) {
    case "left":
      hands.left = { theirId: match.id, theirHand: "left" };
      break;
    case "right":
      hands.right = { theirId: match.id, theirHand: "right" };
      break;
    case "inside": {
      const ourHand = resolveInsideHand(dancer, match);
      if (!ourHand)
        throw new SnazzyError([
          { dancerId: dancer.id },
          " can't determine inside hand with ",
          { dancerId: match.id },
        ]);
      const theirHand = resolveInsideHand(match, dancer);
      if (!theirHand)
        throw new SnazzyError([
          { dancerId: match.id },
          " can't determine inside hand with ",
          { dancerId: dancer.id },
        ]);
      hands[ourHand] = { theirId: match.id, theirHand };
      break;
    }
    default:
      assertNever(instr.hand);
  }

  return [{ dur: 0, hands: () => hands }];
}

export function takeHandsAnimator(
  instr: TakeHandsInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planTakeHands(instr, dancer));
}
