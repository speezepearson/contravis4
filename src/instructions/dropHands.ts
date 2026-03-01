import { z } from 'zod';
import { instructionBaseSchemaFields } from './_base';
import { disconnectHands, type WorldState } from '../worldState';
import type { ProtoId } from '../contraCore';
import { assertNever } from '../utils';
import { produce } from 'immer';

export const DropHandsInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('drop_hands'), which: z.enum(['both', 'left', 'right', 'partner', 'shadow', 'neighbor']) });
export type DropHandsInstruction = z.infer<typeof DropHandsInstructionSchema>;

export function dropHands(state: WorldState, who: Set<ProtoId>, instr: DropHandsInstruction): Omit<WorldState, 'beat'> {
  return produce(state, (draft) => {
    for (const id of who) {
      switch (instr.which) {
        case 'left':
          disconnectHands(draft, id, 'left');
          break;
        case 'right':
          disconnectHands(draft, id, 'right');
          break;
        case 'both':
          if (draft.protos[id].hands.left) disconnectHands(draft, id, 'left');
          if (draft.protos[id].hands.right) disconnectHands(draft, id, 'right');
          break;
        case 'partner': case 'shadow': case 'neighbor': {
          const actualDropRelationship = instr.which === 'shadow' ? 'partner' : instr.which;
          if (draft.protos[id].hands.left?.[0].base === actualDropRelationship) disconnectHands(draft, id, 'left');
          if (draft.protos[id].hands.right?.[0].base === actualDropRelationship) disconnectHands(draft, id, 'right');
          break;
        }
        default:
          assertNever(instr.which);
      }
    }
  });
}
