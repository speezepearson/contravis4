import { produce } from "immer";
import { z } from "zod";

import {
  HandSchema,
  RelationshipSchema,
  resolveRelationship,
} from "../contraCore";
import {
  ellipsePosition,
  getDir,
  lerpFacing,
  PI,
  revolve,
  TWO_PI,
} from "../geometry";
import { connectHands, getDancerState } from "../worldState";
import {
  type Animator,
  chainAnimators,
  instructionBaseSchemaFields,
} from "./_base";

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

export const allemandeAnimator = (instr: AllemandeInstruction): Animator => {
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const approachBeats = Math.min(1, instr.beats / 4);
  const circlingBeats = instr.beats - approachBeats;
  const numAllemandeRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  return chainAnimators([
    (init, who) => ({
      dur: approachBeats,
      getFrame(t) {
        return produce(init, (draft) => {
          const progressFrac = t / approachBeats;
          for (const id of who) {
            const start = getDancerState(id, init).pos;
            const counterpartStart = getDancerState(
              resolveRelationship(id, instr.relationship),
              init,
            ).pos;
            draft[id].pos = ellipsePosition(
              start,
              counterpartStart,
              -ALLEMANDE_RADIUS * rotationSign,
              APPROACH_ELLIPSE_RADIANS * progressFrac,
            );
            draft[id].facing = lerpFacing(
              init[id].facing,
              getDir({ from: start, to: counterpartStart }),
              progressFrac,
            );
          }
          for (const id of who) {
            const me = getDancerState(id, init);
            const them = getDancerState(
              resolveRelationship(id, instr.relationship),
              init,
            );
            if (me.pos.subtract(them.pos).length() < 1) {
              connectHands(
                draft,
                id,
                instr.handedness,
                instr.relationship,
                instr.handedness,
              );
            }
          }
        });
      },
    }),
    (init, who) => ({
      dur: circlingBeats,
      getFrame(t) {
        return produce(init, (draft) => {
          const progressFrac = t / circlingBeats;
          for (const id of who) {
            const center = getDancerState(id, init)
              .pos.add(
                getDancerState(
                  resolveRelationship(id, instr.relationship),
                  init,
                ).pos,
              )
              .divide(2);
            draft[id].pos = revolve(draft[id].pos, {
              around: center,
              radians: numAllemandeRadians * progressFrac,
            });
            draft[id].facing = draft[id].facing.rotateByRadians(
              numAllemandeRadians * progressFrac,
            );
            connectHands(
              draft,
              id,
              instr.handedness,
              instr.relationship,
              instr.handedness,
            );
          }
        });
      },
    }),
  ]);
};
