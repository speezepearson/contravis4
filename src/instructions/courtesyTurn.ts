import { z } from "zod";

import { type DancerId } from "../contraCore";
import { PI } from "../geometry";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields, perRoleId, personInDir } from "./_base";
import {
  hold,
  type InstructionAnimator,
  rotateFacingBy,
  type Segment,
} from "./_segment";

export const CourtesyTurnInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("courtesy_turn"),
});
export type CourtesyTurnInstruction = z.infer<
  typeof CourtesyTurnInstructionSchema
>;

const matchCid = perRoleId(
  personInDir("on_right", "different"),
  personInDir("on_left", "different"),
);

/** Resolve each dancer's courtesy turn partner from the given state. */
export function resolveCourtesyTurnPartners(
  init: Parameters<InstructionAnimator<unknown>>[1],
  who: Parameters<InstructionAnimator<unknown>>[2],
): Map<DancerId, DancerId> {
  const partnerOf = new Map<DancerId, DancerId>();
  for (const protoId of who) {
    const d = Dancer.get(protoId, init);
    partnerOf.set(d.id, d.resolveMatch(matchCid).id);
  }
  return partnerOf;
}

function getPartner(
  dancer: Dancer,
  partnerOf: Map<DancerId, DancerId>,
): Dancer {
  const themId = partnerOf.get(dancer.id);
  if (!themId) {
    throw new Error(`No courtesy turn partner pre-resolved for ${dancer.id}`);
  }
  return Dancer.get(themId, dancer.worldState);
}

export function courtesyTurnSegs(
  beats: number,
  partnerOf: Map<DancerId, DancerId>,
): Segment[] {
  const halfBeats = beats / 2;

  return [
    // Segment 1: Quarter-ellipse that normalizes distance to COURTESY_TURN_RADIUS from CoM.
    {
      dur: halfBeats,
      position: (dancer, frac) => {
        const them = getPartner(dancer, partnerOf);
        const center = dancer.pos.add(them.pos).divide(2);
        const offset = dancer.pos.subtract(center);
        const r = offset.length();
        const majorDir = offset.normalize();
        const minorDir = majorDir.rotateByRadians(PI / 2);
        const phi = (PI / 2) * frac;
        return center
          .add(majorDir.multiply(r * Math.cos(phi)))
          .add(minorDir.multiply(0.25 * Math.sin(phi)));
      },
      facing: rotateFacingBy(() => PI / 2),
      hands: (dancer) => {
        const them = getPartner(dancer, partnerOf);
        return hold(["left", them.id, "left"], ["right", them.id, "right"]);
      },
    },
    // Segment 2: Quarter-circle at COURTESY_TURN_RADIUS from CoM.
    // Facing rotates by PI.
    {
      dur: halfBeats,
      position: (dancer, frac) => {
        const them = getPartner(dancer, partnerOf);
        const center = dancer.pos.add(them.pos).divide(2);
        const offset = dancer.pos.subtract(center);
        const r = offset.length();
        const majorDir = offset.normalize();
        const minorDir = majorDir.rotateByRadians(PI / 2);
        const phi = (PI / 2) * frac;
        return center
          .add(majorDir.multiply(r * Math.cos(phi)))
          .add(minorDir.multiply(0.35 * Math.sin(phi)));
      },
      facing: rotateFacingBy(() => PI / 2),
      hands: (dancer) => {
        const them = getPartner(dancer, partnerOf);
        return hold(["left", them.id, "left"], ["right", them.id, "right"]);
      },
    },
  ];
}

export const courtesyTurnSegments: InstructionAnimator<
  CourtesyTurnInstruction
> = (instr, init, who): Segment[] => {
  const partnerOf = resolveCourtesyTurnPartners(init, who);
  return courtesyTurnSegs(instr.beats, partnerOf);
};
