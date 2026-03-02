import { produce } from "immer";
import { z } from "zod";

import {
  FoilRelationshipSchema,
  isLark,
  parseProtoId,
  resolveRelationship,
} from "../contraCore";
import {
  ccwRadsBetween,
  getDir,
  lerpFacing,
  revolve,
  TWO_PI,
} from "../geometry";
import { avgPos, lerpVectors } from "../utils";
import {
  buildProtoRecord,
  connectHands,
  disconnectHands,
  getDancerState,
} from "../worldState";
import {
  type Animator,
  CardinalDirectionSchema,
  getCardinalBearing,
  instructionBaseSchemaFields,
} from "./_base";

export const SwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("swing"),
  relationship: FoilRelationshipSchema,
  endFacing: CardinalDirectionSchema,
});
export type SwingInstruction = z.infer<typeof SwingInstructionSchema>;

const APPROACH_BEATS = 1;
const DISENGAGE_BEATS = 1.5;
const FINAL_SEPARATION = 1;
const ORBIT_RADIUS = 0.2;
const APPROX_BEATS_PER_SWING_ROTATION = 4;

export const swingAnimator =
  (instr: SwingInstruction): Animator =>
  (init, who) => {
    const approachBeats = APPROACH_BEATS;
    const swingBeats = instr.beats - APPROACH_BEATS - DISENGAGE_BEATS;
    const disengageBeats = DISENGAGE_BEATS;

    const pairs = buildProtoRecord((id) => {
      const me = getDancerState(id, init);
      const themId = resolveRelationship(id, instr.relationship);
      const them = getDancerState(themId, init);
      const center = avgPos(me.pos, them.pos);
      return { me, themId, them, center };
    });

    const plans = buildProtoRecord((id) => {
      const { me, center } = pairs[id];
      const finalFacing = getCardinalBearing(instr.endFacing, center); // using `center` instead of `me.pos` because in e.g. a give and take one dancer might be near the center

      const final = {
        facing: finalFacing,
        pos: center.add(
          finalFacing
            .multiply(FINAL_SEPARATION / 2)
            .rotateByDegrees(90 * (isLark(id) ? 1 : -1)),
        ),
      };

      const postApproach = {
        pos: center.add(
          getDir({ from: center, to: me.pos }).multiply(ORBIT_RADIUS),
        ),
        facing: getDir({ from: me.pos, to: center }),
      };

      const numSwingRadians =
        -2 *
          Math.PI *
          Math.floor(instr.beats / APPROX_BEATS_PER_SWING_ROTATION) +
        ccwRadsBetween(
          isLark(id) ? postApproach.facing : postApproach.facing.multiply(-1),
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
          for (const id of who) disconnectHands(draft, id);
          for (const id of who) {
            if (t < approachBeats) {
              const progressFrac = t / approachBeats;
              draft[id].pos = lerpVectors(
                init[id].pos,
                plans[id].postApproach.pos,
                progressFrac,
              );
              draft[id].facing = lerpFacing(
                init[id].facing,
                plans[id].postApproach.facing,
                progressFrac,
              );
            } else if (t < instr.beats - disengageBeats) {
              const progressFrac = (t - approachBeats) / swingBeats;
              draft[id].pos = revolve(plans[id].postApproach.pos, {
                around: plans[id].center,
                radians: plans[id].numSwingRadians * progressFrac,
              });
              draft[id].facing = plans[id].postApproach.facing.rotateByRadians(
                plans[id].numSwingRadians * progressFrac,
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
              draft[id].pos = lerpVectors(
                plans[id].postSwing.pos,
                plans[id].final.pos,
                progressFrac,
              );
              draft[id].facing = plans[id].postSwing.facing.rotateByRadians(
                ((ccwRadsBetween(
                  plans[id].postSwing.facing,
                  plans[id].final.facing,
                ) -
                  TWO_PI) %
                  TWO_PI) *
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
