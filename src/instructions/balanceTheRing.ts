import { z } from "zod";

import { instructionBaseSchemaFields } from "./_base";
import { findRings, ringCenters } from "./_rings";
import { linearTo, type SegmentAnimator } from "./_segment";

export const BalanceTheRingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance_the_ring"),
});
export type BalanceTheRingInstruction = z.infer<
  typeof BalanceTheRingInstructionSchema
>;

export const balanceTheRingSegments =
  (instr: BalanceTheRingInstruction): SegmentAnimator =>
  (init) => {
    const rings = findRings(init);
    const centers = ringCenters(rings, init);

    const halfBeats = instr.beats / 2;

    return [
      {
        dur: halfBeats,
        position: linearTo((id) => init[id].pos.add(centers[id]).divide(2)),
      },
      {
        dur: halfBeats,
        position: linearTo((id) => init[id].pos),
      },
    ];
  };
