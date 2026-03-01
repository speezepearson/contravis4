import { z } from 'zod';
import { RelationshipSchema, HandSchema } from '../contraCore';
import { instructionBaseSchemaFields } from './_base';

export const PullByInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('pull_by'), relationship: RelationshipSchema, hand: HandSchema });
export type PullByInstruction = z.infer<typeof PullByInstructionSchema>;
