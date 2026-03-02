import { produce } from "immer";
import { z } from "zod";

import {
  FoilRelationshipSchema,
  parseProtoId,
  resolveRelationship,
  RoleSchema,
} from "../contraCore";
import { EAST, getDir, lerpFacing, WEST } from "../geometry";
import { lerpVectors } from "../utils";
import { buildProtoRecord, getDancerState } from "../worldState";
import {
  type Animator,
  CardinalDirectionSchema,
  chainAnimations,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { swingAnimator } from "./swing";

export const GiveAndTakeIntoSwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("give_and_take_into_swing"),
  relationship: FoilRelationshipSchema,
  drawerRole: RoleSchema,
  endFacing: CardinalDirectionSchema,
});
export type GiveAndTakeIntoSwingInstruction = z.infer<
  typeof GiveAndTakeIntoSwingInstructionSchema
>;

export const giveAndTakeIntoSwingAnimator =
  (instr: GiveAndTakeIntoSwingInstruction): Animator =>
  (init, who) => {
    const approachDur = 1;
    const swingDur = instr.beats - approachDur;

    const plans = buildProtoRecord((id) => {
      const amDrawer = parseProtoId(id).role === instr.drawerRole;
      const me = getDancerState(id, init);
      const themId = resolveRelationship(id, instr.relationship);
      const [drawerId, draweeId] = amDrawer ? [id, themId] : [themId, id];
      const drawer = getDancerState(drawerId, init);
      const drawee = getDancerState(draweeId, init);

      const postApproachDrawerPos = drawer.pos;
      const postApproachDraweePos = drawer.pos.add(drawee.pos).divide(2);
      const postApproachCoM = postApproachDrawerPos
        .add(postApproachDraweePos)
        .divide(2);

      const finalCoM = drawer.pos.add(
        (drawer.pos.x < 0 ? EAST : WEST)
          .multiply(0.5)
          .rotateByDegrees(90 * (instr.drawerRole === "robin" ? 1 : -1)),
      );

      return {
        amDrawer,
        postApproach: {
          pos: amDrawer ? postApproachDrawerPos : postApproachDraweePos,
          facing: getDir(
            amDrawer
              ? { from: me.pos, to: postApproachDraweePos }
              : { from: postApproachDraweePos, to: drawer.pos },
          ),
          com: postApproachCoM,
        },
        final: {
          com: finalCoM,
        },
      };
    });

    const approach: ContraAnimation = {
      dur: approachDur,
      getFrame(t) {
        return produce(init, (draft) => {
          const progressFrac = t / approachDur;
          for (const id of who) {
            if (parseProtoId(id).role === instr.drawerRole) continue;
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
          }
        });
      },
    };

    const postApproach = approach.getFrame(approachDur);

    const naiveSwing: ContraAnimation = swingAnimator({
      id: instr.id,
      type: "swing",
      beats: swingDur,
      endFacing: instr.endFacing,
      relationship: instr.relationship,
    })(postApproach, who);

    return chainAnimations([
      approach,
      {
        dur: swingDur,
        getFrame(t) {
          return produce(naiveSwing.getFrame(t), (draft) => {
            const progressFrac = t / swingDur;
            for (const id of who) {
              const drift = plans[id].final.com
                .subtract(plans[id].postApproach.com)
                .multiply(progressFrac);
              draft[id].pos = draft[id].pos.add(drift);
            }
          });
        },
      },
    ]);
  };
