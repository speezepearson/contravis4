import { z } from "zod";

import { getDir, TWO_PI } from "../geometry";
import { must } from "../utils";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
import { arc, type InstructionAnimator } from "./_segment";

export const DoSiDoInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("do_si_do"),
  cid: CalledIdentifierSchema,
  rotations: z.number(),
});
export type DoSiDoInstruction = z.infer<typeof DoSiDoInstructionSchema>;

export const doSiDoSegments: InstructionAnimator<DoSiDoInstruction> = (
  instr,
) => [
  {
    dur: instr.beats,
    position: arc(instr.cid, {
      semiMinor: 0.25,
      phi: TWO_PI * instr.rotations,
    }),
    facing: (dancer) => {
      const match = must(dancer.resolveCalledIdentifier(instr.cid), [
        { dancerId: dancer.id },
        "has no match to do si do with",
      ]);
      return getDir({ from: dancer.pos, to: match.pos });
    },
    interactedWith: (dancer) => [dancer.resolveMatch(instr.cid).id],
  },
];
