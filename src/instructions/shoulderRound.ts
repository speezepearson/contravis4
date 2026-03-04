import { z } from "zod";

import { HandSchema, type ProtoId } from "../contraCore";
import { getDir, PI, TWO_PI } from "../geometry";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
} from "./_base";
import {
  arc,
  lerpFacingTo,
  orbit,
  rotateFacingBy,
  type Segment,
  type SegmentAnimator,
} from "./_segment";
import { approachBeatsForSpeedMatch } from "./allemande";

const SHOULDER_ROUND_RADIUS = 0.25;
const APPROACH_ELLIPSE_RADIANS = PI / 2;

export const ShoulderRoundInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("shoulder_round"),
  cid: CalledIdentifierSchema,
  handedness: HandSchema,
  rotations: z.number(),
});
export type ShoulderRoundInstruction = z.infer<
  typeof ShoulderRoundInstructionSchema
>;

export const shoulderRoundSegments = (
  instr: ShoulderRoundInstruction,
): SegmentAnimator => {
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numOrbitRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  return (init) => {
    const matches = resolveMatches(instr.cid, init);

    let totalDistance = 0;
    let count = 0;
    for (const [id, matchId] of Object.entries(matches)) {
      const me = getDancerState(id as ProtoId, init);
      const them = getDancerState(matchId, init);
      totalDistance += me.pos.subtract(them.pos).length();
      count++;
    }
    const avgDistance = totalDistance / count;
    const approachBeats = approachBeatsForSpeedMatch(
      avgDistance,
      instr.beats,
      numOrbitRadians,
    );
    const circlingBeats = instr.beats - approachBeats;

    return [
      {
        dur: approachBeats,
        position: arc(instr.cid, {
          semiMinor: -SHOULDER_ROUND_RADIUS * rotationSign,
          phi: APPROACH_ELLIPSE_RADIANS,
        }),
        facing: lerpFacingTo((id, segInit) => {
          return getDir({
            from: segInit[id].pos,
            to: getDancerState(matches[id], segInit).pos,
          });
        }),
      },
      {
        dur: circlingBeats,
        position: orbit(instr.cid, { radians: numOrbitRadians }),
        facing: rotateFacingBy(() => numOrbitRadians),
      },
    ] satisfies Segment[];
  };
};
