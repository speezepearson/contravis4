import { z } from "zod";

import { ALL_PROTO_IDS } from "../contraCore";
import { avgPos } from "../worldState";
import { instructionBaseSchemaFields, resolveRing } from "./_base";
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

  const halfBeats = instr.beats / 2;

  return [
    {
      dur: halfBeats,
      position: linearTo((dancer) => {
        const ring = resolveRing(dancer);
        const center = avgPos(...ring);
        return dancer.pos.add(center).divide(2);
      }),
      interactedWith: (dancer) =>
        resolveRing(dancer)
          .slice(1)
          .map((d) => d.id),
    },
    {
      dur: halfBeats,
      position: linearTo((dancer) => init[dancer.protoId].pos),
    },
  ];
};
