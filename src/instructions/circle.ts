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

export const CircleInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("circle"),
  direction: HandSchema,
  nPlaces: z.number().positive(),
});
export type CircleInstruction = z.infer<typeof CircleInstructionSchema>;

export const circleSegments: InstructionAnimator<CircleInstruction> = (
  instr,
  init,
  who,
) => {
  const ringSegment = makeRingSegment(init);
  const ringState = getSegmentFrameAtFrac(ringSegment, init, who, 1);
  const rings = resolveRings(ringState);
  const centers = buildProtoRecord((id) => avgDancerPos(rings[id], ringState));

  // CW if direction=left, CCW if direction=right
  const orbitRadians =
    (instr.direction === "right" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

  return [
    ringSegment,
    {
      dur: instr.beats,
      position: (id, frac, segInit) => {
        const revolved = revolve(segInit[id].pos, {
          around: centers[id],
          radians: orbitRadians * frac,
        });
        const offset = revolved.subtract(centers[id]);
        const targetScale =
          Math.sqrt(2) / 2 / segInit[id].pos.subtract(centers[id]).length();
        return centers[id].add(offset.multiply(lerp(1, targetScale, frac)));
      },
      facing: rotateFacingBy(() => orbitRadians),
    },
  ];
};
