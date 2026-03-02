import { z } from "zod";
import {
  RelationshipSchema,
  resolveRelationship,
  type Hand,
} from "../contraCore";
import { instructionBaseSchemaFields, type InstructionAnimator } from "./_base";
import { type DancerState, connectHands, getDancerState } from "../worldState";
import { assertNever } from "../utils";
import { produce } from "immer";

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
  relationship: RelationshipSchema,
  hand: TakeHandSchema,
});
export type TakeHandsInstruction = z.infer<typeof TakeHandsInstructionSchema>;

export const takeHandsAnimator: InstructionAnimator<TakeHandsInstruction> = (
  init,
  who,
  instr,
) => {
  return {
    dur: instr.beats,
    getFrame(t) {
      return produce(init, (draft) => {
        draft.beat += t;
        for (const id of who) {
          switch (instr.hand) {
            case "left":
              connectHands(draft, id, "left", instr.relationship, "right");
              break;
            case "right":
              connectHands(draft, id, "right", instr.relationship, "left");
              break;
            case "inside": {
              const them = getDancerState(
                resolveRelationship(id, instr.relationship),
                draft.protos,
              );
              const ourHand = resolveInsideHand(draft.protos[id], them);
              connectHands(draft, id, ourHand, instr.relationship, ourHand);
              break;
            }
            default:
              assertNever(instr.hand);
          }
        }
      });
    },
  };
};
