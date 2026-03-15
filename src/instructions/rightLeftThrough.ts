import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
} from "./_base";
import {
  animatePlans,
  evaluatePlansFinalState,
  type PlanGetter,
} from "./_plan";
import { planCourtesyTurn } from "./courtesyTurn";
import { planPullBy } from "./pullBy";

export const RightLeftThroughInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("right_left_through"),
});
export type RightLeftThroughInstruction = z.infer<
  typeof RightLeftThroughInstructionSchema
>;

// ── Plan-based API ──────────────────────────────────────────────────────

export function rightLeftThroughAnimator(
  instr: RightLeftThroughInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const { id } = instr;
  const pullByBeats = instr.beats / 2;
  const courtesyTurnBeats = instr.beats / 2;

  const pullByInstr = {
    id,
    beats: pullByBeats,
    type: "pull_by" as const,
    cid: personInDir("across", "different"),
    hand: "right" as const,
  };

  // Build pullBy plans for all dancers
  const getPullByPlan: PlanGetter = (dancer: Dancer) => {
    return planPullBy(pullByInstr, dancer);
  };

  // Evaluate intermediate state after pullBy
  const postPullByState = evaluatePlansFinalState(init, who, getPullByPlan);

  // Build combined plans: pullBy segments + courtesy turn segments
  return animatePlans(init, who, (dancer) => {
    const pullBySegs = getPullByPlan(dancer);
    const postPullByDancer = Dancer.get(dancer.protoId, postPullByState);
    const courtesyTurnSegs = planCourtesyTurn(
      { id, beats: courtesyTurnBeats, type: "courtesy_turn" },
      postPullByDancer,
    );
    return [...pullBySegs, ...courtesyTurnSegs];
  });
}
