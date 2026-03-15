import { z } from "zod";

import { type Hand, type ProtoId } from "../contraCore";
import { type DancerHandPointer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { planBalance } from "./balance";
import { buildSwingPlans } from "./swing";

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

export function balanceAndSwingAnimator(
  instr: BalanceAndSwingInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const { id } = instr;
  const swingBeats = instr.beats - BALANCE_BEATS;

  // Build swing plans from init state
  // (positions and facings are unchanged by hand-taking; balance returns to start)
  const swingInstr = {
    id,
    type: "swing" as const,
    beats: swingBeats,
    cid: instr.cid,
    endFacing: instr.endFacing,
  };
  const swingPlans = buildSwingPlans(swingInstr, init, who);

  const balanceInstr = {
    id,
    beats: BALANCE_BEATS,
    type: "balance" as const,
    cid: instr.cid,
  };

  // Combine per-dancer plans: take-hands → balance → swing
  return animatePlans(init, who, (dancer) => {
    const match = dancer.resolveMatch(instr.cid);
    const hands: Partial<Record<Hand, DancerHandPointer>> = {
      left: { theirId: match.id, theirHand: "right" },
      right: { theirId: match.id, theirHand: "left" },
    };
    const handsSeg: DancerSegment = { dur: 0, hands: () => hands };
    const balanceSegs = planBalance(balanceInstr, dancer);
    const swingSegs = swingPlans(dancer);
    return [handsSeg, ...balanceSegs, ...swingSegs];
  });
}
