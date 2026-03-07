import { z } from "zod";

import { HandSchema } from "../contraCore";
import { revolve, TWO_PI } from "../geometry";
import { lerp } from "../utils";
import { buildProtoRecord } from "../worldState";
import {
  avgDancerPos,
  instructionBaseSchemaFields,
  resolveRings,
} from "./_base";
import {
  getSegmentFrameAtFrac,
  hold,
  type InstructionAnimator,
  rotateFacingBy,
} from "./_segment";
import { makeRingSegment } from "./takeHandsInRings";

export const StarInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("star"),
  direction: HandSchema,
  nPlaces: z.number().positive(),
});
export type StarInstruction = z.infer<typeof StarInstructionSchema>;

export const starSegments: InstructionAnimator<StarInstruction> = (
  instr,
  init,
  who,
) => {
  const ringSegment = makeRingSegment(init);
  const ringState = getSegmentFrameAtFrac(ringSegment, init, who, 1);
  const rings = resolveRings(ringState);
  const centers = buildProtoRecord((id) => avgDancerPos(rings[id], ringState));

  const facingRotation = ((instr.direction === "right" ? 1 : -1) * Math.PI) / 2;

  const insideHand = instr.direction;

  // CW if direction=left, CCW if direction=right (same as circle)
  const orbitRadians =
    (instr.direction === "left" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

  return [
    ringSegment,
    // Star setup: rotate facing 90°, connect inside hands with opposite
    {
      dur: 0,
      facing: (dancer) => dancer.facing.rotateByRadians(facingRotation),
      hands: (dancer) =>
        hold([insideHand, rings[dancer.protoId][2], insideHand]),
    },
    // Orbit (same as circle)
    {
      dur: instr.beats,
      position: (dancer, frac) => {
        const id = dancer.protoId;
        const revolved = revolve(dancer.pos, {
          around: centers[id],
          radians: orbitRadians * frac,
        });
        const offset = revolved.subtract(centers[id]);
        const targetScale =
          Math.sqrt(2) / 2 / dancer.pos.subtract(centers[id]).length();
        return centers[id].add(offset.multiply(lerp(1, targetScale, frac)));
      },
      facing: rotateFacingBy(() => orbitRadians),
    },
  ];
};
