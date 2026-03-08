import {
  ALL_PROTO_IDS,
  type DancerId,
  getRole,
  type ProtoId,
  protoIdToDancerId,
} from "./contraCore";
import { getDist } from "./geometry";
import { SnazzyError } from "./snazzyError";
import {
  getSide,
  indexOf,
  isNTuple,
  must,
  type NTuple,
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
    const protoY = state[protoId].pos.y;

    const line: { id: DancerId; x: number }[] = [];

    for (const otherProtoId of ALL_PROTO_IDS) {
      const dyBase = state[otherProtoId].pos.y - protoY;
      const oBest = Math.round(-dyBase / 2);

      // Find the offset copy closest in y
      let bestId: DancerId | null = null;
      let bestYDist = Infinity;
      let bestX = 0;
      for (let o = oBest - 1; o <= oBest + 1; o++) {
        const id = protoIdToDancerId(otherProtoId, o);
        const target = Dancer.get(id, state);
        const yDist = Math.abs(target.pos.y - protoY);
        if (yDist < bestYDist) {
          bestId = id;
          bestYDist = yDist;
          bestX = target.pos.x;
        }
      }

      if (bestYDist > 0.5) {
        throw new SnazzyError([
          "resolveShortLines: closest copy of ",
          { dancerId: otherProtoId },
          ` is ${bestYDist.toFixed(3)} away in y from `,
          { dancerId: protoId },
          " (max 0.5)",
        ]);
      }

      line.push({ id: bestId!, x: bestX });
    }

    line.sort((a, b) => a.x - b.x);
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
export function findClosestOppRoleSameSide(d: Dancer): Dancer {
  const state = d.state;
  const side = getDancerSide(d);
  const nearby = findNearbyDancers(d.pos, state);

  const candidates: Dancer[] = [];
  for (const protoId of ALL_PROTO_IDS) {
    if (getRole(protoId) === d.role) continue;
    for (const candidate of nearby[protoId]) {
      if (getSide(candidate.pos) === side) candidates.push(candidate);
    }
  }

  if (candidates.length === 0) {
    throw new SnazzyError([
      { dancerId: d.id },
      " has no opposite-role dancer on the same side",
    ]);
  }

  return candidates.reduce((best, challenger) =>
    pickCloserOppRole(d, best, challenger),
  );
}

function pickCloserOppRole(d: Dancer, a: Dancer, b: Dancer): Dancer {
  // 1. Distance
  const distA = getDist(d.pos, a.pos);
  const distB = getDist(d.pos, b.pos);
  const byDist = safeThreshold(distA - distB, { neg: a, pos: b });
  if (byDist) return byDist;

  // 2. Facing alignment: prefer the candidate more in the direction d faces
  const dotA = d.facing.dot(a.pos.subtract(d.pos));
  const dotB = d.facing.dot(b.pos.subtract(d.pos));
  const byFacing = safeThreshold(dotA - dotB, { neg: b, pos: a });
  if (byFacing) return byFacing;

  // 3. Recency
  const recA = indexOf(d.recents, a.id) ?? Infinity;
  const recB = indexOf(d.recents, b.id) ?? Infinity;
  if (recA < recB) return a;
  if (recB < recA) return b;

  throw new SnazzyError([
    { dancerId: d.id },
    " can't determine closest same-side opposite-role dancer; ",
    { dancerId: a.id },
    " and ",
    { dancerId: b.id },
    " are equidistant, equi-facing, and equally recent",
  ]);
}

function getGroupOfFourCore(d: Dancer): NTuple<4, Dancer> {
  // 1. d
  // 2. opposite-role dancer across the set
  const across = d.resolveMatch("person_across", { roles: "different" });
  // 3. closest opposite-role on same side
  const d2 = findClosestOppRoleSameSide(d);
  // 4. dancer across from d2 with opposite role from d2
  const d2Live = Dancer.get(d2.id, d.state);
  const d2Across = d2Live.resolveMatch("person_across", { roles: "different" });
  return [d, across, d2, d2Across];
}

/**
 * Returns the group of four dancers that `d` belongs to:
 * d, the opposite-role dancer across from d, the closest opposite-role dancer
 * on d's side of the set (d2), and the opposite-role dancer across from d2.
 *
 * Verifies that calling this on any member produces the same group.
 */
export function getGroupOfFour(d: Dancer): NTuple<4, Dancer> {
  const group = getGroupOfFourCore(d);
  const groupIds = new Set(group.map((g) => g.id));

  for (const member of group) {
    if (member.id === d.id) continue;
    const memberD = Dancer.get(member.id, d.state);
    const otherGroup = getGroupOfFourCore(memberD);
    const otherIds = new Set(otherGroup.map((g) => g.id));
    if (
      groupIds.size !== otherIds.size ||
      ![...groupIds].every((id) => otherIds.has(id))
    ) {
      throw new SnazzyError([
        "getGroupOfFour inconsistency: ",
        { dancerId: d.id },
        " and ",
        { dancerId: member.id },
        " disagree on group membership",
      ]);
    }
  }

  return group;
}
