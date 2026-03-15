import { z } from "zod";

import {
  ALL_PROTO_IDS,
  parseProtoId,
  type ProtoId,
  RoleSchema,
} from "../contraCore";
import { getDir, lerpFacing } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { lerpVectors } from "../utils";
import { Dancer, getDancerSide, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import {
  animatePlans,
  evaluatePlansFinalState,
  type PlanGetter,
} from "./_plan";
import { buildSwingPlans } from "./swing";

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

// ── Plan-based API ──────────────────────────────────────────────────────

export function giveAndTakeIntoSwingAnimator(
  instr: GiveAndTakeIntoSwingInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const approachDur = 1;
  const swingDur = instr.beats - approachDur;
  const orig = (d: Dancer) => d.at(init);
  const getMatch = (d: Dancer) => orig(d).resolveMatch(instr.cid);

  // Validation
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

  // Build approach plans for all dancers
  const getApproachPlan: PlanGetter = (dancer: Dancer) => {
    const amDrawer = parseProtoId(dancer.protoId).role === instr.drawerRole;
    const drawer = amDrawer ? orig(dancer) : getMatch(dancer);
    const drawee = amDrawer ? getMatch(dancer) : orig(dancer);

    const postApproachDrawerPos = drawer.pos;
    const postApproachDraweePos = drawer.pos.add(drawee.pos).divide(2);
    const targetPos = amDrawer ? postApproachDrawerPos : postApproachDraweePos;
    const targetFacing = getDir(
      amDrawer
        ? { from: drawer.pos, to: postApproachDraweePos }
        : { from: postApproachDraweePos, to: drawer.pos },
    );

    const matchId = getMatch(dancer).id;
    return [
      {
        dur: approachDur,
        position: (frac) => lerpVectors(dancer.pos, targetPos, frac),
        facing: (frac) => lerpFacing(dancer.facing, targetFacing, frac),
        interactedWith: () => [matchId],
      },
    ];
  };

  // Evaluate post-approach state
  const postApproachState = evaluatePlansFinalState(init, who, getApproachPlan);

  // Build swing plans from post-approach state
  const swingPlans = buildSwingPlans(
    {
      id: instr.id,
      type: "swing" as const,
      beats: swingDur,
      cid: instr.cid, // TODO: this isn't right, we need to plumb the original `matches` into this somehow
      endFacing: instr.endFacing,
    },
    postApproachState,
    who,
  );

  // Combine per-dancer plans
  return animatePlans(init, who, (dancer) => {
    const approachSegs = getApproachPlan(dancer);
    const swingSegs = swingPlans(Dancer.get(dancer.protoId, postApproachState));
    return [...approachSegs, ...swingSegs];
  });
}
