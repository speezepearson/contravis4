import { z } from "zod";

import { HandSchema, type ProtoId } from "../contraCore";
import { ellipsePosition, getDir, PI } from "../geometry";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const PassByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pass_by"),
  cid: CalledIdentifierSchema,
  hand: HandSchema,
});
export type PassByInstruction = z.infer<typeof PassByInstructionSchema>;

export function planPassBy(
  instr: PassByInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const match = dancer.resolveMatch(instr.cid);
  const start = dancer.pos;
  const end = match.pos;
  const semiMinor = 0.25 * { left: -1, right: 1 }[instr.hand];

  return [
    {
      dur: instr.beats,
      position: (frac) => ellipsePosition(start, end, semiMinor, PI * frac),
      facing: () => getDir({ from: start, to: end }),
      hands: () => ({}),
    },
  ];
}

export function passByAnimator(
  instr: PassByInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planPassBy(instr, dancer));
}
