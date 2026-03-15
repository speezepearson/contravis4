import { produce } from "immer";
import { Vector } from "vecti";

import { parseProtoId } from "./contraCore";
import { lerpFacing } from "./geometry";
import { buildProtoRecord, type WorldState } from "./worldState";

export type WeightedFrame = { frame: WorldState; weight: number };

/**
 * Produce a smoothed frame: a copy of `baseFrame` whose positions and facings
 * are replaced by weighted averages taken from `samples`.
 *
 * Hands, labels, and recents come from `baseFrame` (the frame at the "true" time T).
 */
export function smoothFrame(
  baseFrame: WorldState,
  samples: readonly WeightedFrame[],
): WorldState {
  return buildProtoRecord((id) => {
    let totalWeight = 0;
    let posX = 0;
    let posY = 0;

    for (const { frame, weight } of samples) {
      const dancer = frame[id];
      posX += dancer.pos.x * weight;
      posY += dancer.pos.y * weight;
      totalWeight += weight;
    }

    const avgFacing = weightedAverageFacing(
      samples.map(({ frame, weight }) => ({
        facing: frame[id].facing,
        weight,
      })),
    );

    const base = baseFrame[id];

    return produce(base, (draft) => {
      draft.pos = new Vector(posX / totalWeight, posY / totalWeight);
      draft.facing = avgFacing;
      draft.hands = base.hands;
      draft.labels = base.labels;
      draft.recents = base.recents;
    });
  });
}

/**
 * Weighted average of facing directions via iterated lerpFacing.
 *
 * Entries are sorted by weight descending so each successive lerp uses a
 * smaller coefficient (w_i / cumulative_weight), which keeps the running
 * average stable and biased towards the highest-weight directions.
 */
export function weightedAverageFacing(
  entries: readonly { facing: Vector; weight: number }[],
): Vector {
  const sorted = [...entries].sort((a, b) => b.weight - a.weight);

  let result = sorted[0].facing;
  let cumWeight = sorted[0].weight;
  for (let i = 1; i < sorted.length; i++) {
    cumWeight += sorted[i].weight;
    result = lerpFacing(result, sorted[i].facing, sorted[i].weight / cumWeight);
  }
  return result;
}

/** Shift every dancer by `n` meters in their progression direction (NORTH for up, SOUTH for down).
 *  Used for aligning frames across cycle boundaries during smoothing. */
export function shiftFrameByProgression(
  frame: WorldState,
  n: number,
): WorldState {
  return buildProtoRecord((id) => {
    const { dir } = parseProtoId(id);
    const dy = dir === "up" ? n : -n;
    return produce(frame[id], (draft) => {
      draft.pos = new Vector(draft.pos.x, draft.pos.y + dy);
    });
  });
}

/** Shift ALL dancers uniformly by `dy` meters along the line (positive = north).
 *  Used for rendering progression offsets — keeps all 4 proto dancers within
 *  one hands-four so the tiling renderer draws hand connections correctly. */
export function shiftFrameUniformly(frame: WorldState, dy: number): WorldState {
  return buildProtoRecord((id) => {
    return produce(frame[id], (draft) => {
      draft.pos = new Vector(draft.pos.x, draft.pos.y + dy);
    });
  });
}
