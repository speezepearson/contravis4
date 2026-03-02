import { ALL_PROTO_IDS, parseProtoId } from "./contraCore";
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

  let agreedN: number | null = null;

  for (const id of ALL_PROTO_IDS) {
    const { dir } = parseProtoId(id);
    // Progression direction: up dancers progress in +Y (NORTH), down in -Y (SOUTH)
    const progSign = dir === "up" ? 1 : -1;

    const initPos = initState[id].pos;
    const finalPos = finalState[id].pos;
    const dx = finalPos.x - initPos.x;
    const dy = finalPos.y - initPos.y;

    // Component along progression axis (Y)
    const alongProgression = dy * progSign;
    // Perpendicular component (X)
    const perpendicular = Math.abs(dx);

    if (perpendicular > TOLERANCE) return null;

    const rounded = Math.round(alongProgression);
    if (Math.abs(alongProgression - rounded) > TOLERANCE) return null;

    if (agreedN === null) {
      agreedN = rounded;
    } else if (agreedN !== rounded) {
      return null;
    }
  }

  return agreedN;
}
