import { z } from "zod";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { ccwRadsBetween, getDir, TWO_PI } from "../geometry";
import { lerpVectors, must } from "../utils";
import { avgPos, Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  resolveRing,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator } from "./_segment";

export const PetronellaInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("petronella"),
});
export type PetronellaInstruction = z.infer<typeof PetronellaInstructionSchema>;

export function planPetronella(
  instr: PetronellaInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const { theirId } = must(dancer.hands["right"]);
  const targetPos = Dancer.get(theirId, dancer.worldState).pos;
  const targetFacing = getDir({
    from: targetPos,
    to: avgPos(...resolveRing(dancer)),
  });
  // Always rotate CW: if ccwRadsBetween gives positive, subtract 2PI
  const ccwAngle = ccwRadsBetween(dancer.facing, targetFacing);
  const cwAngle = ccwAngle > 0 ? ccwAngle - TWO_PI : ccwAngle;

  const startPos = dancer.pos;
  const startFacing = dancer.facing;

  return [
    {
      dur: instr.beats,
      position: (frac) => lerpVectors(startPos, targetPos, frac),
      facing: (frac) => startFacing.rotateByRadians(cwAngle * frac),
      hands: () => ({}),
    },
  ];
}

export const petronellaSegments: InstructionAnimator<PetronellaInstruction> = (
  instr,
  init,
  who,
) => {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`petronella instruction must target all dancers`);

  const anim = animatePlans(init, who, (d) => planPetronella(instr, d));
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

export function petronellaAnimator(
  instr: PetronellaInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planPetronella(instr, dancer));
}
