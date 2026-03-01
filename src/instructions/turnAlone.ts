import { z } from 'zod';
import { instructionBaseSchemaFields } from './_base';

export const TurnAloneInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('turn_alone') });
export type TurnAloneInstruction = z.infer<typeof TurnAloneInstructionSchema>;
