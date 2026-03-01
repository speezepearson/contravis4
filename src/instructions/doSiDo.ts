import { z } from 'zod';
import { RelationshipSchema } from '../contraCore';
import { instructionBaseSchemaFields } from './_base';

export const DoSiDoInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('do_si_do'), relationship: RelationshipSchema, rotations: z.number() });
export type DoSiDoInstruction = z.infer<typeof DoSiDoInstructionSchema>;
