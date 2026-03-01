import { z } from 'zod';

export const HandSchema = z.enum(['left', 'right']);
export type Hand = z.infer<typeof HandSchema>;
export function otherHand(hand: Hand): Hand {
  return hand === 'left' ? 'right' : 'left';
}

export const RoleSchema = z.enum(['lark', 'robin']);
export type Role = z.infer<typeof RoleSchema>;
export function otherRole(role: Role): Role {
  return role === 'lark' ? 'robin' : 'lark';
}

export const ProgressionDirSchema = z.enum(['up', 'down']);
export type ProgressionDir = z.infer<typeof ProgressionDirSchema>;
export function otherDir(dir: ProgressionDir): ProgressionDir {
  return dir === 'up' ? 'down' : 'up';
}

export const DancerOffsetSchema = z.number().int();
export type DancerOffset = z.infer<typeof DancerOffsetSchema>;

export const ProtoIdSchema = z.enum(['up_lark_0', 'up_robin_0', 'down_lark_0', 'down_robin_0']);
export type ProtoId = z.infer<typeof ProtoIdSchema>;

export const ALL_PROTO_IDS = ['up_lark_0', 'up_robin_0', 'down_lark_0', 'down_robin_0'] as const;
export const LARK_PROTO_IDS = ['up_lark_0', 'down_lark_0'] as const;
export const ROBIN_PROTO_IDS = ['up_robin_0', 'down_robin_0'] as const;
export const UP_PROTO_IDS = ['up_lark_0', 'up_robin_0'] as const;
export const DOWN_PROTO_IDS = ['down_lark_0', 'down_robin_0'] as const;

export const DancerIdSchema = z.templateLiteral([ProgressionDirSchema, '_', RoleSchema, '_', DancerOffsetSchema]);
export type DancerId = z.infer<typeof DancerIdSchema>;

// Compile-time check: every ProtoId is a valid DancerId
// (the `satisfies` will fail if ProtoId is not assignable to DancerId)
undefined as unknown as ProtoId satisfies DancerId;

export function makeProtoId({dir, role}: {dir: ProgressionDir, role: Role}): ProtoId {
  return `${dir}_${role}_0`;
}
export function makeDancerId({dir, role, offset}: {dir: ProgressionDir, role: Role, offset: DancerOffset}): DancerId {
  return `${dir}_${role}_${offset}`;
}
export function parseDancerId(id: DancerId): { dir: ProgressionDir; role: Role; offset: DancerOffset } {
  const [dirStr, roleStr, offsetStr] = id.split('_');
  const dir = ProgressionDirSchema.parse(dirStr);
  const role = RoleSchema.parse(roleStr);
  const offset = z.coerce.number().pipe(DancerOffsetSchema).parse(offsetStr);
  return {
    dir,
    role,
    offset,
  };
}
export function parseProtoId(id: ProtoId): { dir: ProgressionDir; role: Role } {
  return parseDancerId(id);
}

export function protoIdToDancerId(proto: ProtoId, offset: DancerOffset): DancerId {
  return makeDancerId({...parseProtoId(proto), offset});
}
export function projectDancerIdToProtoId(id: DancerId): ProtoId {
  return makeProtoId({...parseDancerId(id)});
}

// Who they interact with (only for actions that involve a partner)
export const FoilBaseRelationshipSchema = z.enum(['partner', 'neighbor']);
export type FoilBaseRelationship = z.infer<typeof FoilBaseRelationshipSchema>;

export const BaseRelationshipSchema = z.enum([...FoilBaseRelationshipSchema.options, 'opposite']);
export type BaseRelationship = z.infer<typeof BaseRelationshipSchema>;

/** Resolve a relationship from a specific dancer's perspective.
 *  Returns the DancerId of the target, which may be in an different hands-four.
 */
export function resolveRelationship(id: DancerId, relationship: Relationship): DancerId {
  const { dir, role, offset } = parseDancerId(id);
  const offsetDelta = (dir==='up' ? 1 : -1) * relationship.offset;
  switch (relationship.base) {
    case 'neighbor':
      return makeDancerId({dir: otherDir(dir), role: otherRole(role), offset: offset + offsetDelta});
    case 'opposite':
      return makeDancerId({dir: otherDir(dir), role: role, offset: offset + offsetDelta});
    case 'partner':
      return makeDancerId({dir, role: otherRole(role), offset: offset + offsetDelta * (role==='robin' ? 1 : -1)});
  }
}

/** A relationship between two dancers of opposite roles.
 * Examples:
 *
 *   `{base: 'neighbor', offset: 0}` means "current neighbor"
 *   `{base: 'neighbor', offset: -1}` means "prev neighbor"
 *   `{base: 'neighbor', offset: 2}` means "next next neighbor"
 *
 *   `{base: 'opposite', offset: n}` means "the partner of `{base: 'neighbor', offset: n}`"
 *
 *   `{base: 'partner', offset: 0}` means "partner"
 *   `{base: 'partner', offset: n}` means "your shadow in the hands-four n [L: ahead of you | R: behind you]"
 *
 * The slightly convoluted shadow-handling is necessary to make the relationships symmetric.
*/
export const FoilRelationshipSchema = z.object({ base: FoilBaseRelationshipSchema, offset: z.number().int() });
export type FoilRelationship = z.infer<typeof FoilRelationshipSchema>;

/** A relationship between two dancers. */
export const RelationshipSchema = z.object({ base: BaseRelationshipSchema, offset: z.number().int() });
export type Relationship = z.infer<typeof RelationshipSchema>;
