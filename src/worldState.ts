import { z } from "zod";

import {
  addOffsetToDancer,
  addOffsetToId,
  ALL_PROTO_IDS,
  type DancerId,
  DancerIdSchema,
  getOffset,
  type Hand,
  HandSchema,
  projectDancerIdToProtoId,
  type ProtoId,
  ProtoIdSchema,
} from "./contraCore";
import { VectorSchema } from "./geometry";
import { assertNever, isEqual } from "./utils";

export const BasicLabelSchema = z.enum([
  "partner",
  "neighbor",
  "shadow",
  "shadow 2",
  "shadow 3",
  "shadow 4",
  "shadow 5",
  "shadow 6",
]);
export type BasicLabel = z.infer<typeof BasicLabelSchema>;
function isBasicLabel(label: string): label is BasicLabel {
  return BasicLabelSchema.safeParse(label).success;
}
function resolveBasicLabel(
  label: BasicLabel,
  id: DancerId,
  protos: Record<ProtoId, DancerState>,
): DancerId | null {
  const state = getDancerState(id, protos);
  return state.labels.get(label) ?? null;
}

export const CalledLabelSchema = z.enum([
  ...BasicLabelSchema.options,
  "opposite",
  "next neighbor",
  "next x2 neighbor",
  "next x3 neighbor",
  "prev neighbor",
  "prev x2 neighbor",
  "prev x3 neighbor",
]);
export type CalledLabel = z.infer<typeof CalledLabelSchema>;
export function resolveCalledLabel(
  label: CalledLabel,
  id: DancerId,
  protos: Record<ProtoId, DancerState>,
): DancerId | null {
  if (isBasicLabel(label)) {
    return resolveBasicLabel(label, id, protos);
  }
  switch (label) {
    case "opposite": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return resolveBasicLabel("partner", neighbor, protos);
    }
    case "next neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, 1);
    }
    case "next x2 neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, 2);
    }
    case "next x3 neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, 3);
    }
    case "prev neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, -1);
    }
    case "prev x2 neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, -2);
    }
    case "prev x3 neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, -3);
    }
    default:
      assertNever(label);
  }
}

export const DancerStateSchema = z.object({
  protoId: ProtoIdSchema,

  /** Position in the global coordinate frame (i.e. (0,0) is the center of the dance floor) */
  pos: VectorSchema,
  // maybe also wants a velocity vector? not sure

  /** Unit vector pointing the dir the dancer is facing, in the global coordinate frame (i.e. NORTH = (0,1), EAST = (1,0)) */
  facing: VectorSchema,

  /** Who's being held in each hand. */
  hands: z.map(
    HandSchema,
    z.object({ theirId: DancerIdSchema, theirHand: HandSchema }),
  ),

  /** Labels the dancer has mentally assigned to other dancers, e.g. "partner", "neighbor", "shadow". */
  labels: z.map(BasicLabelSchema, DancerIdSchema),
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
  const holding = state[id].hands.get(hand);
  if (holding) {
    if (isEqual(holding, { theirId, theirHand })) return;
    throw new Error(
      `${id}'s ${hand} hand is already holding ${holding.theirId}'s ${holding.theirHand}, so can't grab ${theirId}'s ${theirHand} hand`,
    );
  }

  const them = getDancerState(theirId, state);
  const themHolding = them.hands.get(theirHand);
  if (themHolding) {
    if (isEqual(themHolding, { theirId: id, theirHand: hand })) return;
    throw new Error(
      `${theirId}'s ${theirHand} hand is already holding ${themHolding.theirId}'s ${themHolding.theirHand}, so ${id} can't grab it in their ${hand}`,
    );
  }

  state[id].hands.set(hand, { theirId, theirHand });
  state[projectDancerIdToProtoId(theirId)].hands.set(theirHand, {
    theirId: addOffsetToId(id, -getOffset(theirId)),
    theirHand: hand,
  });
}

export function disconnectHands(
  state: WorldState,
  id: ProtoId,
  hand?: Hand,
): void {
  if (hand == null) {
    if (state[id].hands.has("left")) disconnectHands(state, id, "left");
    if (state[id].hands.has("right")) disconnectHands(state, id, "right");
    return;
  }

  const holding = state[id].hands.get(hand);
  if (!holding) throw new Error(`Dancer ${id}'s ${hand} hand is not connected`);
  const { theirId, theirHand } = holding;

  const them = getDancerState(theirId, state);
  const themHolding = them.hands.get(theirHand);
  if (!(themHolding && isEqual(themHolding, { theirId: id, theirHand: hand })))
    throw new Error(
      `somehow got asymmetric hands state: ${JSON.stringify(state)}`,
    );

  state[id].hands.delete(hand);
  state[them.protoId].hands.delete(theirHand);
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
