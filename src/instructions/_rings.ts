import { Vector } from "vecti";

import { type DancerId, type ProtoId } from "../contraCore";
import { must } from "../utils";
import {
  buildProtoRecord,
  getDancerState,
  type WorldState,
} from "../worldState";

/** Follow right-hand connections to discover each dancer's ring.
 *  Throws if any ring is not exactly 4 dancers. */
export function findRings(state: WorldState): Record<ProtoId, Set<DancerId>> {
  return buildProtoRecord((id) => {
    const { theirId: r } = must(getDancerState(id, state).hands.get("right"));
    const { theirId: rr } = must(getDancerState(r, state).hands.get("right"));
    const { theirId: rrr } = must(getDancerState(rr, state).hands.get("right"));
    const { theirId: rrrr } = must(
      getDancerState(rrr, state).hands.get("right"),
    );
    if (rrrr !== id) {
      throw new Error(
        `Ring starting at ${id} does not close after 4 steps (got ${rrrr})`,
      );
    }
    if (new Set([id, r, rr, rrr]).size !== 4) {
      throw new Error(
        `Ring starting at ${id} has duplicate members: ${[id, r, rr, rrr].join(", ")}`,
      );
    }
    return new Set<DancerId>([id, r, rr, rrr]);
  });
}

/** Compute the center of mass for each dancer's ring. */
export function ringCenters(
  rings: Record<ProtoId, Set<DancerId>>,
  state: WorldState,
): Record<ProtoId, Vector> {
  return buildProtoRecord((id) => {
    const positions = [...rings[id]].map(
      (mid) => getDancerState(mid, state).pos,
    );
    return positions
      .reduce((sum, p) => sum.add(p), new Vector(0, 0))
      .divide(positions.length);
  });
}
