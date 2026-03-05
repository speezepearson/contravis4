import { z } from "zod";

import { ALL_PROTO_IDS, parseProtoId, RoleSchema } from "../contraCore";
import { getDir } from "../geometry";
import { assertNever, getSide } from "../utils";
import { buildProtoRecord, getDancerSide, getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
  resolveMatches,
} from "./_base";
import {
  getSegmentFrameAtFrac,
  type InstructionAnimator,
  lerpFacingTo,
  linearTo,
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

export const giveAndTakeIntoSwingSegments: InstructionAnimator<
  GiveAndTakeIntoSwingInstruction
> = (instr, init, who) => {
  const approachDur = 1;
  const swingDur = instr.beats - approachDur;
  const matches = resolveMatches(instr.cid, init, { roles: "different" });
  for (const id of ALL_PROTO_IDS) {
    const me = getDancerState(id, init);
    const them = getDancerState(matches[id], init);
    if (getDancerSide(me) === getDancerSide(them)) {
      throw new Error(`dancers ${id} and ${matches[id]} are on the same side`);
    }
  }

  const plans = buildProtoRecord((id) => {
    const amDrawer = parseProtoId(id).role === instr.drawerRole;
    const drawer = getDancerState(amDrawer ? id : matches[id], init);
    const drawee = getDancerState(amDrawer ? matches[id] : id, init);

    const postApproachDrawerPos = drawer.pos;
    const postApproachDraweePos = drawer.pos.add(drawee.pos).divide(2);
    const postApproachCoM = postApproachDrawerPos
      .add(postApproachDraweePos)
      .divide(2);

    const finalCoM = drawer.pos.add(
      resolveCardinalDirection("across", drawer.pos)
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

  const postApproach = getSegmentFrameAtFrac(approachSegment, init, who, 1);

  const preferDriftOnWest = (() => {
    if (instr.endFacing !== "across") return undefined;
    if (who.size !== 4)
      throw new Error(
        `giveAndTakeIntoSwing ending facing across must target all dancers for subtle reasons`,
      );
    switch (instr.drawerRole) {
      case "lark":
        return getSide(plans.up_lark_0.final.com) === "west" ? "up" : "down";
      case "robin":
        return getSide(plans.up_robin_0.final.com) === "west" ? "up" : "down";
      default:
        assertNever(instr.drawerRole);
    }
  })();

  const swingSegments = makeSwingSegments(
    {
      id: instr.id,
      type: "swing",
      beats: swingDur,
      endFacing: instr.endFacing,
      cid: instr.cid, // TODO: this isn't right, we need to plumb the original `matches` into this somehow
    },
    postApproach,
    who,
    { preferDriftOnWest },
  );

  return [approachSegment, ...swingSegments];
};
