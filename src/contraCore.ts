import type { Vector } from "vecti";
import { z } from "zod";

import { NORTH, SOUTH } from "./geometry";
import type { AssertExtends } from "./utils";

export const BeatsSchema = z.number();
export type Beats = z.infer<typeof BeatsSchema>;

export const HandSchema = z.enum(["left", "right"]);
export type Hand = z.infer<typeof HandSchema>;
export const ALL_HANDS: Hand[] = ["left", "right"] as const;
export function otherHand(hand: Hand): Hand {
  return hand === "left" ? "right" : "left";
}

export const RoleSchema = z.enum(["lark", "robin"]);
export type Role = z.infer<typeof RoleSchema>;
export function otherRole(role: Role): Role {
  return role === "lark" ? "robin" : "lark";
}

export const ProgressionDirSchema = z.enum(["up", "down"]);
export type ProgressionDir = z.infer<typeof ProgressionDirSchema>;
export function otherDir(dir: ProgressionDir): ProgressionDir {
  return dir === "up" ? "down" : "up";
}

export const DancerOffsetSchema = z.number().int();
export type DancerOffset = z.infer<typeof DancerOffsetSchema>;

export const ProtoIdSchema = z.enum([
  "up_lark_0",
  "up_robin_0",
  "down_lark_0",
  "down_robin_0",
]);
export type ProtoId = z.infer<typeof ProtoIdSchema>;

export const ALL_PROTO_IDS = [
  "up_lark_0",
  "up_robin_0",
  "down_lark_0",
  "down_robin_0",
] as const;
export const ALL_PROTO_IDS_SET: ReadonlySet<ProtoId> = new Set(ALL_PROTO_IDS);
export const LARK_PROTO_IDS = ["up_lark_0", "down_lark_0"] as const;
export const ROBIN_PROTO_IDS = ["up_robin_0", "down_robin_0"] as const;
export const UP_PROTO_IDS = ["up_lark_0", "up_robin_0"] as const;
export const DOWN_PROTO_IDS = ["down_lark_0", "down_robin_0"] as const;

export const DancerIdSchema = z.templateLiteral([
  ProgressionDirSchema,
  "_",
  RoleSchema,
  "_",
  DancerOffsetSchema,
]);
export type DancerId = z.infer<typeof DancerIdSchema>;

// Compile-time check: every ProtoId is a valid DancerId
// (the `satisfies` will fail if ProtoId is not assignable to DancerId)
null satisfies AssertExtends<ProtoId, DancerId>;

export function makeProtoId({
  dir,
  role,
}: {
  dir: ProgressionDir;
  role: Role;
}): ProtoId {
  return `${dir}_${role}_0`;
}
export function makeDancerId({
  dir,
  role,
  offset,
}: {
  dir: ProgressionDir;
  role: Role;
  offset: DancerOffset;
}): DancerId {
  return `${dir}_${role}_${offset}`;
}

type ParsedDancer = { dir: ProgressionDir; role: Role; offset: DancerOffset };
const _parsedDancers: Partial<Record<DancerId, ParsedDancer>> = {};
export function parseDancerId(id: DancerId): ParsedDancer {
  if (!_parsedDancers[id]) {
    const [dirStr, roleStr, offsetStr] = id.split("_");
    const dir = ProgressionDirSchema.parse(dirStr);
    const role = RoleSchema.parse(roleStr);
    const offset = z.coerce.number().pipe(DancerOffsetSchema).parse(offsetStr);
    _parsedDancers[id] = Object.freeze({
      dir,
      role,
      offset,
    });
  }
  return _parsedDancers[id];
}
export function parseProtoId(id: ProtoId): { dir: ProgressionDir; role: Role } {
  return parseDancerId(id);
}
export function getRole(id: DancerId): Role {
  return parseDancerId(id).role;
}
export function getOffset(id: DancerId): DancerOffset {
  return parseDancerId(id).offset;
}
export function getProgDir(id: DancerId): ProgressionDir {
  return parseDancerId(id).dir;
}
export function getProgDirSign(id: DancerId): number {
  return { up: 1, down: -1 }[getProgDir(id)];
}
export function getProgDirVec(id: DancerId): Vector {
  return { up: NORTH, down: SOUTH }[getProgDir(id)];
}
export function isLark(id: DancerId): boolean {
  return getRole(id) === "lark";
}
export function isRobin(id: DancerId): boolean {
  return getRole(id) === "robin";
}

export function flipRole(id: ProtoId): ProtoId;
export function flipRole(id: DancerId): DancerId;
export function flipRole(id: DancerId): DancerId {
  const { dir, role, offset } = parseDancerId(id);
  return makeDancerId({ dir, role: otherRole(role), offset });
}
export function flipProgDir(id: ProtoId): ProtoId;
export function flipProgDir(id: DancerId): DancerId;
export function flipProgDir(id: DancerId): DancerId {
  const { dir, role, offset } = parseDancerId(id);
  return makeDancerId({ dir: otherDir(dir), role, offset });
}
export function flipOffset(id: DancerId): DancerId {
  const { dir, role, offset } = parseDancerId(id);
  return makeDancerId({ dir, role, offset: -offset });
}

export function protoIdToDancerId(
  proto: ProtoId,
  offset: DancerOffset,
): DancerId {
  return makeDancerId({ ...parseProtoId(proto), offset });
}
export function projectDancerIdToProtoId(id: DancerId): ProtoId {
  return makeProtoId({ ...parseDancerId(id) });
}
export function addOffsetToId(
  id: DancerId,
  deltaOffset: DancerOffset,
): DancerId {
  const { dir, role, offset } = parseDancerId(id);
  return makeDancerId({ dir, role, offset: offset + deltaOffset });
}

export function buildHandsRecord<V>(f: (h: Hand) => V): Record<Hand, V> {
  return {
    left: f("left"),
    right: f("right"),
  };
}
