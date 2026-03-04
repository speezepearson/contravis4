import { z } from "zod";

import { ALL_PROTO_IDS } from "../contraCore";
import { buildProtoRecord } from "../worldState";
import {
  avgDancerPos,
  instructionBaseSchemaFields,
  resolveRings,
} from "./_base";
import { type InstructionAnimator, linearTo } from "./_segment";

export const BalanceTheRingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance_the_ring"),
});
export type BalanceTheRingInstruction = z.infer<
  typeof BalanceTheRingInstructionSchema
>;

export const balanceTheRingSegments: InstructionAnimator<
  BalanceTheRingInstruction
> = (instr, init, who) => {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`balanceTheRing instruction must target all dancers`);

  const rings = resolveRings(init);
  const centers = buildProtoRecord((id) => avgDancerPos(rings[id], init));

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
