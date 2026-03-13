import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { ellipsePosition, getDir, TWO_PI } from "../geometry";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const DoSiDoInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("do_si_do"),
  cid: CalledIdentifierSchema,
  rotations: z.number(),
});
export type DoSiDoInstruction = z.infer<typeof DoSiDoInstructionSchema>;

export function planDoSiDo(
  instr: DoSiDoInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const match = dancer.resolveMatch(instr.cid);
  const start = dancer.pos;
  const end = match.pos;
  const phi = TWO_PI * instr.rotations;

  return [
    {
      dur: instr.beats,
      position: (frac) => ellipsePosition(start, end, 0.25, phi * frac),
      facing: () => getDir({ from: start, to: end }),
      interactedWith: () => [match.id],
    },
  ];
}

export function doSiDoAnimator(
  instr: DoSiDoInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planDoSiDo(instr, dancer));
}
