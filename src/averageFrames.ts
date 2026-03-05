import { Vector } from "vecti";

import { ALL_PROTO_IDS, parseProtoId, type ProtoId } from "./contraCore";
import { Dancer, type WorldState } from "./worldState";

export function averageFrames(frames: WorldState[]): WorldState {
  const n = frames.length;
  const result = {} as Record<ProtoId, Dancer>;

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
    const mid = frames[Math.floor(n / 2)][id];

    result[id] = new Dancer(id, {
      pos: new Vector(posX / n, posY / n),
      facing: facingLen > 0 ? avgFacing.normalize() : mid.facing,
      hands: mid.hands,
      labels: mid.labels,
      recents: mid.recents,
    });
  }

  return result;
}

/** Shift every dancer by `n` meters in their progression direction (NORTH for up, SOUTH for down). */
export function shiftFrameByProgression(
  frame: WorldState,
  n: number,
): WorldState {
  const result = {} as Record<ProtoId, Dancer>;
  for (const id of ALL_PROTO_IDS) {
    const { dir } = parseProtoId(id);
    const dy = dir === "up" ? n : -n;
    const dancer = frame[id];
    result[id] = new Dancer(id, {
      pos: new Vector(dancer.pos.x, dancer.pos.y + dy),
      facing: dancer.facing,
      hands: dancer.hands,
      labels: dancer.labels,
      recents: dancer.recents,
    });
  }
  return result;
}
