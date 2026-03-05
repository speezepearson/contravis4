import { Vector } from "vecti";
import { z } from "zod";

import {
  addOffsetToId,
  ALL_PROTO_IDS,
  type BasicLabel,
  BasicLabelSchema,
  buildHandsRecord,
  buildLabelsRecord,
  type DancerId,
  DancerIdSchema,
  type DancerOffset,
  getOffset,
  type Hand,
  HandSchema,
  projectDancerIdToProtoId,
  type ProtoId,
  ProtoIdSchema,
} from "./contraCore";
import { NORTH, VectorSchema } from "./geometry";
import { getSide, isEqual } from "./utils";

export function resolveBasicLabel(
  label: BasicLabel,
  id: DancerId,
  protos: Record<ProtoId, DancerState>,
): DancerId | null {
  const state = getDancerState(id, protos);
  return state.labels[label] ?? null;
}

export const DancerHandPointerSchema = z.object({
  theirId: DancerIdSchema,
  theirHand: HandSchema,
});
export type DancerHandPointer = z.infer<typeof DancerHandPointerSchema>;

export const DancerStateSchema = z.object({
  protoId: ProtoIdSchema,

  /** Position in the global coordinate frame (i.e. (0,0) is the center of the dance floor) */
  pos: VectorSchema,
  // maybe also wants a velocity vector? not sure

  /** Unit vector pointing the dir the dancer is facing, in the global coordinate frame (i.e. NORTH = (0,1), EAST = (1,0)) */
  facing: VectorSchema,

  /** Who's being held in each hand. */
  hands: z.partialRecord(HandSchema, DancerHandPointerSchema),

  /** Labels the dancer has mentally assigned to other dancers, e.g. "partner", "neighbor", "shadow". */
  labels: z.partialRecord(BasicLabelSchema, DancerIdSchema),
});
export type DancerState = z.infer<typeof DancerStateSchema>;

export function getDancerState(
  id: DancerId,
  protos: Record<ProtoId, DancerState>,
): DancerState {
  return addOffsetToDancer(protos[projectDancerIdToProtoId(id)], getOffset(id));
}

export const WorldStateSchema = z.record(ProtoIdSchema, DancerStateSchema);
export type WorldState = z.infer<typeof WorldStateSchema>;

/** Connects two hands of two dancers. Throws an error if the hands are already in use, unless they are already paired with each other. */
export function connectHands(
  state: WorldState,
  id: ProtoId,
  hand: Hand,
  theirId: DancerId,
  theirHand: Hand,
): void {
  if (id === theirId) {
    throw new Error(`Dancer ${id} cannot connect hands to themselves`);
  }
  const holding = state[id].hands[hand];
  if (holding) {
    if (isEqual(holding, { theirId, theirHand })) {
      return;
    }
    throw new Error(
      `${id}'s ${hand} hand is already holding ${holding.theirId}'s ${holding.theirHand}, so can't grab ${theirId}'s ${theirHand} hand`,
    );
  }

  const them = getDancerState(theirId, state);
  const themHolding = them.hands[theirHand];
  if (themHolding) {
    if (isEqual(themHolding, { theirId: id, theirHand: hand })) {
      return;
    }
    throw new Error(
      `${theirId}'s ${theirHand} hand is already holding ${themHolding.theirId}'s ${themHolding.theirHand}, so ${id} can't grab it in their ${hand}`,
    );
  }

  state[id].hands[hand] = { theirId, theirHand };
  state[projectDancerIdToProtoId(theirId)].hands[theirHand] = {
    theirId: addOffsetToId(id, -getOffset(theirId)),
    theirHand: hand,
  };
}

export function disconnectHands(
  state: WorldState,
  id: ProtoId,
  hand?: Hand,
): void {
  if (hand == null) {
    if (state[id].hands["left"]) disconnectHands(state, id, "left");
    if (state[id].hands["left"]) disconnectHands(state, id, "right");
    return;
  }

  const holding = state[id].hands[hand];
  if (!holding) throw new Error(`Dancer ${id}'s ${hand} hand is not connected`);
  const { theirId, theirHand } = holding;

  const them = getDancerState(theirId, state);
  const themHolding = them.hands[theirHand];
  if (!(themHolding && isEqual(themHolding, { theirId: id, theirHand: hand })))
    throw new Error(
      `somehow got asymmetric hands state: ${JSON.stringify(state)}`,
    );

  delete state[id].hands[hand];
  delete state[them.protoId].hands[theirHand];
}

export function buildProtoRecord<V>(f: (id: ProtoId) => V): Record<ProtoId, V> {
  return {
    up_lark_0: f("up_lark_0"),
    up_robin_0: f("up_robin_0"),
    down_lark_0: f("down_lark_0"),
    down_robin_0: f("down_robin_0"),
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

export function addOffsetToDancer(
  state: DancerState,
  deltaOffset: DancerOffset,
): DancerState {
  return {
    protoId: state.protoId,
    pos: state.pos.add(NORTH.multiply(deltaOffset * 2)),
    facing: state.facing,
    hands: buildHandsRecord((hand) => {
      const held = state.hands[hand];
      if (!held) return undefined;
      return {
        theirId: addOffsetToId(held.theirId, deltaOffset),
        theirHand: held.theirHand,
      };
    }),
    labels: buildLabelsRecord((label) => {
      const theirId = state.labels[label];
      if (!theirId) return undefined;
      return addOffsetToId(theirId, deltaOffset);
    }),
  };
}

export function getDancerSide(
  dancer: DancerState,
  {
    errMsg = `dancer ${dancer.protoId} is too close to the center, refusing to guess which side they're supposed to be on`,
  }: { errMsg?: string } = {},
): "east" | "west" {
  return getSide(dancer.pos, { errMsg });
}

export function avgPos(state: WorldState, ...ids: DancerId[]): Vector {
  return ids
    .reduce(
      (acc, id) => acc.add(getDancerState(id, state).pos),
      new Vector(0, 0),
    )
    .divide(ids.length);
}
