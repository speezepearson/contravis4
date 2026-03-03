import { z } from "zod";

import { parseProtoId, RoleSchema } from "../contraCore";
import { EAST, getDir, WEST } from "../geometry";
import { must } from "../utils";
import { buildProtoRecord, getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import {
  addPositionDrift,
  evaluateSegmentEnd,
  lerpFacingTo,
  linearTo,
  type SegmentAnimator,
} from "./_segment";
import { makeSwingSegments } from "./swing";

export const GiveAndTakeIntoSwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("give_and_take_into_swing"),
  cid: CalledIdentifierSchema,
  drawerRole: RoleSchema,
  endFacing: CardinalDirectionSchema,
});
export type GiveAndTakeIntoSwingInstruction = z.infer<
  typeof GiveAndTakeIntoSwingInstructionSchema
>;

export const giveAndTakeIntoSwingSegments =
  (instr: GiveAndTakeIntoSwingInstruction): SegmentAnimator =>
  (init, who) => {
    const approachDur = 1;
    const swingDur = instr.beats - approachDur;

    const plans = buildProtoRecord((id) => {
      const amDrawer = parseProtoId(id).role === instr.drawerRole;
      const themId = must(resolveCalledIdentifier(id, instr.cid, init));
      const drawer = getDancerState(amDrawer ? id : themId, init);
      const drawee = getDancerState(amDrawer ? themId : id, init);

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
              ? { from: drawer.pos, to: postApproachDraweePos }
              : { from: postApproachDraweePos, to: drawer.pos },
          ),
          com: postApproachCoM,
        },
        final: {
          com: finalCoM,
        },
      };
    });

    const approachSegment = {
      dur: approachDur,
      position: linearTo((id) => plans[id].postApproach.pos),
      facing: lerpFacingTo((id) => plans[id].postApproach.facing),
    };

    const postApproach = evaluateSegmentEnd(approachSegment, init, who);

    const swingSegments = makeSwingSegments(
      {
        id: instr.id,
        type: "swing",
        beats: swingDur,
        endFacing: instr.endFacing,
        cid: instr.cid,
      },
      postApproach,
      who,
    );

    const driftedSwingSegments = addPositionDrift(
      swingSegments,
      (id, globalFrac) =>
        plans[id].final.com
          .subtract(plans[id].postApproach.com)
          .multiply(globalFrac),
    );

    return [approachSegment, ...driftedSwingSegments];
  };
