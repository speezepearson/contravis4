import { immerable } from "immer";
import { Vector } from "vecti";
import { z } from "zod";

import {
  addOffsetToId,
  ALL_PROTO_IDS,
  type BasicLabel,
  BasicLabelSchema,
  buildHandsRecord,
  type DancerId,
  DancerIdSchema,
  type DancerOffset,
  flipOffset,
  flipProgDir,
  flipRole,
  getOffset,
  getRole,
  type Hand,
  HandSchema,
  parseDancerId,
  type ProgressionDir,
  projectDancerIdToProtoId,
  type ProtoId,
  protoIdToDancerId,
  type Role,
  type SettableLabel,
  type ShadowLabel,
  ShadowLabelSchema,
} from "./contraCore";
import { NORTH } from "./geometry";
import { assertNever, getSide, isEqual, parses } from "./utils";

export const DancerHandPointerSchema = z.object({
  theirId: DancerIdSchema,
  theirHand: HandSchema,
});
export type DancerHandPointer = z.infer<typeof DancerHandPointerSchema>;

export class Dancer {
  static [immerable] = true;

  readonly id: DancerId;
  /** Position in the global coordinate frame (i.e. (0,0) is the center of the dance floor) */
  pos: Vector;
  /** Unit vector pointing the dir the dancer is facing, in the global coordinate frame (i.e. NORTH = (0,1), EAST = (1,0)) */
  facing: Vector;
  /** Who's being held in each hand. */
  hands: Partial<Record<Hand, DancerHandPointer | undefined>>;
  /** Labels the dancer has mentally assigned to other dancers, e.g. "partner", "neighbor", "shadow". */
  labels: {
    partner: DancerId;
    neighbor: DancerId;
  } & Partial<Record<ShadowLabel, DancerId>>;
  /** Dancers this dancer has interacted with recently, most recent first. */
  recents: DancerId[];

  constructor(
    id: DancerId,
    state: {
      pos: Vector;
      facing: Vector;
      hands: Partial<Record<Hand, DancerHandPointer | undefined>>;
      labels: {
        partner: DancerId;
        neighbor: DancerId;
      } & Partial<Record<ShadowLabel, DancerId>>;
      recents: DancerId[];
    },
  ) {
    this.id = id;
    this.pos = state.pos;
    this.facing = state.facing;
    this.hands = state.hands;
    this.labels = state.labels;
    this.recents = state.recents;
  }

  get protoId(): ProtoId {
    return projectDancerIdToProtoId(this.id);
  }
  get role(): Role {
    return getRole(this.id);
  }
  get dir(): ProgressionDir {
    return parseDancerId(this.id).dir;
  }
  get offset(): DancerOffset {
    return getOffset(this.id);
  }
  get isLark(): boolean {
    return this.role === "lark";
  }

  static get(id: DancerId, protos: Record<ProtoId, Dancer>): Dancer {
    return protos[projectDancerIdToProtoId(id)].addOffset(getOffset(id));
  }

  addOffset(deltaOffset: DancerOffset): Dancer {
    if (deltaOffset === 0) return this;
    return new Dancer(addOffsetToId(this.id, deltaOffset), {
      pos: this.pos.add(NORTH.multiply(deltaOffset * 2)),
      facing: this.facing,
      hands: buildHandsRecord((hand) => {
        const held = this.hands[hand];
        if (!held) return undefined;
        return {
          theirId: addOffsetToId(held.theirId, deltaOffset),
          theirHand: held.theirHand,
        };
      }),
      labels: {
        partner: addOffsetToId(this.labels.partner, deltaOffset),
        neighbor: addOffsetToId(this.labels.neighbor, deltaOffset),
        ...Object.fromEntries(
          ShadowLabelSchema.options.map((label) => [
            label,
            !this.labels[label]
              ? undefined
              : addOffsetToId(this.labels[label], deltaOffset),
          ]),
        ),
      },
      recents: this.recents.map((rid) => addOffsetToId(rid, deltaOffset)),
    });
  }
}

export function resolveBasicLabel(
  label: BasicLabel,
  id: DancerId,
  protos: Record<ProtoId, Dancer>,
): DancerId | null {
  const dancer = Dancer.get(id, protos);
  return dancer.labels[label] ?? null;
}

export type WorldState = Record<ProtoId, Dancer>;

/** Connects two hands of two dancers. Throws an error if the hands are already in use, unless they are already paired with each other. */
export function connectHands(
  state: WorldState,
  id: ProtoId,
  hand: Hand,
  theirId: DancerId,
  theirHand: Hand,
): void {
  if (projectDancerIdToProtoId(theirId) === id) {
    throw new Error(
      `Dancer ${id} cannot connect hands to ${theirId} (same proto)`,
    );
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

  const them = Dancer.get(theirId, state);
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

  const them = Dancer.get(theirId, state);
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
  protos: Record<ProtoId, Dancer>,
  f: (dancer: Dancer) => Dancer,
): Record<ProtoId, Dancer> {
  return Object.fromEntries(
    ALL_PROTO_IDS.map((id) => [id, f(protos[id])] as const),
  ) as Record<ProtoId, Dancer>;
}

export function getDancerSide(
  dancer: Dancer,
  {
    errMsg = `dancer ${dancer.id} is too close to the center, refusing to guess which side they're supposed to be on`,
  }: { errMsg?: string } = {},
): "east" | "west" {
  return getSide(dancer.pos, { errMsg });
}

export function avgPos(state: WorldState, ...ids: DancerId[]): Vector {
  return ids
    .reduce((acc, id) => acc.add(Dancer.get(id, state).pos), new Vector(0, 0))
    .divide(ids.length);
}

export function sanityCheckWorldState(state: WorldState): WorldState {
  for (const id of ALL_PROTO_IDS) {
    const dancer = state[id];
    if (
      !(
        isFinite(dancer.facing.length()) &&
        Math.abs(dancer.facing.length() - 1) < 0.01
      )
    ) {
      throw new Error(
        `dancer ${id} has a crazy facing: ${dancer.facing.x}, ${dancer.facing.y}`,
      );
    }
    if (
      !(
        isFinite(dancer.pos.x) &&
        -30 < dancer.pos.x &&
        dancer.pos.x < 30 &&
        isFinite(dancer.pos.y) &&
        -30 < dancer.pos.y &&
        dancer.pos.y < 30
      )
    ) {
      throw new Error(
        `dancer ${id} has a crazy position: ${dancer.pos.x}, ${dancer.pos.y}`,
      );
    }
    if (!dancer.labels["neighbor"])
      throw new Error(`dancer ${id} has no neighbor`);
    for (const label of BasicLabelSchema.options) {
      const theirId = dancer.labels[label];
      if (!theirId) continue;
      const theirSymmetricPointer = Dancer.get(theirId, state).labels[label];
      if (theirSymmetricPointer !== id)
        throw new Error(
          `${id}'s ${label}'s thinks their ${label} is ${theirSymmetricPointer} -- this should never be asymmetric!`,
        );
    }
    for (const hand of HandSchema.options) {
      const holding = dancer.hands[hand];
      if (!holding) continue;
      const { theirId, theirHand } = holding;
      const theirSymmetricPointer = Dancer.get(theirId, state).hands[theirHand];
      if (!isEqual(theirSymmetricPointer, { theirId: id, theirHand: hand }))
        throw new Error(
          `${id} thinks their ${hand} hand is holding ${theirId}'s ${theirHand}, but they think that that's holding ${theirSymmetricPointer == null ? "nothing" : `${theirSymmetricPointer.theirId}'s ${theirSymmetricPointer.theirHand}`}`,
        );
    }
  }
  return state;
}

/** Sets a label for all dancers, updating each proto's value for `label` consistently. */
export function setLabel(
  state: WorldState,
  protoId: ProtoId,
  label: SettableLabel,
  dancerId: DancerId,
): void {
  const { dir: protoDir, role: protoRole } = parseDancerId(protoId);
  const { dir: dancerDir, role: dancerRole } = parseDancerId(dancerId);

  if (projectDancerIdToProtoId(dancerId) === protoId) {
    throw new Error(
      `Cannot set ${label} of ${protoId} to ${dancerId} (same proto)`,
    );
  }

  if (dancerRole === protoRole) {
    throw new Error(
      `Cannot set ${label} of ${protoId} to ${dancerId} (same role)`,
    );
  }

  if (label === "neighbor") {
    if (dancerDir === protoDir) {
      throw new Error(
        `Cannot set ${label} of ${protoId} to ${dancerId} (same progression direction)`,
      );
    }
    state[protoId].labels[label] = dancerId;
    state[flipRole(protoId)].labels[label] = flipRole(dancerId);
    state[flipProgDir(protoId)].labels[label] = flipOffset(
      flipProgDir(dancerId),
    );
    state[flipRole(flipProgDir(protoId))].labels[label] = flipOffset(
      flipRole(flipProgDir(dancerId)),
    );
    return;
  }

  if (parses(ShadowLabelSchema, label)) {
    if (protoDir !== dancerDir) {
      throw new Error(
        `Cannot set shadow "${label}" of ${protoId} to ${dancerId} (different progression direction)`,
      );
    }

    if (getOffset(dancerId) === getOffset(protoId)) {
      throw new Error(
        `${protoId} should know ${dancerId} as their partner, not their ${label}`,
      );
    }
    state[protoId].labels[label] = dancerId;
    state[flipRole(protoId)].labels[label] = flipOffset(flipRole(dancerId));
    state[flipProgDir(protoId)].labels[label] = flipOffset(
      flipProgDir(dancerId),
    );
    state[flipRole(flipProgDir(protoId))].labels[label] = flipRole(
      flipProgDir(dancerId),
    );
    return;
  }

  assertNever(label);
}

const NEARBY_HALF_WINDOW = 2 as DancerOffset;

export function findNearbyDancers(
  pos: Vector,
  state: WorldState,
): Record<ProtoId, Dancer[]> {
  return buildProtoRecord((protoId) => {
    const bestOffset = Math.round(
      (pos.y - state[protoId].pos.y) / 2,
    ) as DancerOffset;

    const dancers: Dancer[] = [];
    for (
      let o = bestOffset - NEARBY_HALF_WINDOW;
      o <= bestOffset + NEARBY_HALF_WINDOW;
      o++
    ) {
      dancers.push(Dancer.get(protoIdToDancerId(protoId, o), state));
    }

    dancers.sort(
      (a, b) => a.pos.subtract(pos).length() - b.pos.subtract(pos).length(),
    );

    return dancers;
  });
}
