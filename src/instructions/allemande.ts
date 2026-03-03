import { z } from "zod";

import {
  HandSchema,
  RelationshipSchema,
  resolveRelationship,
} from "../contraCore";
import { getDir, PI, TWO_PI } from "../geometry";
import { connectHands, getDancerState } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
import {
  arc,
  lerpFacingTo,
  orbit,
  rotateFacingBy,
  type SegmentAnimator,
} from "./_segment";

export const AllemandeInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("allemande"),
  relationship: RelationshipSchema,
  handedness: HandSchema,
  rotations: z.number(),
});
export type AllemandeInstruction = z.infer<typeof AllemandeInstructionSchema>;

const ALLEMANDE_RADIUS = 0.25;
const APPROACH_ELLIPSE_RADIANS = PI / 2;

export const allemandeSegments = (
  instr: AllemandeInstruction,
): SegmentAnimator => {
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const approachBeats = Math.min(1, instr.beats / 4);
  const circlingBeats = instr.beats - approachBeats;
  const numAllemandeRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  return (init, who) => {
    const closeEnoughForHands = new Set<string>();
    for (const id of who) {
      const me = getDancerState(id, init);
      const them = getDancerState(
        resolveRelationship(id, instr.relationship),
        init,
      );
      if (me.pos.subtract(them.pos).length() < 1) {
        closeEnoughForHands.add(id);
      }
    }

    return [
      {
        dur: approachBeats,
        position: arc(instr.relationship, {
          semiMinor: -ALLEMANDE_RADIUS * rotationSign,
          phi: APPROACH_ELLIPSE_RADIANS,
        }),
        facing: lerpFacingTo((id, segInit) => {
          const them = resolveRelationship(id, instr.relationship);
          return getDir({
            from: segInit[id].pos,
            to: getDancerState(them, segInit).pos,
          });
        }),
        hands: (id, _frac, draft) => {
          if (closeEnoughForHands.has(id)) {
            connectHands(
              draft,
              id,
              instr.handedness,
              instr.relationship,
              instr.handedness,
            );
          }
        },
      },
      {
        dur: circlingBeats,
        position: orbit(instr.relationship, { radians: numAllemandeRadians }),
        facing: rotateFacingBy(() => numAllemandeRadians),
        hands: (id, _frac, draft) => {
          connectHands(
            draft,
            id,
            instr.handedness,
            instr.relationship,
            instr.handedness,
          );
        },
      },
    ];
  };
};
