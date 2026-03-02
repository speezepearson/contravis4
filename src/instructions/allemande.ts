import { z } from "zod";
import {
  RelationshipSchema,
  HandSchema,
  resolveRelationship,
} from "../contraCore";
import { chainAnimations, instructionBaseSchemaFields, type ContraAnimation, type InstructionAnimator } from "./_base";
import { buildProtoRecord, connectHands, getDancerState } from "../worldState";
import { produce } from "immer";
import { ellipsePosition, revolve } from "../geometry";

export const AllemandeInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("allemande"),
  relationship: RelationshipSchema,
  handedness: HandSchema,
  rotations: z.number(),
});
export type AllemandeInstruction = z.infer<typeof AllemandeInstructionSchema>;

const ALLEMANDE_RADIUS = 1 / 2;
const FRAC_ELLIPTICAL_ARC_TO_START = 1 / 4;

export const allemandeAnimator: InstructionAnimator<AllemandeInstruction> = (
  init,
  who,
  instr,
) => {
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const approachBeats = Math.min(1, instr.beats / 4);
  const circlingBeats = instr.beats - approachBeats;
  const numAllemandeRadians =
    (2 * Math.PI * instr.rotations - FRAC_ELLIPTICAL_ARC_TO_START) *
    rotationSign;

  const plans = buildProtoRecord((id) => {
    const them = resolveRelationship(id, instr.relationship);
    const myPos = getDancerState(id, init.protos).pos;
    const theirPos = getDancerState(them, init.protos).pos;
    const center = myPos.add(theirPos).divide(2);

    return {
      start: myPos,
      counterpartStart: theirPos,
      center,
    };
  });

  const approach: ContraAnimation = {
    dur: approachBeats,
    getFrame(t) {
      return produce(init, (draft) => {
        draft.beat += t;
        const progressFrac = t / approachBeats;
        for (const id of who) {
          const { start, counterpartStart } = plans[id];
          draft.protos[id].pos = ellipsePosition(
            start,
            counterpartStart,
            ALLEMANDE_RADIUS * rotationSign,
            FRAC_ELLIPTICAL_ARC_TO_START * progressFrac,
          );
        }
      });
    },
  };

  const postApproach = approach.getFrame(approachBeats);

  const circling: ContraAnimation = {
    dur: circlingBeats,
    getFrame(t) {
      return produce(postApproach, (draft) => {
        draft.beat += t;
        const progressFrac = t / circlingBeats;
        for (const id of who) {
          const {center} = plans[id];
          draft.protos[id].pos = revolve(postApproach.protos[id].pos, {
            around: center,
            radians: numAllemandeRadians * progressFrac,
          });
          draft.protos[id].facing = postApproach.protos[id].facing.rotateByRadians(
            numAllemandeRadians * progressFrac,
          );
          connectHands(draft, id, instr.handedness, instr.relationship, instr.handedness);
        }
      });
    },
  };

  return chainAnimations([
    approach,
    circling,
  ]);
};
