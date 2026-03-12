import { z } from "zod";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { lerpVectors } from "../utils";
import { avgPos, Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  resolveRing,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator } from "./_segment";

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

export const balanceTheRingSegments: InstructionAnimator<
  BalanceTheRingInstruction
> = (instr, init, who) => {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`balanceTheRing instruction must target all dancers`);

  const anim = animatePlans(init, who, (d) => planBalanceTheRing(instr, d));
  return [
    {
      dur: instr.beats,
      position: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).pos,
      facing: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).facing,
      hands: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).hands,
      interactedWith: (dancer) => dancer.at(anim.getFrame(instr.beats)).recents,
    },
  ];
};

export function balanceTheRingAnimator(
  instr: BalanceTheRingInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planBalanceTheRing(instr, dancer));
}
