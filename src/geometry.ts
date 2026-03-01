import { z } from 'zod';
import { Vector } from 'vecti';

export const VectorSchema = z.instanceof(Vector);

/** Cardinal bearings (absolute directions). */
export const NORTH = new Vector(0, 1);
export const EAST = new Vector(1, 0);
export const SOUTH = new Vector(0, -1);
export const WEST = new Vector(-1, 0);

export function ccwRadsBetween(a: Vector, b: Vector): number {
  const thetaA = Math.atan2(a.y, a.x);
  const thetaB = Math.atan2(b.y, b.x);
  let diff = thetaB - thetaA;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}
