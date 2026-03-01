import { z } from 'zod';
import { instructionBaseSchemaFields } from './_base';

export const SquareThroughInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('square_through') });
export type SquareThroughInstruction = z.infer<typeof SquareThroughInstructionSchema>;
