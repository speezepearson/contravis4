import { z } from "zod";

import { type DancerId, HandSchema } from "../contraCore";
import { revolve, TWO_PI } from "../geometry";
import { must } from "../utils";
import { buildProtoRecord, connectHands } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
import { findRings, ringCenters } from "./_rings";
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
  rotations: z.number(),
});
export type CircleInstruction = z.infer<typeof CircleInstructionSchema>;

export const circleSegments =
  (instr: CircleInstruction): SegmentAnimator =>
  (init, who) => {
    const ringSegment = makeRingSegment(init);
    const ringState = evaluateSegmentEnd(ringSegment, init, who);
    const rings = findRings(ringState);
    const centers = ringCenters(rings, ringState);

    // CW if direction=left, CCW if direction=right
    const orbitRadians =
      (instr.direction === "right" ? 1 : -1) * TWO_PI * instr.rotations;

    // Pre-capture hand connections for the orbit segment
    const handConns = buildProtoRecord((id) => ({
      right: must(ringState[id].hands.get("right")),
      left: must(ringState[id].hands.get("left")),
    }));

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
        hands: (id, _frac, draft) => {
          const { right, left } = handConns[id];
          connectHands(
            draft,
            id,
            "right",
            right.theirId as DancerId,
            right.theirHand,
          );
          connectHands(
            draft,
            id,
            "left",
            left.theirId as DancerId,
            left.theirHand,
          );
        },
      },
    ];
  };
