import {
  ALL_PROTO_IDS,
  type DancerId,
  getRole,
  otherRole,
  type ProtoId,
} from "./contraCore";
import { getDist } from "./geometry";
import { SnazzyError } from "./snazzyError";
import {
  getSide,
  getSingleton,
  indexOf,
  isNTuple,
  must,
  type NTuple,
  otherSide,
  safeThreshold,
} from "./utils";
import {
  buildProtoRecord,
  Dancer,
  findNearbyDancers,
  getDancerSide,
  type WorldState,
} from "./worldState";

export function resolveRings(
  state: WorldState,
): Record<ProtoId, NTuple<4, DancerId>> {
  const getRH = (id: DancerId) =>
    must(
      Dancer.get(id, state).resolveCalledIdentifier("person_in_right_hand"),
      [{ dancerId: id }, "has nobody in their right hand"],
    );
  return buildProtoRecord((id) => {
    const r = getRH(id);
    const rr = getRH(r.id);
    const rrr = getRH(rr.id);
    const rrrr = getRH(rrr.id);
    if (rrrr.id !== id)
      throw new SnazzyError([
        "[rings] following right hands: ",
        { dancerId: id },
        " -> ",
        { dancerId: r.id },
        " -> ",
        { dancerId: rr.id },
        " -> ",
        { dancerId: rrr.id },
        " -> ",
        { dancerId: rrrr.id },
        " !== ",
        { dancerId: id },
      ]);

    const ring: NTuple<4, DancerId> = [id, r.id, rr.id, rrr.id];
    if (!(new Set(ring).size === 4))
      throw new SnazzyError([
        "[rings] following right hands: ",
        { dancerId: id },
        " -> ",
        { dancerId: r.id },
        " -> ",
        { dancerId: rr.id },
        " -> ",
        { dancerId: rrr.id },
        " -> ",
        { dancerId: rrrr.id },
        " -> ... does not contain 4 people",
      ]);
    return ring;
  });
}
export function resolveShortLines(
  state: WorldState,
): Record<ProtoId, NTuple<4, DancerId>> {
  return buildProtoRecord((protoId) => {
    const line = Object.values(
      getGroupOfFour(Dancer.get(protoId, state), { by: [] }),
    );
    for (const d of line) {
      if (Math.abs(d.pos.y - state[protoId].pos.y) > 0.5) {
        throw new SnazzyError([
          "resolveShortLines: closest copy of ",
          { dancerId: d.id },
          ` is ${Math.abs(d.pos.y - state[protoId].pos.y).toFixed(3)} away in y from `,
          { dancerId: protoId },
          " (max 0.5)",
        ]);
      }
    }

    line.sort((a, b) => a.pos.x - b.pos.x);
    const res = line.map((c) => c.id);
    if (!isNTuple(res, 4))
      throw new Error(
        `resolveShortLines: line has ${line.length} dancers, not 4`,
      );
    return res;
  });
}

/**
 * Find the closest opposite-role dancer on the same side of the set as `d`.
 * Tiebreaking: distance → facing alignment → recency.
 */
export function findBestOppRole(
  d: Dancer,
  {
    by,
    sides,
  }: {
    by: Array<"distance" | "facing" | "recency">;
    sides: "same" | "different";
  },
): Dancer {
  const state = d.worldState;
  const dSide = getDancerSide(d);
  const wantSide = { same: dSide, different: otherSide(dSide) }[sides];
  const nearby = findNearbyDancers(d.pos, state);

  const sameSideOppRoleProtos = ALL_PROTO_IDS.filter(
    (protoId) =>
      getRole(protoId) !== d.role && getSide(state[protoId].pos) === wantSide,
  );
  const sameSideOppRoleProto = must(getSingleton(sameSideOppRoleProtos), [
    { dancerId: d.id },
    ` wants exactly one ${otherRole(d.role)} on their side, but found ${sameSideOppRoleProtos.length}: `,
    ...sameSideOppRoleProtos.map((protoId) => ({ dancerId: protoId })),
  ]);

  const candidates = nearby[sameSideOppRoleProto];

  for (const tiebreakerName of by) {
    const tiebreaker = tiebreakerByName[tiebreakerName];
    const res = tiebreaker(d, [candidates[0], candidates[1]]);
    if (res) return res;
  }
  throw new SnazzyError([
    { dancerId: d.id },
    " can't determine best opposite-role dancer on the same side; ",
    ...by.map((b) => `(by ${b})`),
    " are all tied",
  ]);
}

const tiebreakerByName = {
  distance: chooseSameSideMatchByDistance,
  facing: chooseSameSideMatchByFacing,
  recency: chooseSameSideMatchByRecency,
};
export function chooseSameSideMatchByDistance(
  d: Dancer,
  [cand1, cand2]: [Dancer, Dancer],
): Dancer | undefined {
  const dist1 = getDist(d.pos, cand1.pos);
  const dist2 = getDist(d.pos, cand2.pos);
  return safeThreshold(dist1 - dist2, { neg: cand1, pos: cand2, tol: 0.2 });
}
export function chooseSameSideMatchByFacing(
  d: Dancer,
  [cand1, cand2]: [Dancer, Dancer],
): Dancer | undefined {
  const facing1 = Math.max(0, d.facing.dot(cand1.pos.subtract(d.pos)));
  const facing2 = Math.max(0, d.facing.dot(cand2.pos.subtract(d.pos)));
  return safeThreshold(facing1 - facing2, { neg: cand2, pos: cand1 });
}
export function chooseSameSideMatchByRecency(
  d: Dancer,
  [cand1, cand2]: [Dancer, Dancer],
): Dancer | undefined {
  const rec1 = indexOf(d.recents, cand1.id) ?? Infinity;
  const rec2 = indexOf(d.recents, cand2.id) ?? Infinity;
  if (rec1 < rec2) return cand1;
  if (rec2 < rec1) return cand2;
  return undefined;
}

function getGroupOfFourCore(
  d: Dancer,
  { by }: { by: Array<"facing" | "recency"> },
): Record<ProtoId, Dancer> {
  const nearby = findNearbyDancers(d.pos, d.worldState);
  return buildProtoRecord((id) => {
    if (id === d.id) return d;

    const cands = nearby[id];

    const closest = chooseSameSideMatchByDistance(d, cands);
    if (closest) return closest;

    for (const tiebreakerName of by) {
      const tiebreaker = tiebreakerByName[tiebreakerName];
      const res = tiebreaker(d, cands);
      if (res) return res;
    }
    throw new SnazzyError([
      { dancerId: d.id },
      " can't determine best opposite-role dancer on the same side; ",
      ...by.map((b) => `(by ${b})`),
      " are all tied for ",
      { dancerId: id },
    ]);
  });
}

/**
 * Returns the group of four dancers that `d` belongs to:
 * d, the opposite-role dancer across from d, the "best" opposite-role dancer
 * on d's side of the set (d2), and the opposite-role dancer across from d2.
 *
 * Verifies that calling this on any member produces the same group.
 */
export function getGroupOfFour(
  d: Dancer,
  { by }: { by: Array<"facing" | "recency"> },
): Record<ProtoId, Dancer> {
  const group = getGroupOfFourCore(d, { by });
  const groupIds = new Set(Object.values(group).map((g) => g.id));
  for (const member of Object.values(group)) {
    if (member.id === d.id) continue;
    const memberD = Dancer.get(member.id, d.worldState);
    const otherGroup = getGroupOfFourCore(memberD, { by });
    const otherIds = new Set(Object.values(otherGroup).map((g) => g.id));
    if (![...groupIds].every((id) => otherIds.has(id))) {
      throw new SnazzyError([
        "getGroupOfFour inconsistency: ",
        { dancerId: d.id },
        " and ",
        { dancerId: member.id },
        " disagree on group membership: ",
        ...Object.values(group).map((g) => ({ dancerId: g.id })),
        " vs ",
        ...Object.values(otherGroup).map((g) => ({ dancerId: g.id })),
      ]);
    }
  }

  return group;
}
