import { z } from "zod";

import {
  CalledDirectionSchema,
  instructionBaseSchemaFields,
  resolveCalledDirection,
} from "./_base";
import { linearTo, type SegmentAnimator } from "./_segment";

export const BalanceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance"),
  did: CalledDirectionSchema,
});
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;

export const balanceSegments =
  (instr: BalanceInstruction): SegmentAnimator =>
  (init) => {
    const halfBeats = instr.beats / 2;
    // TODO: would be nice to be able to choose the distance based on how far it is to the person we're balancing with, *if* it's a person
    return [
      {
        dur: halfBeats,
        position: linearTo((id, segInit) => {
          const dir = resolveCalledDirection(id, instr.did, segInit);
          return segInit[id].pos.add(dir.multiply(0.2));
        }),
      },
      {
        dur: halfBeats,
        position: linearTo((id) => init[id].pos),
      },
    ];
  };
