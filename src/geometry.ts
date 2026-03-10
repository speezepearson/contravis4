import { Vector } from "vecti";
import { z } from "zod";

export const VectorSchema = z
  .object({ x: z.number(), y: z.number() })
  .transform((v) => new Vector(v.x, v.y));

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

export function roughlySameDir(
  a: Vector,
  b: Vector,
  { tol = 0.2 }: { tol?: number } = {},
): boolean {
  return a.dot(b) > 1 - tol;
}

export function getDist(a: Vector, b: Vector): number {
  return a.subtract(b).length();
}

// ── Catmull-Rom interpolation ─────────────────────────────────────────

/**
 * Catmull-Rom spline interpolation between p1 and p2.
 * p0 and p3 are the surrounding control points that influence the curve's tangents.
 * t is in [0, 1] where 0 = p1 and 1 = p2.
 */
export function catmullRom(
  p0: Vector,
  p1: Vector,
  p2: Vector,
  p3: Vector,
  t: number,
): Vector {
  const t2 = t * t;
  const t3 = t2 * t;
  return new Vector(
    catmullRom1D(p0.x, p1.x, p2.x, p3.x, t, t2, t3),
    catmullRom1D(p0.y, p1.y, p2.y, p3.y, t, t2, t3),
  );
}

function catmullRom1D(
  v0: number,
  v1: number,
  v2: number,
  v3: number,
  t: number,
  t2: number,
  t3: number,
): number {
  // Standard Catmull-Rom matrix form:
  // q(t) = 0.5 * ((2*v1) + (-v0+v2)*t + (2*v0-5*v1+4*v2-v3)*t² + (-v0+3*v1-3*v2+v3)*t³)
  return (
    0.5 *
    (2 * v1 +
      (-v0 + v2) * t +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 +
      (-v0 + 3 * v1 - 3 * v2 + v3) * t3)
  );
}

/**
 * Catmull-Rom interpolation for angles (in radians).
 * Handles wraparound by working with angular differences.
 */
export function catmullRomAngle(
  a0: number,
  a1: number,
  a2: number,
  a3: number,
  t: number,
): number {
  // Convert to cumulative deltas relative to a1 to handle wraparound
  const d01 = normalizeAngle(a1 - a0);
  const d12 = normalizeAngle(a2 - a1);
  const d23 = normalizeAngle(a3 - a2);
  // Remap to "unwrapped" values relative to a1
  const u0 = -d01; // a0 relative to a1
  const u1 = 0; // a1 is origin
  const u2 = d12; // a2 relative to a1
  const u3 = d12 + d23; // a3 relative to a1
  const t2 = t * t;
  const t3 = t2 * t;
  return a1 + catmullRom1D(u0, u1, u2, u3, t, t2, t3);
}

function normalizeAngle(a: number): number {
  let r = a % TWO_PI;
  if (r > PI) r -= TWO_PI;
  if (r < -PI) r += TWO_PI;
  return r;
}
