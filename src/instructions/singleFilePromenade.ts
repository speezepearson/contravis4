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
  type InstructionAnimator,
  rotateFacingBy,
} from "./_segment";
import { makeRingSegment } from "./takeHandsInRings";

export const SingleFilePromenadeInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("single_file_promenade"),
  direction: HandSchema,
  nPlaces: z.number().positive(),
});
export type SingleFilePromenadeInstruction = z.infer<
  typeof SingleFilePromenadeInstructionSchema
>;

export const singleFilePromenadeSegments: InstructionAnimator<
  SingleFilePromenadeInstruction
> = (instr, init, who) => {
  const ringSegment = makeRingSegment(init);
  const ringState = getSegmentFrameAtFrac(ringSegment, init, who, 1);
  const rings = resolveRings(ringState);
  const centers = buildProtoRecord((id) => avgDancerPos(rings[id], ringState));

  const facingRotation = ((instr.direction === "right" ? 1 : -1) * Math.PI) / 2;

  // CW if direction=left, CCW if direction=right (same as circle/star)
  const orbitRadians =
    (instr.direction === "left" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

  return [
    ringSegment,
    // Setup: rotate facing 90°, drop all hands
    {
      dur: 0,
      facing: (dancer) => dancer.facing.rotateByRadians(facingRotation),
      hands: () => ({}),
    },
    // Orbit (same as star/circle)
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
