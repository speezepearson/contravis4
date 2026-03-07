import { z } from "zod";

import { getDir } from "../geometry";
import { Dancer } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
  resolveMatch,
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
      position: linearTo((dancer) => {
        const otherId = resolveCalledIdentifier(
          dancer.id,
          instr.cid,
          dancer.state,
        );
        if (!otherId)
          throw new Error(
            `${dancer.protoId} has no ${instr.cid} to balance with`,
          );
        const dir = getDir({
          from: dancer.pos,
          to: Dancer.get(otherId, dancer.state).pos,
        });
        return dancer.pos.add(dir.multiply(0.2));
      }),
      interactedWith: (dancer) => [resolveMatch(dancer, instr.cid)],
    },
    {
      dur: halfBeats,
      position: linearTo((dancer) => init[dancer.protoId].pos),
    },
  ];
};
