import { immerable, produce } from "immer";
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
  resolveCardinalDirection,
} from "./directions";
import {
  getDir,
  getDist,
  lerpFacing,
  NORTH,
  roughlySameDir,
  VectorSchema,
} from "./geometry";
import { type CalledIdentifier, labelId } from "./identifiers";
import {
  type InfallibleLabel,
  IrreducibleLabelSchema,
  type Label,
  neighborLabelOffsets,
  NeighborLabelSchema,
  OppositeLabelSchema,
  type SettableLabel,
  ShadowLabelSchema,
} from "./labels";
import { SnazzyError, type SnazzySegment } from "./snazzyError";
import {
  assertNever,
  buildEnumRecord,
  getSide,
  isEqual,
  must,
  type NTuple,
  parses,
} from "./utils";

export const DancerHandPointerSchema = z.object({
  theirId: DancerIdSchema,
  theirHand: HandSchema,
});
export type DancerHandPointer = z.infer<typeof DancerHandPointerSchema>;

type ResolveLabelOpts = { checkDistance?: boolean };
type ResolveCalledIdentifierOpts = ResolveLabelOpts;

export type Lark = Dancer & { role: "lark" };
export type Robin = Dancer & { role: "robin" };

const ProtoDancerStateLabelsSchema = z
  .object({ partner: DancerIdSchema, neighbor: DancerIdSchema })
  .extend(buildEnumRecord(ShadowLabelSchema, () => DancerIdSchema.optional()));

export const ProtoDancerStateSchema = z
  .object({
    /** Position in the global coordinate frame (i.e. (0,0) is the center of the dance floor) */
    pos: VectorSchema,
    /** Unit vector pointing the dir the dancer is facing, in the global coordinate frame (i.e. NORTH = (0,1), EAST = (1,0)) */
    facing: VectorSchema,
    /** Who's being held in each hand. */
    hands: z.partialRecord(HandSchema, DancerHandPointerSchema),
    /** Labels the dancer has mentally assigned to other dancers, e.g. "partner", "neighbor", "shadow". */
    labels: ProtoDancerStateLabelsSchema,
    /** Dancers this dancer has interacted with recently, most recent first. */
    recents: z.array(DancerIdSchema),
  })
  .brand("ProtoDancerState");
export type ProtoDancerState = z.infer<typeof ProtoDancerStateSchema>;

export class Dancer {
  static [immerable] = true;

  readonly id: DancerId;
  worldState: WorldState;

  constructor(id: DancerId, state: WorldState) {
    this.id = id;
    this.worldState = state;
  }

  get rawProto(): ProtoDancerState {
    return this.worldState[this.protoId];
  }

  get pos(): Vector {
    return this.rawProto.pos.add(NORTH.multiply(this.offset * 2));
  }
  set pos(pos: Vector) {
    this.rawProto.pos = pos.subtract(NORTH.multiply(this.offset * 2));
  }

  get facing(): Vector {
    return this.rawProto.facing;
  }
  set facing(facing: Vector) {
    this.rawProto.facing = facing;
  }

  get hands(): Partial<Record<Hand, DancerHandPointer | undefined>> {
    return buildEnumRecord(HandSchema, (hand) => {
      const protoHeld = this.rawProto.hands[hand];
      if (!protoHeld) return undefined;
      return {
        theirId: addOffsetToId(protoHeld.theirId, this.offset),
        theirHand: protoHeld.theirHand,
      };
    });
  }
  set hands(hands: Partial<Record<Hand, DancerHandPointer>>) {
    this.rawProto.hands = buildHandsRecord((hand) => {
      const held = hands[hand];
      if (!held) return undefined;
      return {
        theirId: addOffsetToId(held.theirId, -this.offset),
        theirHand: held.theirHand,
      };
    });
  }

  get labels(): ProtoDancerState["labels"] {
    const protoLabels = this.rawProto.labels;
    return {
      partner: addOffsetToId(protoLabels.partner, this.offset),
      neighbor: addOffsetToId(protoLabels.neighbor, this.offset),
      ...Object.fromEntries(
        Object.entries(protoLabels).map(
          ([label, protosReferent]) =>
            [label, addOffsetToId(protosReferent, this.offset)] as const,
        ),
      ),
    };
  }
  set labels(labels: ProtoDancerState["labels"]) {
    this.rawProto.labels = {
      partner: addOffsetToId(labels.partner, -this.offset),
      neighbor: addOffsetToId(labels.neighbor, -this.offset),
      ...Object.fromEntries(
        Object.entries(labels).map(
          ([label, dancerReferent]) =>
            [label, addOffsetToId(dancerReferent, -this.offset)] as const,
        ),
      ),
    };
  }

  get recents(): DancerId[] {
    return this.rawProto.recents.map((rid) => addOffsetToId(rid, this.offset));
  }
  set recents(recents: DancerId[]) {
    this.rawProto.recents = recents.map((rid) =>
      addOffsetToId(rid, -this.offset),
    );
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
  isLark(): this is Lark {
    return this.role === "lark";
  }
  isRobin(): this is Robin {
    return this.role === "robin";
  }

  static get(id: DancerId, state: WorldState): Dancer {
    return new Dancer(id, state);
  }

  at(state: WorldState): Dancer {
    return new Dancer(this.id, state);
  }

  addOffset(deltaOffset: DancerOffset): Dancer {
    return new Dancer(addOffsetToId(this.id, deltaOffset), this.worldState);
  }

  resolveLabel(label: InfallibleLabel, opts?: ResolveLabelOpts): Dancer;
  resolveLabel(label: Label, opts?: ResolveLabelOpts): Dancer | undefined;
  resolveLabel(
    label: Label,
    { checkDistance = true }: ResolveLabelOpts = {},
  ): Dancer | undefined {
    const result = (() => {
      const s = this.worldState;
      // Intermediate lookups skip the distance check; only the final result is checked.
      const noCheck: ResolveLabelOpts = { checkDistance: false };
      if (label === "partner") {
        return Dancer.get(this.labels.partner, s);
      } else if (parses(NeighborLabelSchema, label)) {
        return Dancer.get(this.labels.neighbor, s).addOffset(
          neighborLabelOffsets[label] * getProgDirSign(this.id),
        );
      } else if (parses(OppositeLabelSchema, label)) {
        return Dancer.get(this.labels.neighbor, s)
          .addOffset(neighborLabelOffsets[label] * getProgDirSign(this.id))
          .resolveLabel("partner", noCheck);
      } else if (parses(ShadowLabelSchema, label)) {
        if (!this.labels[label]) return undefined;
        return Dancer.get(this.labels[label], s);
      } else if (label === "person_in_left_hand") {
        if (!this.hands["left"]) return undefined;
        return Dancer.get(this.hands["left"].theirId, s);
      } else if (label === "person_in_right_hand") {
        if (!this.hands["right"]) return undefined;
        return Dancer.get(this.hands["right"].theirId, s);
      } else {
        assertNever(label);
      }
    })();
    if (checkDistance && result && getDist(this.pos, result.pos) > 3.8) {
      throw new SnazzyError([
        { dancerId: this.id },
        " is too far from their ",
        { cid: labelId(label) },
        " to resolve them clearly",
      ]);
    }
    return result;
  }

  // ── Direction resolution ────────────────────────────────────────────

  resolvePureDirection(dir: PureDirection): Vector {
    switch (dir) {
      case "across":
      case "out":
      case "up":
      case "down":
        return must(resolveCardinalDirection(dir, this.pos), [
          { dancerId: this.id },
          `unable to resolve ${dir}`,
        ]);
      case "setclockwise":
        return must(resolveCardinalDirection("across", this.pos), [
          { dancerId: this.id },
          "unable to resolve setclockwise",
        ]).rotateByDegrees(90);
      case "setcounterclockwise":
        return must(resolveCardinalDirection("across", this.pos), [
          { dancerId: this.id },
          "unable to resolve setcounterclockwise",
        ]).rotateByDegrees(-90);
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
      default:
        assertNever(dir);
    }
  }

  resolveCalledDirection(
    dir: CalledDirection,
    opts: ResolveLabelOpts = {},
  ): Vector {
    switch (dir.type) {
      case "PureDirection":
        return this.resolvePureDirection(dir.dir);
      case "TowardsLabel": {
        const them = this.resolveLabel(dir.label, opts);
        if (!them)
          throw new SnazzyError([
            { dancerId: this.id },
            " has no ",
            { cid: labelId(dir.label) },
          ]);
        return getDir({ from: this.pos, to: them.pos });
      }
      case "TowardsPerson": {
        const pureDirVec = this.resolvePureDirection(dir.roughDir);
        const them = this.findDancerInDirection(pureDirVec);
        if (!them)
          throw new SnazzyError([
            { dancerId: this.id },
            " has nobody ",
            dir.roughDir,
          ]);
        return getDir({ from: this.pos, to: them.pos });
      }
      case "PerRole":
        return this.resolveCalledDirection(
          this.isLark() ? dir.larks : dir.robins,
          opts,
        );
      case "PerProgDir":
        return this.resolveCalledDirection(
          this.dir === "up" ? dir.ups : dir.downs,
          opts,
        );
      default:
        assertNever(dir);
    }
  }

  /** For a "towards" CalledDirection, resolves the target person. Returns undefined for pure directions. */
  resolveCalledDirectionTarget(
    dir: CalledDirection,
    opts: ResolveLabelOpts = {},
  ): Dancer | undefined {
    switch (dir.type) {
      case "PureDirection":
        return undefined;
      case "TowardsLabel":
        return this.resolveLabel(dir.label, opts) ?? undefined;
      case "TowardsPerson": {
        const pureDirVec = this.resolvePureDirection(dir.roughDir);
        return this.findDancerInDirection(pureDirVec) ?? undefined;
      }
      case "PerRole":
        return this.resolveCalledDirectionTarget(
          this.isLark() ? dir.larks : dir.robins,
          opts,
        );
      case "PerProgDir":
        return this.resolveCalledDirectionTarget(
          this.dir === "up" ? dir.ups : dir.downs,
          opts,
        );
      default:
        assertNever(dir);
    }
  }

  /** Find the dancer best described by "the person to your [...]", if any. */
  findDancerInCalledDirection(
    side: CalledDirection,
    opts: ResolveCalledIdentifierOpts = {},
  ): Dancer | undefined {
    const dir = this.resolveCalledDirection(side, opts);
    return this.findDancerInDirection(dir);
  }

  /** True when this dancer faces roughly away from the center line (x = 0). */
  facesOut({
    errMsg = [
      { dancerId: this.id },
      "too close to center, not sure which way is out",
    ],
  }: { errMsg?: SnazzySegment[] } = {}): boolean {
    return roughlySameDir(
      this.facing,
      must(resolveCardinalDirection("out", this.pos), errMsg),
    );
  }

  /** True when this dancer faces toward the center line (x = 0). */
  facesAcross({
    errMsg = [
      { dancerId: this.id },
      "too close to center, not sure which way is across",
    ],
  }: { errMsg?: SnazzySegment[] } = {}): boolean {
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
  ): Dancer | undefined {
    dir = dir.normalize();
    let bestScore = Infinity;
    let bestTarget: Dancer | undefined = undefined;

    for (const otherProtoId of ALL_PROTO_IDS) {
      if (otherProtoId === this.protoId) continue;
      const [targetRepresentative] = findNearbyDancers(
        this.pos,
        otherProtoId,
        this.worldState,
      );
      if (roles === "same" && targetRepresentative.role !== this.role) continue;
      if (roles === "different" && targetRepresentative.role === this.role)
        continue;

      for (let o = -5; o <= 5; o++) {
        const target = targetRepresentative.addOffset(o);
        const disp = target.pos.subtract(this.pos);
        const r = disp.length();
        if (r > 2.8 || r < 1e-9) continue;

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

  static readonly dirFudges: Partial<Record<PureDirection, number>> = {
    on_right: 0.2,
    on_left: 0.2,
  };
  resolveCalledIdentifier(
    cid: CalledIdentifier,
    opts: ResolveCalledIdentifierOpts = {},
  ): Dancer | undefined {
    switch (cid.type) {
      case "label":
        return this.resolveLabel(cid.label, opts) ?? undefined;
      case "PersonInDirection": {
        const pureDirVec = this.resolvePureDirection(cid.dir);

        // If the caller says "on your right" dancers will intuitively resolve that to "the person 60deg to my right" more than "the person 120deg to my right"
        // even though those are the same angle from "my right". So, for "right" and "left", special case, we fudge a bit towards the dancer's facing dir.
        const dir = lerpFacing(
          pureDirVec,
          this.facing,
          Dancer.dirFudges[cid.dir] ?? 0,
        );
        return this.findDancerInDirection(dir, {
          roles: cid.onlyRole,
          ...opts,
        });
      }
      case "PerRole":
        return this.resolveCalledIdentifier(
          this.isLark() ? cid.larks : cid.robins,
          opts,
        );
      case "PerProgDir":
        return this.resolveCalledIdentifier(
          this.dir === "up" ? cid.ups : cid.downs,
          opts,
        );
      default:
        assertNever(cid);
    }
  }

  /** Resolves this dancer's "match" for a figure where dancers pair up. */
  resolveMatch(
    cid: CalledIdentifier,
    opts: ResolveCalledIdentifierOpts = {},
  ): Dancer {
    const res = this.resolveCalledIdentifier(cid, opts);
    if (!res)
      throw new SnazzyError([{ dancerId: this.id }, " can't find ", { cid }]);
    const symm = res.resolveCalledIdentifier(cid, opts);
    if (!symm)
      throw new SnazzyError([{ dancerId: res.id }, " can't find ", { cid }]);
    if (symm.id !== this.id)
      throw new SnazzyError([
        "asymmetry pairing dancers up: ",
        { dancerId: this.id },
        " thinks ",
        { cid },
        " is ",
        { dancerId: res.id },
        ", who thinks ",
        { cid },
        " is ",
        { dancerId: symm.id },
      ]);
    return res;
  }
}

export type WorldState = Record<ProtoId, ProtoDancerState>;

/** Connects two hands of two dancers. Throws an error if the hands are already in use, unless they are already paired with each other. */
export function connectHands(
  state: WorldState,
  id: ProtoId,
  hand: Hand,
  theirId: DancerId,
  theirHand: Hand,
): void {
  if (projectDancerIdToProtoId(theirId) === id) {
    throw new SnazzyError([
      { dancerId: id },
      " cannot connect hands to ",
      { dancerId: theirId },
      " (same proto)",
    ]);
  }
  const holding = state[id].hands[hand];
  if (holding) {
    if (isEqual(holding, { theirId, theirHand })) {
      return;
    }
    throw new SnazzyError([
      { dancerId: id },
      `'s ${hand} hand is already holding `,
      { dancerId: holding.theirId },
      `'s ${holding.theirHand}, so can't grab `,
      { dancerId: theirId },
      `'s ${theirHand} hand`,
    ]);
  }

  const them = Dancer.get(theirId, state);
  const themHolding = them.hands[theirHand];
  if (themHolding) {
    if (isEqual(themHolding, { theirId: id, theirHand: hand })) {
      return;
    }
    throw new SnazzyError([
      { dancerId: theirId },
      `'s ${theirHand} hand is already holding `,
      { dancerId: themHolding.theirId },
      `'s ${themHolding.theirHand}, so `,
      { dancerId: id },
      ` can't grab it in their ${hand}`,
    ]);
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
  if (!holding)
    throw new SnazzyError([
      { dancerId: id },
      `'s ${hand} hand is not connected`,
    ]);
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

export function getDancerSide(
  dancer: Dancer,
  {
    errMsg = [
      { dancerId: dancer.id },
      "too close to center, refusing to guess which side they're supposed to be on",
    ],
  }: { errMsg?: SnazzySegment[] } = {},
): "east" | "west" {
  return must(getSide(dancer.pos), errMsg);
}

export function avgPos(...dancers: Dancer[]): Vector {
  return dancers
    .reduce((acc, d) => acc.add(d.pos), new Vector(0, 0))
    .divide(dancers.length);
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
      throw new SnazzyError([
        { dancerId: id },
        ` has a crazy facing: ${dancer.facing.x}, ${dancer.facing.y}`,
      ]);
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
      throw new SnazzyError([
        { dancerId: id },
        ` has a crazy position: ${dancer.pos.x}, ${dancer.pos.y}`,
      ]);
    }
    if (!dancer.labels["neighbor"])
      throw new SnazzyError([
        { dancerId: id },
        " has no ",
        { cid: labelId("neighbor") },
      ]);
    for (const label of IrreducibleLabelSchema.options) {
      const theirId = dancer.labels[label];
      if (!theirId) continue;
      const theirSymmetricPointer = Dancer.get(theirId, state).labels[label];
      if (theirSymmetricPointer !== id)
        throw new SnazzyError([
          { dancerId: id },
          "'s ",
          { cid: labelId(label) },
          " thinks their ",
          { cid: labelId(label) },
          ` is ${theirSymmetricPointer} -- this should never be asymmetric!`,
        ]);
    }
    for (const hand of HandSchema.options) {
      const holding = dancer.hands[hand];
      if (!holding) continue;
      const { theirId, theirHand } = holding;
      const them = Dancer.get(theirId, state);
      const theirSymmetricPointer = them.hands[theirHand];
      if (!isEqual(theirSymmetricPointer, { theirId: id, theirHand: hand }))
        throw new SnazzyError([
          { dancerId: id },
          ` thinks their ${hand} hand is holding `,
          { dancerId: theirId },
          `'s ${theirHand}, but they think that that's holding ${theirSymmetricPointer == null ? "nothing" : `${theirSymmetricPointer.theirId}'s ${theirSymmetricPointer.theirHand}`}`,
        ]);
      if (getDist(them.pos, dancer.pos) > 2) {
        throw new SnazzyError([
          { dancerId: id },
          ` and `,
          { dancerId: theirId },
          ` are holding hands, but super far away from each other`,
        ]);
      }
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
    throw new SnazzyError([
      "Cannot set ",
      { cid: labelId(label) },
      " of ",
      { dancerId: protoId },
      " to ",
      { dancerId },
      " (same proto)",
    ]);
  }

  if (dancerRole === protoRole) {
    throw new SnazzyError([
      "Cannot set ",
      { cid: labelId(label) },
      " of ",
      { dancerId: protoId },
      " to ",
      { dancerId },
      " (same role)",
    ]);
  }

  if (label === "neighbor") {
    if (dancerDir === protoDir) {
      throw new SnazzyError([
        "Cannot set ",
        { cid: labelId(label) },
        " of ",
        { dancerId: protoId },
        " to ",
        { dancerId },
        " (same progression direction)",
      ]);
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
      throw new SnazzyError([
        "Cannot set ",
        { cid: labelId(label) },
        " of ",
        { dancerId: protoId },
        " to ",
        { dancerId },
        " (different progression direction)",
      ]);
    }
    const existingShadow = state[protoId].labels[label];
    if (existingShadow && existingShadow !== dancerId) {
      throw new SnazzyError([
        "Shadows should never change: ",
        { dancerId: protoId },
        " already has ",
        { cid: labelId(label) },
        ` ${existingShadow}, can't set to `,
        { dancerId },
      ]);
    }

    if (getOffset(dancerId) === getOffset(protoId)) {
      throw new SnazzyError([
        { dancerId: protoId },
        " should know ",
        { dancerId },
        " as their ",
        { cid: labelId("partner") },
        ", not their ",
        { cid: labelId(label) },
      ]);
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

export function findNearbyDancers(
  pos: Vector,
  protoId: ProtoId,
  state: WorldState,
): [Dancer, Dancer] {
  const below: DancerOffset = Math.floor((pos.y - state[protoId].pos.y) / 2);
  const above = below + 1;

  const dancers: [Dancer, Dancer] = [
    Dancer.get(protoIdToDancerId(protoId, below), state),
    Dancer.get(protoIdToDancerId(protoId, above), state),
  ];

  dancers.sort(
    (a, b) => a.pos.subtract(pos).length() - b.pos.subtract(pos).length(),
  );

  return dancers;
}

export const WorldStateSchema = z.object({
  up_lark_0: ProtoDancerStateSchema,
  up_robin_0: ProtoDancerStateSchema,
  down_lark_0: ProtoDancerStateSchema,
  down_robin_0: ProtoDancerStateSchema,
});

export function mapWorldState(
  init: WorldState,
  mutate: (dancer: Dancer) => void,
): WorldState {
  return produce(init, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      const dancer = Dancer.get(id, draft);
      mutate(dancer);
    }
  });
}

export function getCycle(
  dancer: Dancer,
  next: (d: Dancer) => Dancer,
): NTuple<4, Dancer> {
  const r = next(dancer);
  const rr = next(r);
  const rrr = next(rr);
  const rrrr = next(rrr);

  if (rrrr.id !== dancer.id)
    throw new SnazzyError([
      "getCycle: cycle does not end at the starting dancer",
      { dancerId: dancer.id },
      " -> ",
      { dancerId: r.id },
      " -> ",
      { dancerId: rr.id },
      " -> ",
      { dancerId: rrr.id },
      " -> ",
      { dancerId: rrrr.id },
      " !== ",
      { dancerId: dancer.id },
    ]);

  const res: NTuple<4, Dancer> = [dancer, r, rr, rrr];
  if (new Set(res.map((d) => d.id)).size !== 4)
    throw new SnazzyError([
      "getCycle: cycle has duplicate dancers",
      ...res.map((d) => ({ dancerId: d.id })),
    ]);

  return res;
}
