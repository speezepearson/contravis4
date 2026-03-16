import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { TWO_PI } from "../geometry";
import { Dancer, type WorldState } from "../worldState";
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
import { approachBeatsForSpeedMatch } from "./allemande";
import { APPROACH_ELLIPSE_RADIANS, planShoulderRound } from "./shoulderRound";
import { buildSwingPlans } from "./swing";

const SHOULDER_ROUND_BEATS = 8;

export const MeltdownSwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("meltdown_swing"),
  cid: CalledIdentifierSchema,
  endFacing: CardinalDirectionSchema,
});
export type MeltdownSwingInstruction = z.infer<
  typeof MeltdownSwingInstructionSchema
>;

export function meltdownSwingAnimator(
  instr: MeltdownSwingInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const swingBeats = instr.beats - SHOULDER_ROUND_BEATS;

  const shoulderRoundInstr = {
    type: "shoulder_round" as const,
    beats: SHOULDER_ROUND_BEATS,
    cid: instr.cid,
    handedness: "right" as const,
    rotations: 1.5,
  };

  // Compute shoulder round timing (mirrors shoulderRoundAnimator logic)
  const rotationSign = -1; // right shoulder round = CW
  const numAllemandeRadians =
    (TWO_PI * shoulderRoundInstr.rotations - APPROACH_ELLIPSE_RADIANS) *
    rotationSign;

  let totalDistance = 0;
  let count = 0;
  for (const pid of who) {
    const dancer = Dancer.get(pid, init);
    const match = dancer.resolveMatch(shoulderRoundInstr.cid);
    totalDistance += dancer.pos.subtract(match.pos).length();
    count++;
  }
  const avgDistance = totalDistance / count;
  const approachBeats = approachBeatsForSpeedMatch(
    avgDistance,
    shoulderRoundInstr.beats,
    numAllemandeRadians,
  );

  // Build shoulder round plans
  const getSrPlan: PlanGetter = (dancer) =>
    planShoulderRound(shoulderRoundInstr, dancer, approachBeats);

  // Evaluate intermediate state after shoulder round
  const postSrState = evaluatePlansFinalState(init, who, getSrPlan);

  // Build swing plans from post-shoulder-round state
  const swingInstr = {
    type: "swing" as const,
    beats: swingBeats,
    cid: instr.cid,
    endFacing: instr.endFacing,
  };
  const swingPlans = buildSwingPlans(swingInstr, postSrState, who);

  // Combine per-dancer plans
  return animatePlans(init, who, (dancer) => {
    const srSegs = getSrPlan(dancer);
    const swingSegs = swingPlans(Dancer.get(dancer.protoId, postSrState));
    return [...srSegs, ...swingSegs];
  });
}
