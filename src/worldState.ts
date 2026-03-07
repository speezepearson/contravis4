import { immerable } from "immer";
import { Vector } from "vecti";
import { z } from "zod";

import {
  addOffsetToId,
  ALL_PROTO_IDS,
  buildHandsRecord,
  type DancerId,
  DancerIdSchema,
  type DancerOffset,
  flipOffset,
  flipProgDir,
  flipRole,
  getOffset,
  getProgDirSign,
  getRole,
  type Hand,
  HandSchema,
  parseDancerId,
  type ProgressionDir,
  projectDancerIdToProtoId,
  type ProtoId,
  protoIdToDancerId,
  type Role,
} from "./contraCore";
import {
  type CalledDirection,
  type PureDirection,
  PureDirectionSchema,
  resolveCardinalDirection,
  TowardsLabelDirectionSchema,
  type TowardsPersonDirection,
  TowardsPersonDirectionSchema,
  towardsPersonToDir,
  towardsToLabel,
} from "./directions";
import { getDir, NORTH, roughlySameDir } from "./geometry";
import {
  type CalledIdentifier,
  type PersonInDirection,
  personInToDir,
} from "./identifiers";
import {
  type InfallibleLabel,
  InfallibleLabelSchema,
  IrreducibleLabelSchema,
  type Label,
  LabelSchema,
  neighborLabelOffsets,
  OffsetNeighborLabelSchema,
  type SettableLabel,
  type ShadowLabel,
  ShadowLabelSchema,
} from "./labels";
import { assertNever, getSide, isEqual, must, parses } from "./utils";

export const DancerHandPointerSchema = z.object({
  theirId: DancerIdSchema,
  theirHand: HandSchema,
});
export type DancerHandPointer = z.infer<typeof DancerHandPointerSchema>;

// Stores the WorldState a Dancer was looked up from, invisible to Immer and serialization.
const dancerStates = new WeakMap<Dancer, WorldState>();

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

  /** The WorldState this dancer was looked up from. Only available on dancers returned by Dancer.get. */
  get state(): WorldState {
    const s = dancerStates.get(this);
    if (!s)
      throw new Error(
        `Dancer ${this.id} has no associated state (use Dancer.get to look up dancers)`,
      );
    return s;
  }

  static get(id: DancerId, state: WorldState): Dancer {
    const d = state[projectDancerIdToProtoId(id)].addOffset(getOffset(id));
    dancerStates.set(d, state);
    return d;
  }

  addOffset(deltaOffset: DancerOffset): Dancer {
    if (deltaOffset === 0) return this;
    const d = new Dancer(addOffsetToId(this.id, deltaOffset), {
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
    const s = dancerStates.get(this);
    if (s) dancerStates.set(d, s);
    return d;
  }

  resolveLabel(label: InfallibleLabel): Dancer;
  resolveLabel(label: Label): Dancer | undefined;
  resolveLabel(label: Label): Dancer | undefined {
    const s = this.state;
    if (parses(InfallibleLabelSchema, label)) {
      switch (label) {
        case "partner":
        case "neighbor":
          return Dancer.get(this.labels[label], s);
        case "opposite": {
          return this.resolveLabel("neighbor")?.resolveLabel("partner");
        }
      }

      label satisfies z.infer<typeof OffsetNeighborLabelSchema>;
      const neighbor = this.resolveLabel("neighbor");
      if (!neighbor) return undefined;
      return neighbor.addOffset(
        neighborLabelOffsets[label] * getProgDirSign(this.id),
      );
    } else if (parses(ShadowLabelSchema, label)) {
      if (!this.labels[label]) return undefined;
      return Dancer.get(this.labels[label], s);
    } else {
      const handLabel = label satisfies Exclude<
        Label,
        InfallibleLabel | ShadowLabel
      >;
      switch (handLabel) {
        case "person_in_left_hand":
          if (!this.hands["left"]) return undefined;
          return Dancer.get(this.hands["left"].theirId, s);
        case "person_in_right_hand":
          if (!this.hands["right"]) return undefined;
          return Dancer.get(this.hands["right"].theirId, s);
        default:
          assertNever(handLabel);
      }
    }
  }

  // ── Direction resolution ────────────────────────────────────────────

  resolvePureDirection(dir: PureDirection): Vector {
    switch (dir) {
      case "across":
      case "out":
      case "up":
      case "down":
        return must(
          resolveCardinalDirection(dir, this.pos),
          `unable to resolve ${dir} from pos (${this.pos.x}, ${this.pos.y})`,
        );
      case "on_right":
        return this.facing.rotateByDegrees(-90);
      case "on_left":
        return this.facing.rotateByDegrees(90);
      case "in_front":
        return this.facing;
      case "behind":
        return this.facing.multiply(-1);
      case "left_diagonal":
        return this.facing.rotateByDegrees(45);
      case "right_diagonal":
        return this.facing.rotateByDegrees(-45);
      case "larks_left_robins_right":
        return this.facing.rotateByDegrees(90 * (this.isLark ? 1 : -1));
      case "larks_right_robins_left":
        return this.facing.rotateByDegrees(-90 * (this.isLark ? 1 : -1));
      default:
        assertNever(dir);
    }
  }

  resolveCalledDirection(dir: CalledDirection): Vector {
    if (parses(PureDirectionSchema, dir)) {
      return this.resolvePureDirection(dir);
    }
    if (parses(TowardsLabelDirectionSchema, dir)) {
      const label = towardsToLabel[dir];
      const them = this.resolveLabel(label);
      if (!them) throw new Error(`${this.id} has no ${label}`);
      return getDir({ from: this.pos, to: them.pos });
    }
    if (parses(TowardsPersonDirectionSchema, dir)) {
      const pureDir = towardsPersonToDir[dir];
      const pureDirVec = this.resolvePureDirection(pureDir);
      const them = this.findDancerInDirection(pureDirVec);
      if (!them) throw new Error(`${this.id} has nobody ${pureDir}`);
      return getDir({
        from: this.pos,
        to: them.pos,
      });
    }
    assertNever(dir);
  }

  /** For a "towards" CalledDirection, resolves the target person. Returns undefined for pure directions. */
  resolveCalledDirectionTarget(dir: CalledDirection): Dancer | undefined {
    if (parses(PureDirectionSchema, dir)) return undefined;
    if (parses(TowardsLabelDirectionSchema, dir)) {
      return this.resolveLabel(towardsToLabel[dir]) ?? undefined;
    }
    const pureDir = towardsPersonToDir[dir as TowardsPersonDirection];
    const pureDirVec = this.resolvePureDirection(pureDir);
    return this.findDancerInDirection(pureDirVec) ?? undefined;
  }

  /** Find the dancer best described by "the person to your [...]", if any. */
  findDancerInCalledDirection(
    side: CalledDirection,
    { roles }: { roles?: "same" | "different" } = {},
  ): Dancer | null {
    const dir = this.resolveCalledDirection(side);
    return this.findDancerInDirection(dir, { roles });
  }

  /** True when this dancer faces roughly away from the center line (x = 0). */
  facesOut({
    errMsg = `unable to resolve dir 'out' at dancer ${this.id}'s pos`,
  }: { errMsg?: string } = {}): boolean {
    return roughlySameDir(
      this.facing,
      must(resolveCardinalDirection("out", this.pos), errMsg),
    );
  }

  /** True when this dancer faces toward the center line (x = 0). */
  facesAcross({
    errMsg = `unable to resolve dir 'across' at dancer ${this.id}'s pos`,
  }: { errMsg?: string } = {}): boolean {
    return roughlySameDir(
      this.facing,
      must(resolveCardinalDirection("across", this.pos), errMsg),
    );
  }

  // ── Dancer lookup ───────────────────────────────────────────────────

  /** Find the nearest dancer in a given direction vector. */
  findDancerInDirection(
    dir: Vector,
    { roles }: { roles?: "same" | "different" } = {},
  ): Dancer | null {
    dir = dir.normalize();
    const protos = this.state;

    let bestScore = Infinity;
    let bestTarget: Dancer | null = null;

    for (const otherProtoId of ALL_PROTO_IDS) {
      if (otherProtoId === this.id) continue;
      if (roles === "same" && getRole(otherProtoId) !== getRole(this.id))
        continue;
      if (roles === "different" && getRole(otherProtoId) === getRole(this.id))
        continue;

      const otherProto = protos[otherProtoId];
      const dyBase = otherProto.pos.y - this.pos.y;
      const oBest = Math.round(-dyBase / 2);
      for (let o = oBest - 2; o <= oBest + 2; o++) {
        const targetId = protoIdToDancerId(otherProtoId, o);
        const target = Dancer.get(targetId, protos);
        const disp = target.pos.subtract(this.pos);
        const r = disp.length();
        if (r > 1.8 || r < 1e-9) continue;

        const cosTheta = dir.dot(disp) / r;
        if (cosTheta < 0) continue;
        const cos2Theta = 2 * cosTheta * cosTheta - 1;
        if (cos2Theta < 0.01) continue;

        const score = r / cos2Theta;
        if (score < bestScore) {
          bestScore = score;
          bestTarget = target;
        }
      }
    }

    return bestTarget;
  }

  // ── Identifier resolution ──────────────────────────────────────────

  resolveCalledIdentifier(
    cid: CalledIdentifier,
    { roles }: { roles?: "same" | "different" } = {},
  ): Dancer | undefined {
    if (parses(LabelSchema, cid)) return this.resolveLabel(cid) ?? undefined;
    const pureDir = personInToDir[cid as PersonInDirection];
    const dir = this.resolvePureDirection(pureDir);
    const res = this.findDancerInDirection(dir, { roles });
    if (!res) return undefined;
    if (roles === "same" && res.role !== this.role)
      throw new Error(
        `it's crazy to ask for somebody's ${cid} with the ${roles} role`,
      );
    if (roles === "different" && res.role === this.role)
      throw new Error(
        `it's crazy to ask for somebody's ${cid} with the ${roles} role`,
      );
    return res;
  }

  /** Resolves this dancer's "match" for a figure where dancers pair up. */
  resolveMatch(
    cid: CalledIdentifier,
    { roles }: { roles?: "same" | "different" } = {},
  ): Dancer {
    const res = must(
      this.resolveCalledIdentifier(cid, { roles }),
      `${this.id} can't find ${JSON.stringify(cid)}`,
    );
    const symm = must(
      res.resolveCalledIdentifier(cid, { roles }),
      `${res.id} can't find ${JSON.stringify(cid)}`,
    );
    if (symm.id !== this.id)
      throw new Error(
        `asymmetry pairing dancers up: ${this.id} thinks ${JSON.stringify(symm.id)} is ${res.id}, but ${res.id} thinks ${JSON.stringify(this.id)} is ${symm.id}`,
      );
    return res;
  }
}

export type WorldState = Record<ProtoId, Dancer>;

/** Resolves all dancers' "matches" for a figure where dancers pair up. */
export function resolveMatches(
  cid: CalledIdentifier,
  state: WorldState,
  { roles }: { roles?: "same" | "different" } = {},
): Record<ProtoId, Dancer> {
  return buildProtoRecord((id) =>
    Dancer.get(id, state).resolveMatch(cid, { roles }),
  );
}

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
  protos: WorldState,
  f: (dancer: Dancer) => Dancer,
): WorldState {
  return Object.fromEntries(
    ALL_PROTO_IDS.map((id) => [id, f(protos[id])] as const),
  ) as WorldState;
}

export function getDancerSide(
  dancer: Dancer,
  {
    errMsg = `dancer ${dancer.id} is too close to the center, refusing to guess which side they're supposed to be on`,
  }: { errMsg?: string } = {},
): "east" | "west" {
  return must(getSide(dancer.pos), errMsg);
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
    for (const label of IrreducibleLabelSchema.options) {
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
    const existingShadow = state[protoId].labels[label];
    if (existingShadow && existingShadow !== dancerId) {
      throw new Error(
        `Shadows should never change: ${protoId} already has shadow ${existingShadow}, can't set to ${dancerId}`,
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

type AtLeastFour<T> = [T, T, T, T, ...T[]];
function isAtLeastFour<T>(arr: T[]): arr is AtLeastFour<T> {
  return arr.length >= 4;
}

export function findNearbyDancers(
  pos: Vector,
  state: WorldState,
): Record<ProtoId, AtLeastFour<Dancer>> {
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

    if (!isAtLeastFour(dancers))
      throw new Error(
        `findNearbyDancers: expected at least 4 dancers near ${protoId}, but lazily stopped too early somehow, got only ${dancers.length}`,
      );
    return dancers;
  });
}

export const VectorJsonSchema = z
  .object({ x: z.number(), y: z.number() })
  .transform((v) => new Vector(v.x, v.y));

export const LabelsJsonSchema = z
  .object({
    partner: DancerIdSchema,
    neighbor: DancerIdSchema,
  })
  .catchall(DancerIdSchema);

export const HandsJsonSchema = z
  .object({
    left: DancerHandPointerSchema.optional(),
    right: DancerHandPointerSchema.optional(),
  })
  .default({});

export const DancerJsonSchema = z
  .object({
    id: DancerIdSchema,
    pos: VectorJsonSchema,
    facing: VectorJsonSchema,
    hands: HandsJsonSchema,
    labels: LabelsJsonSchema,
    recents: z.array(DancerIdSchema).default([]),
  })
  .transform(
    (d) =>
      new Dancer(d.id, {
        pos: d.pos,
        facing: d.facing,
        hands: d.hands,
        labels: d.labels as Dancer["labels"],
        recents: d.recents,
      }),
  );

export const WorldStateSchema = z
  .object({
    up_lark_0: DancerJsonSchema,
    up_robin_0: DancerJsonSchema,
    down_lark_0: DancerJsonSchema,
    down_robin_0: DancerJsonSchema,
  })
  .transform((o): WorldState => o);
