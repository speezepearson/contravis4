import { z } from "zod";

import { HandSchema } from "../contraCore";
import { PI } from "../geometry";
import { must } from "../utils";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { arc, disconnect, type SegmentAnimator } from "./_segment";

export const PassByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pass_by"),
  cid: CalledIdentifierSchema,
  hand: HandSchema,
});
export type PassByInstruction = z.infer<typeof PassByInstructionSchema>;

export const passBySegments =
  (instr: PassByInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      position: arc(instr.cid, { semiMinor: 0.25, phi: PI }),
      facing: (id, _frac, segInit) => {
        const them = must(resolveCalledIdentifier(id, instr.cid, segInit));
        return getDancerState(them, segInit)
          .pos.subtract(segInit[id].pos)
          .normalize();
      },
      hands: disconnect(),
    },
  ];
