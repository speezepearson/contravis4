import { Vector } from "vecti";

import { ALL_PROTO_IDS, isLark, isRobin, type ProtoId } from "../contraCore";
import { getDist } from "../geometry";
import { SnazzyError } from "../snazzyError";
import {
  circularDistance,
  getSide,
  indexOf,
  must,
  safeThreshold,
} from "../utils";
import {
  Dancer,
  findNearbyDancers,
  getDancerSide,
  type WorldState,
} from "../worldState";
import { personInDir } from "./_base";
import {
  addDancerDrift,
  evaluatePlansFinalState,
  type PlanGetter,
} from "./_plan";
// ── Plan-based fudge utilities ────────────────────────────────────────

/**
 * Plan-based equivalent of `fudgeToAlignY`.
 * Eagerly evaluates all dancers' plans, computes y-alignment drifts, and
 * returns a new PlanGetter whose plans include the drift.
 */
export function fudgePlansToAlignY(
  getPlan: PlanGetter,
  init: WorldState,
): PlanGetter {
  const allProtos: ReadonlySet<ProtoId> = new Set(ALL_PROTO_IDS);

  const finalState = evaluatePlansFinalState(init, allProtos, getPlan);

  const westLark = must(
    ALL_PROTO_IDS.find(
      (id) =>
        isLark(id) &&
        must(getSide(Dancer.get(id, finalState).pos), [
          { dancerId: id },
          "is too close to center",
        ]) === "west",
    ),
    [`no lark on the west side`],
  );
  const westRobin = must(
    ALL_PROTO_IDS.find(
      (id) =>
        isRobin(id) &&
        must(getSide(Dancer.get(id, finalState).pos), [
          { dancerId: id },
          "is too close to center",
        ]) === "west",
    ),
    ["no robin on the west side"],
  );
  const eastLark = must(
    ALL_PROTO_IDS.find(
      (id) =>
        isLark(id) &&
        must(getSide(Dancer.get(id, finalState).pos), [
          { dancerId: id },
          "is too close to center",
        ]) === "east",
    ),
    ["no lark on the east side"],
  );
  const eastRobin = must(
    ALL_PROTO_IDS.find(
      (id) =>
        isRobin(id) &&
        must(getSide(Dancer.get(id, finalState).pos), [
          { dancerId: id },
          "is too close to center",
        ]) === "east",
    ),
    ["no robin on the east side"],
  );

  const westIds: ProtoId[] = [westLark, westRobin];

  const dyWestLarkToNearestEastRobin = findDyToNearest(
    westLark,
    eastRobin,
    finalState,
    init,
  );
  const dyWestRobinToNearestEastLark = findDyToNearest(
    westRobin,
    eastLark,
    finalState,
    init,
  );

  if (
    Math.abs(dyWestLarkToNearestEastRobin - dyWestRobinToNearestEastLark) > 0.01
  ) {
    throw new Error(
      `[fudgePlansToAlignY] dy values differ: westLark→eastRobin=${dyWestLarkToNearestEastRobin}, westRobin→eastLark=${dyWestRobinToNearestEastLark}`,
    );
  }

  const dyFudgeWest = dyWestLarkToNearestEastRobin / 2;
  const dyFudgeEast = -dyFudgeWest;

  const getDriftedPlan = (d: Dancer) => {
    const basePlan = getPlan(d);
    const dy = westIds.includes(d.protoId) ? dyFudgeWest : dyFudgeEast;
    return addDancerDrift(
      basePlan,
      d.pos,
      (globalFrac) => new Vector(0, dy * globalFrac),
    );
  };

  // Verify: after drift, each dancer's across-match should share the same y.
  const resultFinalState = evaluatePlansFinalState(
    init,
    allProtos,
    getDriftedPlan,
  );
  for (const id of ALL_PROTO_IDS) {
    const dancer = Dancer.get(id, resultFinalState);
    const match = dancer.resolveMatch(personInDir("across", "different"));
    if (Math.abs(dancer.pos.y - match.pos.y) > 0.01) {
      throw new SnazzyError([
        "[fudgePlansToAlignY] after fudge, ",
        { dancerId: id },
        ` at y=${dancer.pos.y} is not aligned with across-match `,
        { dancerId: match.id },
        ` at y=${match.pos.y}`,
      ]);
    }
  }

  return getDriftedPlan;
}

/**
 * Plan-based equivalent of `fudgeToSpaceEvenlyInY`.
 * Eagerly evaluates all dancers' plans, computes even-spacing drifts, and
 * returns a new PlanGetter whose plans include the drift.
 */
export function fudgePlansToSpaceEvenlyInY(
  getPlan: PlanGetter,
  init: WorldState,
): PlanGetter {
  const allProtos: ReadonlySet<ProtoId> = new Set(ALL_PROTO_IDS);

  const finalState = evaluatePlansFinalState(init, allProtos, getPlan);

  // Partition dancers by side
  const west: ProtoId[] = [];
  const east: ProtoId[] = [];
  for (const id of ALL_PROTO_IDS) {
    const side = getDancerSide(Dancer.get(id, finalState));
    if (side === "west") west.push(id);
    else east.push(id);
  }
  if (west.length !== 2) {
    throw new Error(
      `[fudgePlansToSpaceEvenlyInY] expected 2 dancers on west, got ${west.length}`,
    );
  }
  if (east.length !== 2) {
    throw new Error(
      `[fudgePlansToSpaceEvenlyInY] expected 2 dancers on east, got ${east.length}`,
    );
  }

  const westFudges = computeEvenSpacingFudge(
    finalState[west[0]].pos.y,
    finalState[west[1]].pos.y,
  );
  const eastFudges = computeEvenSpacingFudge(
    finalState[east[0]].pos.y,
    finalState[east[1]].pos.y,
  );

  const getSpacingDrift = (d: Dancer): number => {
    const side = getDancerSide(Dancer.get(d.protoId, finalState));
    const ids = side === "west" ? west : east;
    const fudges = side === "west" ? westFudges : eastFudges;
    return fudges[must(indexOf(ids, d.protoId))];
  };

  const getDriftedPlan = (d: Dancer) => {
    const basePlan = getPlan(d);
    const dy = getSpacingDrift(d);
    return addDancerDrift(
      basePlan,
      d.pos,
      (globalFrac) => new Vector(0, dy * globalFrac),
    );
  };

  // Verify: each side should have circular distance 1
  const resultFinalState = evaluatePlansFinalState(
    init,
    allProtos,
    getDriftedPlan,
  );
  for (const [label, ids] of [
    ["west", west],
    ["east", east],
  ] as const) {
    const y0 = resultFinalState[ids[0]].pos.y;
    const y1 = resultFinalState[ids[1]].pos.y;
    const dist = circularDistance(y0, y1, 2);
    if (Math.abs(dist - 1) > 0.01) {
      throw new Error(
        `[fudgePlansToSpaceEvenlyInY] after fudge, ${label} side has circular distance ${dist.toFixed(4)}, expected 1`,
      );
    }
  }

  return getDriftedPlan;
}

/**
 * Given two y-coordinates on one side of the set, compute the dy fudge for each
 * so that their circular distance (mod 2) becomes exactly 1.
 * Returns [dy1, dy2] where dy1 + dy2 = 0.
 */
export function computeEvenSpacingFudge(
  y1: number,
  y2: number,
): [number, number] {
  // d = ((y1 - y2) mod 2 + 2) mod 2, i.e. the mod-2 offset from y2 to y1
  const d = (((y1 - y2) % 2) + 2) % 2;
  // When d <= 1, circular distance = d, y1 is "ahead" of y2 by d.
  // When d > 1, circular distance = 2-d, y2 is "ahead" of y1 by 2-d.
  // In both cases, pushing y1 by +(1-d)/2 and y2 by -(1-d)/2 achieves distance 1.
  const dy1 = (1 - d) / 2;
  return [dy1, -dy1];
}

/**
 * Finds the dy from `fromProto`'s final position to the nearest offset of `toProto`'s final position.
 * Uses safeThreshold for distance comparison, with recency tiebreaking.
 */
function findDyToNearest(
  fromProto: ProtoId,
  toProto: ProtoId,
  finalState: WorldState,
  init: WorldState,
): number {
  const fromPos = Dancer.get(fromProto, finalState).pos;
  const [candidate0, candidate1] = findNearbyDancers(
    fromPos,
    toProto,
    finalState,
  );

  const dist0 = getDist(fromPos, candidate0.pos);
  const dist1 = getDist(fromPos, candidate1.pos);

  const chosen = (() => {
    const res = safeThreshold(dist0 - dist1, {
      neg: candidate0,
      pos: candidate1,
    });
    if (res) return res;

    // Tiebreak by recency: prefer the more recently interacted-with candidate
    const recents = init[fromProto].recents;
    const recency0 = indexOf(recents, candidate0.id) ?? Infinity;
    const recency1 = indexOf(recents, candidate1.id) ?? Infinity;
    if (recency0 < recency1) return candidate0;
    if (recency1 < recency0) return candidate1;
    throw new SnazzyError([
      "[fudgeToAlignY] ",
      { dancerId: fromProto },
      " can't determine nearest copy of ",
      { dancerId: toProto },
      "; candidates ",
      { dancerId: candidate0.id },
      ", ",
      { dancerId: candidate1.id },
      " are equidistant and equally recent",
    ]);
  })();

  return chosen.pos.y - fromPos.y;
}
