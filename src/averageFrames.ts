import { produce } from "immer";
import { Vector } from "vecti";

import { parseProtoId } from "./contraCore";
import { buildProtoRecord, type WorldState } from "./worldState";

export function averageFrames(frames: WorldState[]): WorldState {
  const n = frames.length;

  return buildProtoRecord((id) => {
    let posX = 0;
    let posY = 0;
    let facingX = 0;
    let facingY = 0;

    for (const frame of frames) {
      const dancer = frame[id];
      posX += dancer.pos.x;
      posY += dancer.pos.y;
      facingX += dancer.facing.x;
      facingY += dancer.facing.y;
    }

    const avgFacing = new Vector(facingX, facingY);
    const facingLen = avgFacing.length();
    const mid = frames[Math.floor(n / 2)][id];

    return produce(frames[Math.floor(n / 2)][id], (draft) => {
      draft.pos = new Vector(posX / n, posY / n);
      draft.facing = facingLen > 0 ? avgFacing.normalize() : mid.facing;
      draft.hands = mid.hands;
      draft.labels = mid.labels;
      draft.recents = mid.recents;
    });
  });
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
