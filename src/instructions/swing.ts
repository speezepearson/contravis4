import { z } from "zod";
import {
  FoilRelationshipSchema,
  parseProtoId,
  resolveRelationship,
} from "../contraCore";
import {
  instructionBaseSchemaFields,
  type InstructionAnimator,
  RelativeDirectionSchema,
  resolveRelativeDirection,
} from "./_base";
import { produce } from "immer";
import { getDancerState, buildProtoRecord, connectHands } from "../worldState";
import { lerpVectors } from "../utils";
import { ccwRadsBetween, getDir, lerpFacing, revolve } from "../geometry";

export const SwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("swing"),
  relationship: FoilRelationshipSchema,
  endFacing: RelativeDirectionSchema,
});
export type SwingInstruction = z.infer<typeof SwingInstructionSchema>;

const APPROACH_BEATS = 1;
const DISENGAGE_BEATS = 1.5;
const FINAL_SEPARATION = 1;
const ORBIT_RADIUS = 0.2;
const APPROX_BEATS_PER_SWING_ROTATION = 4;

export const swingAnimator: InstructionAnimator<SwingInstruction> = (
  init,
  who,
  instr,
) => {
  const approachBeats = APPROACH_BEATS;
  const swingBeats = instr.beats - APPROACH_BEATS - DISENGAGE_BEATS;
  const disengageBeats = DISENGAGE_BEATS;
  const plans = buildProtoRecord((id) => {
    const isLark = parseProtoId(id).role === "lark";
    const finalFacing = resolveRelativeDirection(
      instr.endFacing,
      id,
      init.protos,
    );

    const myPos = getDancerState(id, init.protos).pos;
    const theirPos = getDancerState(
      resolveRelationship(id, instr.relationship),
      init.protos,
    ).pos;
    const center = myPos.add(theirPos).divide(2);

    const final = {
      facing: finalFacing,
      pos: center.add(
        finalFacing
          .multiply(FINAL_SEPARATION / 2)
          .rotateByDegrees(90 * (isLark ? 1 : -1)),
      ),
    };

    const postApproach = {
      pos: center.add(
        getDir({ from: center, to: myPos }).multiply(ORBIT_RADIUS),
      ),
      facing: getDir({ from: myPos, to: center }),
    };

    const numSwingRadians =
      -2 * Math.PI * Math.floor(instr.beats / APPROX_BEATS_PER_SWING_ROTATION) +
      ccwRadsBetween(
        isLark ? postApproach.facing : postApproach.facing.multiply(-1),
        finalFacing,
      );

    const postSwing = {
      pos: revolve(postApproach.pos, {
        around: center,
        radians: numSwingRadians,
      }),
      facing: postApproach.facing.rotateByRadians(numSwingRadians),
    };

    return {
      final,
      center,
      postApproach,
      postSwing,
      numSwingRadians,
    };
  });

  return {
    dur: instr.beats,
    getFrame(t) {
      return produce(init, (draft) => {
        draft.beat += t;
        for (const id of who) {
          if (t < approachBeats) {
            const progressFrac = t / approachBeats;
            draft.protos[id].pos = lerpVectors(
              plans[id].postApproach.pos,
              plans[id].postSwing.pos,
              progressFrac,
            );
            draft.protos[id].facing = lerpFacing(
              init.protos[id].facing,
              plans[id].postApproach.facing,
              progressFrac,
            );
          } else if (t < instr.beats - disengageBeats) {
            const progressFrac = (t - approachBeats) / swingBeats;
            draft.protos[id].pos = revolve(plans[id].postApproach.pos, {
              around: plans[id].center,
              radians: plans[id].numSwingRadians * progressFrac,
            });
            draft.protos[id].facing = plans[
              id
            ].postApproach.facing.rotateByRadians(
              -plans[id].numSwingRadians * progressFrac,
            );
            const isLark = parseProtoId(id).role === "lark";
            connectHands(
              draft,
              id,
              isLark ? "right" : "left",
              instr.relationship,
              isLark ? "left" : "right",
            );
          } else {
            const progressFrac =
              (t - (instr.beats - disengageBeats)) / disengageBeats;
            draft.protos[id].pos = lerpVectors(
              plans[id].postSwing.pos,
              plans[id].final.pos,
              progressFrac,
            );
            draft.protos[id].facing = lerpFacing(
              plans[id].postSwing.facing,
              plans[id].final.facing,
              progressFrac,
            );
            const isLark = parseProtoId(id).role === "lark";
            connectHands(
              draft,
              id,
              isLark ? "right" : "left",
              instr.relationship,
              isLark ? "left" : "right",
            );
          }
        }
      });
    },
  };
};
