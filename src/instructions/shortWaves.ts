import { z } from 'zod';
import { instructionBaseSchemaFields } from './_base';

export const ShortWavesInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('short_waves') });
export type ShortWavesInstruction = z.infer<typeof ShortWavesInstructionSchema>;
