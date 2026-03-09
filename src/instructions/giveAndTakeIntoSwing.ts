import { z } from "zod";

import { ALL_PROTO_IDS, parseProtoId, RoleSchema } from "../contraCore";
import { getDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { must } from "../utils";
import { Dancer, getDancerSide } from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
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
  const orig = (d: Dancer) => d.at(init);
  const getMatch = (d: Dancer) =>
    orig(d).resolveMatch(instr.cid, { roles: "different" });

  for (const id of ALL_PROTO_IDS) {
    const me = Dancer.get(id, init);
    const them = getMatch(me);
    if (getDancerSide(me) === getDancerSide(them)) {
      throw new SnazzyError([
        "dancers ",
        { dancerId: id },
        " and ",
        { dancerId: them.id },
        " are on the same side",
      ]);
    }
  }

  const getPlan = (d: Dancer) => {
    const amDrawer = parseProtoId(d.protoId).role === instr.drawerRole;
    const drawer = amDrawer ? orig(d) : getMatch(d);
    const drawee = amDrawer ? getMatch(d) : orig(d);

    const postApproachDrawerPos = drawer.pos;
    const postApproachDraweePos = drawer.pos.add(drawee.pos).divide(2);
    const postApproachCoM = postApproachDrawerPos
      .add(postApproachDraweePos)
      .divide(2);

    const finalCoM = drawer.pos.add(
      must(resolveCardinalDirection("across", drawer.pos), [
        { dancerId: d.id },
        "too close to center, not sure which way to face",
      ])
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
  };

  const approachSegment = {
    dur: approachDur,
    position: linearTo((dancer) => getPlan(dancer).postApproach.pos),
    facing: lerpFacingTo((dancer) => getPlan(dancer).postApproach.facing),
    interactedWith: (dancer: Dancer) => [getMatch(dancer).id],
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
