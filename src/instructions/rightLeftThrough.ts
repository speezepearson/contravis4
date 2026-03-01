import { z } from 'zod';
import { instructionBaseSchemaFields } from './_base';

export const RightLeftThroughInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('right_left_through') });
export type RightLeftThroughInstruction = z.infer<typeof RightLeftThroughInstructionSchema>;
