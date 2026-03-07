import { Vector } from "vecti";

import { ALL_PROTO_IDS, isLark, isRobin, type ProtoId } from "../contraCore";
import { getDist } from "../geometry";
import { getSide, indexOf, must, safeThreshold } from "../utils";
import { Dancer, findNearbyDancers, type WorldState } from "../worldState";
import { addPositionDrift, advanceState, type Segment } from "./_segment";

/**
 * Adds drift to every dancer's position over the given segments, such that everybody ends up directly across the set from a dancer of the opposite role.
 */
export function fudgeToAlignY(
  segments: Segment[],
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): Segment[] {
  const finalState = advanceState(segments, init, who);

  const westLark = must(
    ALL_PROTO_IDS.find(
      (id) =>
        isLark(id) &&
        must(
          getSide(Dancer.get(id, finalState).pos),
          `[fudgeToAlignY] lark ${id} is too close to center`,
        ) === "west",
    ),
    `[fudgeToAlignY] no lark on the west side`,
  );
  const westRobin = must(
    ALL_PROTO_IDS.find(
      (id) =>
        isRobin(id) &&
        must(
          getSide(Dancer.get(id, finalState).pos),
          `[fudgeToAlignY] robin ${id} is too close to center`,
        ) === "west",
    ),
    `[fudgeToAlignY] no robin on the west side`,
  );
  const eastLark = must(
    ALL_PROTO_IDS.find(
      (id) =>
        isLark(id) &&
        must(
          getSide(Dancer.get(id, finalState).pos),
          `[fudgeToAlignY] lark ${id} is too close to center`,
        ) === "east",
    ),
    `[fudgeToAlignY] no lark on the east side`,
  );
  const eastRobin = must(
    ALL_PROTO_IDS.find(
      (id) =>
        isRobin(id) &&
        must(
          getSide(Dancer.get(id, finalState).pos),
          `[fudgeToAlignY] robin ${id} is too close to center`,
        ) === "east",
    ),
    `[fudgeToAlignY] no robin on the east side`,
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
      `[fudgeToAlignY] dy values differ: westLark→eastRobin=${dyWestLarkToNearestEastRobin}, westRobin→eastLark=${dyWestRobinToNearestEastLark}`,
    );
  }

  const dyFudgeWest = dyWestLarkToNearestEastRobin / 2;
  const dyFudgeEast = -dyFudgeWest;

  const result = addPositionDrift(segments, (id, globalFrac) => {
    const dy = westIds.includes(id) ? dyFudgeWest : dyFudgeEast;
    return new Vector(0, dy * globalFrac);
  });

  // Verify: after drift, each dancer's across-match (different role) should share the same y.
  const resultFinalState = advanceState(result, init, who);
  for (const id of ALL_PROTO_IDS) {
    const dancer = Dancer.get(id, resultFinalState);
    const matchId = dancer.resolveMatch("person_across", {
      roles: "different",
    });
    const matchPos = Dancer.get(matchId, resultFinalState).pos;
    if (Math.abs(dancer.pos.y - matchPos.y) > 0.01) {
      throw new Error(
        `[fudgeToAlignY] after fudge, ${id} at y=${dancer.pos.y} is not aligned with across-match ${matchId} at y=${matchPos.y}`,
      );
    }
  }

  return result;
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
  const [candidate0, candidate1] = findNearbyDancers(fromPos, finalState)[
    toProto
  ];

  const dist0 = getDist(fromPos, candidate0.pos);
  const dist1 = getDist(fromPos, candidate1.pos);

  const chosen = (() => {
    try {
      return must(
        safeThreshold(dist0 - dist1, {
          neg: candidate0,
          pos: candidate1,
        }),
        `[fudgeToAlignY] can't determine nearest ${toProto} to ${fromProto}`,
      );
    } catch {
      // Tiebreak by recency: prefer the more recently interacted-with candidate
      const recents = init[fromProto].recents;
      const recency0 = indexOf(recents, candidate0.id) ?? Infinity;
      const recency1 = indexOf(recents, candidate1.id) ?? Infinity;
      if (recency0 < recency1) return candidate0;
      if (recency1 < recency0) return candidate1;
      throw new Error(
        `[fudgeToAlignY] ${fromProto} can't determine nearest ${toProto}; candidates ${candidate0.id}, ${candidate1.id} are equidistant and equally recent`,
      );
    }
  })();

  return chosen.pos.y - fromPos.y;
}
