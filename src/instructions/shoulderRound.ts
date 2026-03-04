import { z } from "zod";

import { HandSchema } from "../contraCore";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
import type { SegmentAnimator } from "./_segment";
import { allemandeSegments } from "./allemande";

export const ShoulderRoundInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("shoulder_round"),
  cid: CalledIdentifierSchema,
  handedness: HandSchema,
  rotations: z.number(),
});
export type ShoulderRoundInstruction = z.infer<
  typeof ShoulderRoundInstructionSchema
>;

export const shoulderRoundSegments = (
  instr: ShoulderRoundInstruction,
): SegmentAnimator => {
  const allemandeAnimator = allemandeSegments({
    ...instr,
    type: "allemande",
  });
  return (init, who) => {
    const segments = allemandeAnimator(init, who);
    return segments.map(({ hands: _hands, ...rest }) => rest);
  };
};
