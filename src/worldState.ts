import { z } from "zod";

import {
  ALL_PROTO_IDS,
  type DancerId,
  type Hand,
  HandSchema,
  makeProtoId,
  parseDancerId,
  projectDancerIdToProtoId,
  type ProtoId,
  ProtoIdSchema,
  type Relationship,
  RelationshipSchema,
  resolveRelationship,
} from "./contraCore";
import { NORTH, VectorSchema } from "./geometry";
import { isEqual } from "./utils";

export const DancerStateSchema = z.object({
  protoId: ProtoIdSchema,

  /** Position in the global coordinate frame (i.e. (0,0) is the center of the dance floor) */
  pos: VectorSchema,
  // maybe also wants a velocity vector? not sure

  /** Unit vector pointing the dir the dancer is facing, in the global coordinate frame (i.e. NORTH = (0,1), EAST = (1,0)) */
  facing: VectorSchema,

  /** Who's being held in each hand. */
  hands: z.partialRecord(HandSchema, z.tuple([RelationshipSchema, HandSchema])),
});
export type DancerState = z.infer<typeof DancerStateSchema>;

export function getDancerState(
  id: DancerId,
  protos: Record<ProtoId, DancerState>,
): DancerState {
  const { dir, role, offset } = parseDancerId(id);
  const proto = protos[makeProtoId({ dir, role })];
  return { ...proto, pos: proto.pos.add(NORTH.multiply(offset * 2)) };
}

export const WorldStateSchema = z.record(ProtoIdSchema, DancerStateSchema);
export type WorldState = z.infer<typeof WorldStateSchema>;

/** Connects two hands of two dancers. Throws an error if the hands are already in use, unless they are already paired with each other. */
export function connectHands(
  state: WorldState,
  id: ProtoId,
  hand: Hand,
  relationship: Relationship,
  theirHand: Hand,
): void {
  const holding = state[id].hands[hand];
  if (holding) {
    if (isEqual(holding, [relationship, theirHand])) return;
    throw new Error(`Dancer ${id}'s ${hand} hand is already connected`);
  }

  const otherProto = projectDancerIdToProtoId(
    resolveRelationship(id, relationship),
  );
  const otherHolding = state[otherProto].hands[theirHand];
  if (otherHolding) {
    if (isEqual(otherHolding, [relationship, hand])) return;
    throw new Error(
      `Dancer ${otherProto}'s ${theirHand} hand is already connected`,
    );
  }

  state[id].hands[hand] = [relationship, theirHand];
  state[otherProto].hands[theirHand] = [relationship, hand];
}

export function disconnectHands(
  state: WorldState,
  id: ProtoId,
  hand: Hand,
): void {
  const holding = state[id].hands[hand];
  if (!holding) throw new Error(`Dancer ${id}'s ${hand} hand is not connected`);
  const [relationship, theirHand] = holding;

  const them = projectDancerIdToProtoId(
    resolveRelationship(id, relationship),
  );
  const otherHolding = state[them].hands[theirHand];
  if (!(otherHolding && isEqual(otherHolding, [relationship, hand])))
    throw new Error(
      `somehow got asymmetric hands state: ${JSON.stringify(state)}`,
    );

  state[id].hands[hand] = undefined;
  state[them].hands[theirHand] = undefined;
}

export function buildProtoRecord<V>(f: (id: ProtoId) => V): Record<ProtoId, V> {
  return {
    up_lark_0: { protoId: "up_lark_0", ...f("up_lark_0") },
    up_robin_0: { protoId: "up_robin_0", ...f("up_robin_0") },
    down_lark_0: { protoId: "down_lark_0", ...f("down_lark_0") },
    down_robin_0: { protoId: "down_robin_0", ...f("down_robin_0") },
  };
}
export function mapProtos(
  protos: Record<ProtoId, DancerState>,
  f: (state: DancerState) => DancerState,
): Record<ProtoId, DancerState> {
  return Object.fromEntries(
    ALL_PROTO_IDS.map((id) => [id, f(protos[id])] as const),
  ) as Record<ProtoId, DancerState>;
}
