import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { getDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { lerpVectors } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const BalanceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance"),
  cid: CalledIdentifierSchema,
});
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;

export function planBalance(
  instr: BalanceInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const halfBeats = instr.beats / 2;
  const start = dancer.pos;
  const other = dancer.resolveCalledIdentifier(instr.cid);
  if (!other)
    throw new SnazzyError([
      { dancerId: dancer.protoId },
      " has no ",
      { cid: instr.cid },
      " to balance with",
    ]);
  const dir = getDir({ from: start, to: other.pos });
  const approachTarget = start.add(dir.multiply(0.2));

  return [
    {
      dur: halfBeats,
      position: (frac) => lerpVectors(start, approachTarget, frac),
      interactedWith: () => [other.id],
    },
    {
      dur: halfBeats,
      position: (frac) => lerpVectors(approachTarget, start, frac),
    },
  ];
}

export function balanceAnimator(
  instr: BalanceInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planBalance(instr, dancer));
}
