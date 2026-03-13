import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { TWO_PI } from "../geometry";
import { must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import {
  animatePlans,
  type DancerSegment,
  evaluatePlansFinalState,
} from "./_plan";
import {
  advanceState,
  type InstructionAnimator,
  type Segment,
} from "./_segment";
import { approachBeatsForSpeedMatch } from "./allemande";
import {
  APPROACH_ELLIPSE_RADIANS,
  planShoulderRound,
  shoulderRoundSegments,
} from "./shoulderRound";
import { buildSwingPlans, makeSwingSegments } from "./swing";

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

// ── Plan-based API ──────────────────────────────────────────────────────

export function meltdownSwingAnimator(
  instr: MeltdownSwingInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const { id } = instr;
  const swingBeats = instr.beats - SHOULDER_ROUND_BEATS;

  const shoulderRoundInstr = {
    id,
    type: "shoulder_round" as const,
    beats: SHOULDER_ROUND_BEATS,
    cid: instr.cid,
    handedness: "right" as const,
    rotations: 1.5,
  };

  // Compute shoulder round timing (mirrors shoulderRoundAnimator logic)
  const rotationSign = shoulderRoundInstr.handedness === "left" ? 1 : -1;
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
  const srPlansMap = new Map<ProtoId, DancerSegment[]>();
  for (const pid of who) {
    srPlansMap.set(
      pid,
      planShoulderRound(
        shoulderRoundInstr,
        Dancer.get(pid, init),
        approachBeats,
      ),
    );
  }

  // Evaluate intermediate state after shoulder round
  const postSrState = evaluatePlansFinalState(init, who, srPlansMap);

  // Build swing plans from post-shoulder-round state
  const swingInstr = {
    id,
    type: "swing" as const,
    beats: swingBeats,
    cid: instr.cid,
    endFacing: instr.endFacing,
  };
  const swingPlans = buildSwingPlans(swingInstr, postSrState, who);

  // Combine per-dancer plans
  return animatePlans(init, who, (dancer) => {
    const srSegs = must(srPlansMap.get(dancer.protoId));
    const swingSegs = must(swingPlans.get(dancer.protoId));
    return [...srSegs, ...swingSegs];
  });
}

// ── Legacy Segment[] API ────────────────────────────────────────────────

export const meltdownSwingSegments: InstructionAnimator<
  MeltdownSwingInstruction
> = (instr, init, who) => {
  const id = instr.id;
  const swingBeats = instr.beats - SHOULDER_ROUND_BEATS;

  let state = init;
  const allSegments: Segment[] = [];

  function append(segs: Segment[]) {
    allSegments.push(...segs);
    state = advanceState(segs, state, who);
  }

  // 1. Right shoulder round 1.5x
  append(
    shoulderRoundSegments(
      {
        id,
        type: "shoulder_round",
        beats: SHOULDER_ROUND_BEATS,
        cid: instr.cid,
        handedness: "right",
        rotations: 1.5,
      },
      state,
      who,
    ),
  );

  // 2. Swing
  append(
    makeSwingSegments(
      {
        id,
        type: "swing",
        beats: swingBeats,
        cid: instr.cid,
        endFacing: instr.endFacing,
      },
      state,
      who,
    ),
  );

  return allSegments;
};
