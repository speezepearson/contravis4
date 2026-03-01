import { z } from 'zod';
import { RelationshipSchema, HandSchema } from '../contraCore';
import { instructionBaseSchemaFields } from './_base';

export const PassByInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('pass_by'), relationship: RelationshipSchema, hand: HandSchema });
export type PassByInstruction = z.infer<typeof PassByInstructionSchema>;
