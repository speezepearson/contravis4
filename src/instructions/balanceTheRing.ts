import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { lerpVectors } from "../utils";
import { avgPos, Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  resolveRing,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const BalanceTheRingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance_the_ring"),
});
export type BalanceTheRingInstruction = z.infer<
  typeof BalanceTheRingInstructionSchema
>;

export function planBalanceTheRing(
  instr: BalanceTheRingInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const halfBeats = instr.beats / 2;
  const start = dancer.pos;

  const ring = resolveRing(dancer);
  const center = avgPos(...ring);
  const approachTarget = start.add(center).divide(2);

  const others = ring.slice(1).map((d) => d.id);

  return [
    {
      dur: halfBeats,
      position: (frac) => lerpVectors(start, approachTarget, frac),
      interactedWith: () => others,
    },
    {
      dur: halfBeats,
      position: (frac) => lerpVectors(approachTarget, start, frac),
    },
  ];
}

export function balanceTheRingAnimator(
  instr: BalanceTheRingInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planBalanceTheRing(instr, dancer));
}
