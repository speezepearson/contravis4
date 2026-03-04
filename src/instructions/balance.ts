import { z } from "zod";

import { getDir } from "../geometry";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { type InstructionAnimator, linearTo } from "./_segment";

export const BalanceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance"),
  cid: CalledIdentifierSchema,
});
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;

export const balanceSegments: InstructionAnimator<BalanceInstruction> = (
  instr,
  init,
) => {
  const halfBeats = instr.beats / 2;
  // TODO: would be nice to be able to choose the distance based on how far it is to the person we're balancing with, *if* it's a person
  return [
    {
      dur: halfBeats,
      position: linearTo((id, segInit) => {
        const otherId = resolveCalledIdentifier(id, instr.cid, segInit);
        if (!otherId)
          throw new Error(`${id} has no ${instr.cid} to balance with`);
        const dir = getDir({
          from: segInit[id].pos,
          to: getDancerState(otherId, segInit).pos,
        });
        return segInit[id].pos.add(dir.multiply(0.2));
      }),
    },
    {
      dur: halfBeats,
      position: linearTo((id) => init[id].pos),
    },
  ];
};
