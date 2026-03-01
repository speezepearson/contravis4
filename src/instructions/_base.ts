import { z } from 'zod';
import { parseDancerId, RelationshipSchema, resolveRelationship, type ProtoId } from '../contraCore';
import type { Vector } from 'vecti';
import { NORTH, SOUTH, EAST, WEST } from '../geometry';
import { assertNever } from '../utils';
import { getDancerState, type DancerState } from '../worldState';

export const InstructionIdSchema = z.string().uuid();
export type InstructionId = z.infer<typeof InstructionIdSchema>;

export const instructionBaseSchemaFields = { id: InstructionIdSchema, beats: z.number() };

// Direction relative to a dancer: a named direction or a relationship
export const RelativeDirectionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('direction'), value: z.enum(['up', 'down', 'across', 'out', 'progression', 'forward', 'back', 'right', 'left']) }),
  z.object({ kind: z.literal('relationship'), value: RelationshipSchema }),
]);
export type RelativeDirection = z.infer<typeof RelativeDirectionSchema>;

/** Resolve a RelativeDirection to a unit heading vector for a specific dancer. */
export function resolveRelativeDirection(dir: RelativeDirection, d: DancerState, id: ProtoId, protos: Record<ProtoId, DancerState>): Vector {
  if (dir.kind === 'direction') {
    const v = dir.value;
    switch (v) {
      case 'up':               return NORTH;
      case 'down':             return SOUTH;
      case 'across':           return d.pos.x < 0 ? EAST : WEST;
      case 'out':              return d.pos.x < 0 ? WEST : EAST;
      case 'progression':      return {up: NORTH, down: SOUTH}[parseDancerId(id).dir];
      case 'forward':          return d.facing;
      case 'back':             return d.facing.multiply(-1);
      case 'right':            return d.facing.rotateByDegrees(-90);
      case 'left':             return d.facing.rotateByDegrees(90);
      default:                 return assertNever(v);
    }
  }
  // relationship: toward the matched partner
  const targetDancerId = resolveRelationship(id, dir.value);
  const t = getDancerState(targetDancerId, protos);
  return t.pos.subtract(d.pos).normalize();
}