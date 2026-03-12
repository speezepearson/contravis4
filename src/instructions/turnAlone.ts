import { z } from "zod";

import { isLark, type ProtoId } from "../contraCore";
import { PI } from "../geometry";
import { Dancer, type WorldState } from "../worldState";
import { type ContraAnimation, instructionBaseSchemaFields } from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator, rotateFacingBy } from "./_segment";

export const TurnAloneInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("turn_alone"),
});
export type TurnAloneInstruction = z.infer<typeof TurnAloneInstructionSchema>;

export function planTurnAlone(
  instr: TurnAloneInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const radians = isLark(dancer.protoId) ? -PI : PI;
  const startFacing = dancer.facing;
  return [
    {
      dur: instr.beats,
      facing: (frac) => startFacing.rotateByRadians(radians * frac),
    },
  ];
}

export const turnAloneSegments: InstructionAnimator<TurnAloneInstruction> = (
  instr,
) => [
  {
    dur: instr.beats,
    facing: rotateFacingBy((dancer) => (isLark(dancer.protoId) ? -PI : PI)),
  },
];

export function turnAloneAnimator(
  instr: TurnAloneInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planTurnAlone(instr, dancer));
}
