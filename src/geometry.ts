import { Vector } from "vecti";
import { z } from "zod";

export const VectorSchema = z.instanceof(Vector);

export const PI = Math.PI;
export const TWO_PI = 2 * Math.PI;

/** Cardinal bearings (absolute directions). */
export const NORTH = new Vector(0, 1);
export const EAST = new Vector(1, 0);
export const SOUTH = new Vector(0, -1);
export const WEST = new Vector(-1, 0);

export function ccwRadsBetween(a: Vector, b: Vector): number {
  const thetaA = Math.atan2(a.y, a.x);
  const thetaB = Math.atan2(b.y, b.x);
  let diff = thetaB - thetaA;
  if (diff > PI) diff -= TWO_PI;
  if (diff < -PI) diff += TWO_PI;
  return diff;
}

/** Lerp between two facing vectors via the short arc (or forced direction). */
export function lerpFacing(
  a: Vector,
  b: Vector,
  progressFrac: number,
  {
    forceDir,
    forceDirTolerance = 0.1,
  }: { forceDir?: "cw" | "ccw"; forceDirTolerance?: number } = {},
): Vector {
  let rads = ccwRadsBetween(a, b);
  if (forceDir && Math.abs(rads) > forceDirTolerance) {
    if (forceDir === "ccw" && rads < 0) rads += TWO_PI;
    else if (forceDir === "cw" && rads > 0) rads -= TWO_PI;
  }
  return a.rotateByRadians(rads * progressFrac);
}

export function ellipsePosition(
  a: Vector,
  b: Vector,
  semiMinorCw: number,
  phi: number,
): Vector {
  const center = a.add(b).divide(2);
  const semiMajor = a.subtract(center);
  const semiMinorDir = semiMajor.normalize().rotateByDegrees(90);
  return center
    .add(semiMajor.multiply(Math.cos(phi)))
    .add(semiMinorDir.multiply(Math.sin(phi) * -semiMinorCw));
}

export function getDir({ from, to }: { from: Vector; to: Vector }): Vector {
  return to.subtract(from).normalize();
}

export function revolve(
  x: Vector,
  {
    around,
    aroundMidpointWith,
    radians,
  }:
    | { radians: number; around: Vector; aroundMidpointWith?: undefined }
    | { radians: number; around?: undefined; aroundMidpointWith: Vector },
): Vector {
  const center = around ? around : aroundMidpointWith.add(x).divide(2);
  return center.add(x.subtract(center).rotateByRadians(radians));
}
