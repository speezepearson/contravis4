import { z } from "zod";

import { BeatsSchema } from "../contraCore";
import { NORTH } from "../geometry";
import { instructionBaseSchemaFields } from "./_base";
import { type InstructionAnimator } from "./_segment";
import { theHallSegments } from "./downTheHall";

export const UpTheHallInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("up_the_hall"),
  beats: BeatsSchema.default(6),
  distance: z.number().default(1.5),
});
export type UpTheHallInstruction = z.infer<typeof UpTheHallInstructionSchema>;

export const upTheHallSegments: InstructionAnimator<UpTheHallInstruction> = (
  instr,
  init,
) => theHallSegments(NORTH, "up", instr, init);
