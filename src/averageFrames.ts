import { Vector } from "vecti";

import { ALL_PROTO_IDS, type ProtoId } from "./contraCore";
import type { DancerState, WorldState } from "./worldState";

export function averageFrames(frames: WorldState[]): WorldState {
  const n = frames.length;
  const result = {} as Record<ProtoId, DancerState>;

  for (const id of ALL_PROTO_IDS) {
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

    result[id] = {
      protoId: id,
      pos: new Vector(posX / n, posY / n),
      facing: facingLen > 0 ? avgFacing.normalize() : frames[Math.floor(n / 2)][id].facing,
      hands: frames[Math.floor(n / 2)][id].hands,
    };
  }

  return result;
}
