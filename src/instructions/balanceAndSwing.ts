import { produce } from "immer";
import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { must } from "../utils";
import { connectHands, Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import {
  advanceState,
  type InstructionAnimator,
  makeImmediateSegment,
  type Segment,
} from "./_segment";
import { balanceSegments, planBalance } from "./balance";
import { buildSwingPlans, makeSwingSegments } from "./swing";

const BALANCE_BEATS = 4;

export const BalanceAndSwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance_and_swing"),
  cid: CalledIdentifierSchema,
  endFacing: CardinalDirectionSchema,
});
export type BalanceAndSwingInstruction = z.infer<
  typeof BalanceAndSwingInstructionSchema
>;

// ── Plan-based API ──────────────────────────────────────────────────────

export function balanceAndSwingAnimator(
  instr: BalanceAndSwingInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const { id } = instr;
  const swingBeats = instr.beats - BALANCE_BEATS;

  // Step 1: Compute state after taking hands with match
  const postHandsState = produce(init, (draft) => {
    for (const pid of who) {
      const match = Dancer.get(pid, init).resolveMatch(instr.cid);
      connectHands(draft, pid, "left", match.id, "right");
      connectHands(draft, pid, "right", match.id, "left");
    }
  });

  // Step 2: Build swing plans from post-hands state
  // (balance returns dancers to starting positions, so post-balance ≡ post-hands)
  const swingInstr = {
    id,
    type: "swing" as const,
    beats: swingBeats,
    cid: instr.cid,
    endFacing: instr.endFacing,
  };
  const swingPlans = buildSwingPlans(swingInstr, postHandsState, who);

  // Step 3: Combine per-dancer plans: take-hands → balance → swing
  const balanceInstr = {
    id,
    beats: BALANCE_BEATS,
    type: "balance" as const,
    cid: instr.cid,
  };

  return animatePlans(init, who, (dancer) => {
    const postHandsDancer = Dancer.get(dancer.protoId, postHandsState);
    const handsSeg: DancerSegment = {
      dur: 0,
      hands: () => postHandsState[dancer.protoId].hands,
    };
    const balanceSegs = planBalance(balanceInstr, postHandsDancer);
    const swingSegs = must(swingPlans.get(dancer.protoId));
    return [handsSeg, ...balanceSegs, ...swingSegs];
  });
}

// ── Legacy Segment[] API ────────────────────────────────────────────────

export const balanceAndSwingSegments: InstructionAnimator<
  BalanceAndSwingInstruction
> = (instr, init, who) => {
  const id = instr.id;
  const swingBeats = instr.beats - BALANCE_BEATS;

  let state = init;
  const allSegments: Segment[] = [];

  function append(segs: Segment[]) {
    allSegments.push(...segs);
    state = advanceState(segs, state, who);
  }

  // 1. Take left hand with cid's right
  append([
    makeImmediateSegment(init, (pid, draft) => {
      const match = Dancer.get(pid, init).resolveMatch(instr.cid);
      connectHands(draft, pid, "left", match.id, "right");
      connectHands(draft, pid, "right", match.id, "left");
    }),
  ]);

  // 2. Balance
  append(
    balanceSegments(
      { id, beats: BALANCE_BEATS, type: "balance", cid: instr.cid },
      state,
      who,
    ),
  );

  // 3. Swing
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
