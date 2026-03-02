import { Vector } from "vecti";
import { z } from "zod";

import { assertNever } from "./utils";

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
  if (diff > Math.PI) diff -= TWO_PI;
  if (diff < -Math.PI) diff += TWO_PI;
  return diff;
}

/** Lerp between two facing vectors via the short arc. */
export function lerpFacing(a: Vector, b: Vector, progressFrac: number): Vector {
  return a.rotateByRadians(ccwRadsBetween(a, b) * progressFrac);
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
  how: ({ around: Vector } | { aroundMidpointWith: Vector }) &
    ({ radians: number } | { degrees: number } | { rotations: number }),
): Vector {
  const center =
    "around" in how
      ? how.around
      : "aroundMidpointWith" in how
        ? how.aroundMidpointWith.add(x).divide(2)
        : assertNever(how);
  const radians =
    "radians" in how
      ? how.radians
      : "degrees" in how
        ? (how.degrees / 180) * Math.PI
        : "rotations" in how
          ? 360 * how.rotations
          : assertNever(how);
  return center.add(x.subtract(center).rotateByRadians(radians));
}
