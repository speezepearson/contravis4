import { z } from 'zod';
import { instructionBaseSchemaFields, RelativeDirectionSchema } from './_base';

export const StepInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('step'), direction: RelativeDirectionSchema, distance: z.number(), facing: RelativeDirectionSchema, facingOffset: z.number() });
export type StepInstruction = z.infer<typeof StepInstructionSchema>;
