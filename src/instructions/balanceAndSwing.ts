import { z } from "zod";

import { connectHands } from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  instructionBaseSchemaFields,
  resolveMatches,
} from "./_base";
import {
  advanceState,
  type InstructionAnimator,
  makeImmediateSegment,
  type Segment,
} from "./_segment";
import { balanceSegments } from "./balance";
import { makeSwingSegments } from "./swing";

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
  const matches = resolveMatches(instr.cid, init);
  append([
    makeImmediateSegment(init, (pid, draft) => {
      connectHands(draft, pid, "left", matches[pid].id, "right");
      connectHands(draft, pid, "right", matches[pid].id, "left");
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
