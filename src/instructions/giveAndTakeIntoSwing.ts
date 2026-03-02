import { z } from "zod";
import {
  FoilRelationshipSchema,
  parseProtoId,
  resolveRelationship,
  RoleSchema,
} from "../contraCore";
import {
  chainAnimations,
  instructionBaseSchemaFields,
  RelativeDirectionSchema,
  type ContraAnimation,
  type InstructionAnimator,
} from "./_base";
import { produce } from "immer";
import { EAST, getDir, lerpFacing, WEST } from "../geometry";
import { lerpVectors } from "../utils";
import { buildProtoRecord, getDancerState } from "../worldState";
import { swingAnimator } from "./swing";

export const GiveAndTakeIntoSwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("give_and_take_into_swing"),
  relationship: FoilRelationshipSchema,
  drawerRole: RoleSchema,
  endFacing: RelativeDirectionSchema,
});
export type GiveAndTakeIntoSwingInstruction = z.infer<
  typeof GiveAndTakeIntoSwingInstructionSchema
>;

export const giveAndTakeIntoSwingAnimator: InstructionAnimator<
  GiveAndTakeIntoSwingInstruction
> = (init, who, instr) => {
  const approachDur = 1;
  const swingDur = instr.beats - approachDur;

  const plans = buildProtoRecord((id) => {
    const amDrawer = parseProtoId(id).role === instr.drawerRole;
    const me = getDancerState(id, init.protos);
    const themId = resolveRelationship(id, instr.relationship);
    const [drawerId, draweeId] = amDrawer ? [id, themId] : [themId, id];
    const drawer = getDancerState(drawerId, init.protos);
    const drawee = getDancerState(draweeId, init.protos);

    const postApproachDrawerPos = drawer.pos;
    const postApproachDraweePos = drawer.pos.add(drawee.pos).divide(2);
    const postApproachCoM = postApproachDrawerPos
      .add(postApproachDraweePos)
      .divide(2);

    const finalCoM = drawer.pos.add(
      (drawer.pos.x < 0 ? EAST : WEST).multiply(0.5).rotateByDegrees(
        90 * (instr.drawerRole === "robin" ? 1 : -1),
      ),
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
        draft.beat += t;
        const progressFrac = t / approachDur;
        for (const id of who) {
          if (parseProtoId(id).role === instr.drawerRole) continue;
          draft.protos[id].pos = lerpVectors(
            init.protos[id].pos,
            plans[id].postApproach.pos,
            progressFrac,
          );
          draft.protos[id].facing = lerpFacing(
            init.protos[id].facing,
            plans[id].postApproach.facing,
            progressFrac,
          );
        }
      });
    },
  };

  const postApproach = approach.getFrame(approachDur);

  const naiveSwing: ContraAnimation = swingAnimator(postApproach, who, {
    id: instr.id,
    type: "swing",
    beats: swingDur,
    endFacing: instr.endFacing,
    relationship: instr.relationship,
  });

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
            draft.protos[id].pos = draft.protos[id].pos.add(drift);
          }
        });
      },
    },
  ]);
};
