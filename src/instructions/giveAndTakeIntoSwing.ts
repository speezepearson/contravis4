import { z } from 'zod';
import { FoilRelationshipSchema, RoleSchema } from '../contraCore';
import { instructionBaseSchemaFields, RelativeDirectionSchema } from './_base';

export const GiveAndTakeIntoSwingInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('give_and_take_into_swing'), relationship: FoilRelationshipSchema, role: RoleSchema, endFacing: RelativeDirectionSchema });
export type GiveAndTakeIntoSwingInstruction = z.infer<typeof GiveAndTakeIntoSwingInstructionSchema>;
