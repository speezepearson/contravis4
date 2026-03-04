import { ALL_PROTO_IDS, parseProtoId } from "./contraCore";
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

  const amountsProgressed: Set<number> = new Set(
    ALL_PROTO_IDS.map((id) => {
      const { dir } = parseProtoId(id);
      // Progression direction: up dancers progress in +Y (NORTH), down in -Y (SOUTH)
      const progSign = dir === "up" ? 1 : -1;

      const initPos = initState[id].pos;
      const finalPos = finalState[id].pos;

      const idealDy = Math.round(finalPos.y - initPos.y);
      const idealProgressedPos = initPos.add(NORTH.multiply(idealDy));
      if (finalPos.subtract(idealProgressedPos).length() > TOLERANCE)
        return null;
      return progSign * idealDy;
    }).filter((n) => n !== null),
  );

  return amountsProgressed.size === 1 ? Array.from(amountsProgressed)[0] : null;
}
