import { z } from "zod";

import { ALL_PROTO_IDS, parseProtoId, RoleSchema } from "../contraCore";
import { getDir } from "../geometry";
import { must } from "../utils";
import { buildProtoRecord, Dancer, getDancerSide } from "../worldState";
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
    const me = Dancer.get(id, init);
    const them = Dancer.get(matches[id], init);
    if (getDancerSide(me) === getDancerSide(them)) {
      throw new Error(`dancers ${id} and ${matches[id]} are on the same side`);
    }
  }

  const plans = buildProtoRecord((id) => {
    const amDrawer = parseProtoId(id).role === instr.drawerRole;
    const drawer = Dancer.get(amDrawer ? id : matches[id], init);
    const drawee = Dancer.get(amDrawer ? matches[id] : id, init);

    const postApproachDrawerPos = drawer.pos;
    const postApproachDraweePos = drawer.pos.add(drawee.pos).divide(2);
    const postApproachCoM = postApproachDrawerPos
      .add(postApproachDraweePos)
      .divide(2);

    const finalCoM = drawer.pos.add(
      must(
        resolveCardinalDirection("across", drawer.pos),
        `[give and take into swing] dancer ${id} is too close to the center, can't tell which way they should end up facing`,
      )
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
    position: linearTo((dancer) => plans[dancer.protoId].postApproach.pos),
    facing: lerpFacingTo((dancer) => plans[dancer.protoId].postApproach.facing),
    interactedWith: (dancer: Dancer) => [matches[dancer.protoId]],
  };

  const postApproach = getSegmentFrameAtFrac(approachSegment, init, who, 1);

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
  );

  return [approachSegment, ...swingSegments];
};
