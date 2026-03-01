import { z } from 'zod';
import { RelationshipSchema } from '../contraCore';
import { instructionBaseSchemaFields } from './_base';

export const BalanceInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('balance'), relationship: RelationshipSchema });
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;
