import { z } from 'zod';
import { HandSchema } from '../contraCore';
import { instructionBaseSchemaFields } from './_base';

export const CircleInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('circle'), direction: HandSchema, rotations: z.number() });
export type CircleInstruction = z.infer<typeof CircleInstructionSchema>;
