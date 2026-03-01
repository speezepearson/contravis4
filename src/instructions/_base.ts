import { z } from 'zod';
import { ALL_PROTO_IDS, BeatsSchema, parseDancerId, RelationshipSchema, resolveRelationship, type Beats, type ProtoId } from '../contraCore';
import type { Vector } from 'vecti';
import { NORTH, SOUTH, EAST, WEST, lerpFacing } from '../geometry';
import { assertNever, lerpVectors } from '../utils';
import { getDancerState, type DancerState, type WorldState } from '../worldState';
import { produce } from 'immer';

export const InstructionIdSchema = z.string().uuid();
export type InstructionId = z.infer<typeof InstructionIdSchema>;

export const instructionBaseSchemaFields = { id: InstructionIdSchema, beats: BeatsSchema };

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

/** A continuous function from beat time to world state, used for rendering intermediate frames. */
export type ContraAnimation = (t: Beats) => WorldState;

/** Default animation fallback: linearly interpolates position and facing between two keyframes. */
export function lerpStates(init: WorldState, final: WorldState, t: Beats): WorldState {
  return produce(init, (draft) => {
    draft.beat = t;
    for (const proto of ALL_PROTO_IDS) {
      const initProto = init.protos[proto];
      const finalProto = final.protos[proto];
      const progressFrac = (t - init.beat) / (final.beat - init.beat);
      draft.protos[proto] = {
        ...initProto,
        pos: lerpVectors(initProto.pos, finalProto.pos, progressFrac),
        facing: lerpFacing(initProto.facing, finalProto.facing, progressFrac),
      };
    }
  });
}

export function revolveDancer(d: DancerState, how: ({around: Vector} | {aroundMidpointWith: Vector}) & ({radians: number} | {degrees: number} | {rotations: number})): void {
  const center =
    'around' in how ? how.around :
    'aroundMidpointWith' in how ? how.aroundMidpointWith.add(d.pos).divide(2) :
    assertNever(how);
  const radians =
    'radians' in how ? how.radians :
    'degrees' in how ? how.degrees / 180 * Math.PI :
    'rotations' in how ? 360 * how.rotations :
    assertNever(how);
  d.pos = center.add(d.pos.subtract(center).rotateByRadians(radians));
  d.facing = d.facing.rotateByRadians(radians);
}

/**
 * The two-phase interface every instruction implements.
 * - `final` computes the end state and advances `beat` by `instr.beats`.
 * - `animate` (optional) produces a continuous Animation for rendering
 *   intermediate frames. When absent, consumers fall back to `lerpStates`.
 */
export type InstructionAnimator<Instr> = {
  final: (state: WorldState, who: Set<ProtoId>, instr: Instr) => WorldState;
  animate?: (init: WorldState, who: Set<ProtoId>, instr: Instr) => ContraAnimation;
}

// TODO: nothing actually uses this yet, but that doesn't feel right. Figure out what should use this.
export const DirectionalRelationshipSchema = z.enum(['on_left', 'on_right', 'in_front', 'larks_left_robins_right', 'larks_right_robins_left']);
export type DirectionalRelationship = z.infer<typeof DirectionalRelationshipSchema>;
