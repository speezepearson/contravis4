import { ALL_PROTO_IDS, getProgDirSign } from "./contraCore";
import { NORTH } from "./geometry";
import type { ContraAnimation } from "./instructions/_base";
import type { WorldState } from "./worldState";

const TOLERANCE = 0.1;

/**
 * Infer the progression of a dance by comparing the final frame to the initial state.
 * Returns an integer n if every dancer ends up within TOLERANCE of their initial position
 * shifted by n meters in their progression direction (NORTH for up, SOUTH for down).
 * Returns null if the dance doesn't progress cleanly.
 */
export function inferProgression(
  animation: ContraAnimation,
  initState: WorldState,
): number | null {
  const finalState = animation.getFrame(animation.dur);

  const amountsProgressed = new Set<number>();
  for (const id of ALL_PROTO_IDS) {
    const initPos = initState[id].pos;
    const finalPos = finalState[id].pos;

    const idealDy = Math.round(finalPos.y - initPos.y);
    const idealProgressedPos = initPos.add(NORTH.multiply(idealDy));
    if (finalPos.subtract(idealProgressedPos).length() > TOLERANCE) return null;
    amountsProgressed.add(getProgDirSign(id) * idealDy);
  }

  return amountsProgressed.size === 1 ? Array.from(amountsProgressed)[0] : null;
}
