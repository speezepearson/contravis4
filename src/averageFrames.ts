import { produce } from "immer";
import { Vector } from "vecti";

import { addOffsetToId, parseProtoId } from "./contraCore";
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

/** Shift every dancer by `n` meters in their progression direction (NORTH for up, SOUTH for down). */
export function shiftFrameByProgression(
  frame: WorldState,
  n: number,
): WorldState {
  return buildProtoRecord((id) => {
    const { dir } = parseProtoId(id);
    const dy = dir === "up" ? n : -n;
    return produce(frame[id], (draft) => {
      draft.pos = new Vector(draft.pos.x, draft.pos.y + dy);
      // facing stays the same
      draft.hands = {
        left: draft.hands.left
          ? {
              theirId: addOffsetToId(draft.hands.left.theirId, dy),
              theirHand: draft.hands.left.theirHand,
            }
          : undefined,
        right: draft.hands.right
          ? {
              theirId: addOffsetToId(draft.hands.right.theirId, dy),
              theirHand: draft.hands.right.theirHand,
            }
          : undefined,
      };
      // no other properties are (currently?) render-relevant
    });
  });
}
