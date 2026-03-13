import { z } from "zod";

import { HandSchema, otherHand, type ProtoId } from "../contraCore";
import { TWO_PI } from "../geometry";
import { lerpVectors } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  labelId,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const RoryOMoreInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("rory_o_more"),
  direction: HandSchema,
});
export type RoryOMoreInstruction = z.infer<typeof RoryOMoreInstructionSchema>;

export function planRoryOMore(
  instr: RoryOMoreInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const cid =
    instr.direction === "left"
      ? labelId("person_in_left_hand")
      : labelId("person_in_right_hand");

  // CW for right, CCW for left
  const rotationRadians = instr.direction === "right" ? -TWO_PI : TWO_PI;

  const them = dancer.resolveMatch(cid);
  const startPos = dancer.pos;
  const targetPos = them.pos;
  const startFacing = dancer.facing;
  const reconnectHand = otherHand(instr.direction);

  return [
    {
      dur: instr.beats,
      position: (frac) => lerpVectors(startPos, targetPos, frac),
      facing: (frac) => startFacing.rotateByRadians(rotationRadians * frac),
      hands: () => ({}),
    },
    {
      dur: 0,
      hands: () => ({
        [reconnectHand]: {
          theirId: them.id,
          theirHand: reconnectHand,
        },
      }),
    },
  ];
}

export function roryOMoreAnimator(
  instr: RoryOMoreInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planRoryOMore(instr, dancer));
}
