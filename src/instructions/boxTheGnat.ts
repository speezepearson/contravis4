import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { ellipsePosition, getDir, lerpFacing, PI } from "../geometry";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const BoxTheGnatInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("box_the_gnat"),
  cid: CalledIdentifierSchema,
});
export type BoxTheGnatInstruction = z.infer<typeof BoxTheGnatInstructionSchema>;

export function planBoxTheGnat(
  instr: BoxTheGnatInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const match = dancer.resolveMatch(instr.cid);
  const start = dancer.pos;
  const end = match.pos;
  const initFacing = dancer.facing;
  const targetFacing = getDir({ from: end, to: start });

  return [
    {
      dur: instr.beats,
      position: (frac) => ellipsePosition(start, end, 0.25, PI * frac),
      facing: (frac) => lerpFacing(initFacing, targetFacing, frac),
      hands: () => ({
        left: undefined,
        right: { theirId: match.id, theirHand: "right" },
      }),
      interactedWith: () => [match.id],
    },
  ];
}

export function boxTheGnatAnimator(
  instr: BoxTheGnatInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planBoxTheGnat(instr, dancer));
}
