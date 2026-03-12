import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
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
import { courtesyTurnSegments, planCourtesyTurn } from "./courtesyTurn";
import { planPullBy, pullBySegments } from "./pullBy";

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
  const pullByPlansMap = new Map<ProtoId, DancerSegment[]>();
  for (const pid of who) {
    pullByPlansMap.set(pid, planPullBy(pullByInstr, Dancer.get(pid, init)));
  }

  // Evaluate intermediate state after pullBy
  const postPullByState = evaluatePlansFinalState(init, who, pullByPlansMap);

  // Build combined plans: pullBy segments + courtesy turn segments
  return animatePlans(init, who, (dancer) => {
    const pullBySegs = must(pullByPlansMap.get(dancer.protoId));
    const postPullByDancer = Dancer.get(dancer.protoId, postPullByState);
    const courtesyTurnSegs = planCourtesyTurn(
      { id, beats: courtesyTurnBeats, type: "courtesy_turn" },
      postPullByDancer,
    );
    return [...pullBySegs, ...courtesyTurnSegs];
  });
}

// ── Legacy Segment[] API ────────────────────────────────────────────────

export const rightLeftThroughSegments: InstructionAnimator<
  RightLeftThroughInstruction
> = (instr, init, who) => {
  const { id } = instr;
  const pullByBeats = instr.beats / 2;
  const courtesyTurnBeats = instr.beats / 2;

  let state = init;
  const allSegments: Segment[] = [];

  // TODO: this `append` business is kinda inelegant. Wouldn't it be nice to be able to just `return [...pullBySegments(...), ...courtesyTurnSegments(...)]`?
  function append(segs: Segment[]) {
    allSegments.push(...segs);
    state = advanceState(segs, state, who);
  }

  // 1. Pull by right with person across
  append(
    pullBySegments(
      {
        id,
        beats: pullByBeats,
        type: "pull_by",
        cid: personInDir("across", "different"),
        hand: "right",
      },
      state,
      who,
    ),
  );

  // 2. Courtesy turn
  append(
    courtesyTurnSegments(
      { id, beats: courtesyTurnBeats, type: "courtesy_turn" },
      state,
      who,
    ),
  );

  return allSegments;
};
