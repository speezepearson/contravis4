import { z } from "zod";

import { HandSchema } from "../contraCore";
import { revolve, TWO_PI } from "../geometry";
import { buildProtoRecord } from "../worldState";
import {
  avgDancerPos,
  instructionBaseSchemaFields,
  resolveRings,
} from "./_base";
import {
  evaluateSegmentEnd,
  rotateFacingBy,
  type SegmentAnimator,
} from "./_segment";
import { makeRingSegment } from "./takeHandsInRings";

export const CircleInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("circle"),
  direction: HandSchema,
  nPlaces: z.number().positive(),
});
export type CircleInstruction = z.infer<typeof CircleInstructionSchema>;

export const circleSegments =
  (instr: CircleInstruction): SegmentAnimator =>
  (init, who) => {
    const ringSegment = makeRingSegment(init);
    const ringState = evaluateSegmentEnd(ringSegment, init, who);
    const rings = resolveRings(ringState);
    const centers = buildProtoRecord((id) =>
      avgDancerPos(rings[id], ringState),
    );

    // CW if direction=left, CCW if direction=right
    const orbitRadians =
      (instr.direction === "right" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

    return [
      ringSegment,
      {
        dur: instr.beats,
        position: (id, frac, segInit) =>
          revolve(segInit[id].pos, {
            around: centers[id],
            radians: orbitRadians * frac,
          }),
        facing: rotateFacingBy(() => orbitRadians),
      },
    ];
  };
