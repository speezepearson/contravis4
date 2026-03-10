import { Vector } from "vecti";

import { type DancerId } from "../../contraCore";
import { CalledDirectionSchema } from "../../directions";
import { parses } from "../../utils";
import { Dancer, type WorldState } from "../../worldState";
import type { Basis, BasisVectorSpec } from "./_base";
import { DEFAULT_BASIS } from "./_base";

/**
 * Resolve a BasisVectorSpec into a world-space vector for a given dancer.
 *
 * - CalledDirection → unit vector (via resolveCalledDirection)
 * - CalledIdentifier → displacement from dancer to target (non-unit, scales
 *   with distance)
 */
export function resolveBasisVector(
  spec: BasisVectorSpec,
  dancer: Dancer,
): Vector {
  if (parses(CalledDirectionSchema, spec)) {
    return dancer.resolveCalledDirection(spec);
  }
  // CalledIdentifier: raw displacement vector (non-normalized)
  const target = dancer.resolveCalledIdentifier(spec);
  if (!target) {
    throw new Error(
      `Can't resolve basis vector "${spec}" for ${dancer.id}: no matching dancer found`,
    );
  }
  const disp = target.pos.subtract(dancer.pos);
  if (disp.length() < 1e-9) {
    throw new Error(
      `Basis vector "${spec}" for ${dancer.id} is zero-length (target is at same position)`,
    );
  }
  return disp;
}

/** Resolve the basis for a dancer, returning the world-space X and Y vectors. */
export function resolveBasis(
  basis: Basis,
  dancer: Dancer,
): { xBasis: Vector; yBasis: Vector } {
  return {
    xBasis: resolveBasisVector(basis.x, dancer),
    yBasis: resolveBasisVector(basis.y, dancer),
  };
}

/** Transform a relative position into world coordinates using basis vectors. */
export function relPosToWorldWithBasis(
  relPos: Vector,
  origPos: Vector,
  xBasis: Vector,
  yBasis: Vector,
): Vector {
  return origPos.add(xBasis.multiply(relPos.x)).add(yBasis.multiply(relPos.y));
}

/**
 * Transform a relative facing (radians from the Y basis direction) into a
 * world-space facing vector.
 */
export function relFacingToWorldWithBasis(
  relFacing: number,
  yBasis: Vector,
): Vector {
  return yBasis.normalize().rotateByRadians(relFacing);
}

/**
 * Transform a world position into relative coordinates using basis vectors.
 * Solves the 2×2 system: worldOffset = relPos.x * xBasis + relPos.y * yBasis
 */
export function worldToRelWithBasis(
  worldPos: Vector,
  origPos: Vector,
  xBasis: Vector,
  yBasis: Vector,
): Vector {
  const offset = worldPos.subtract(origPos);
  // Solve: offset = relX * xBasis + relY * yBasis
  // Using Cramer's rule on the 2x2 matrix [xBasis | yBasis]
  const det = xBasis.x * yBasis.y - xBasis.y * yBasis.x;
  if (Math.abs(det) < 1e-9) {
    throw new Error("Basis vectors are nearly parallel — cannot invert");
  }
  const relX = (offset.x * yBasis.y - offset.y * yBasis.x) / det;
  const relY = (xBasis.x * offset.y - xBasis.y * offset.x) / det;
  return new Vector(relX, relY);
}

/**
 * Transform a world facing vector into a relative facing (radians from the Y
 * basis direction).
 */
export function facingToRelWithBasis(
  worldFacing: Vector,
  yBasis: Vector,
): number {
  const ref = yBasis.normalize();
  // ccwRadsBetween returns the counter-clockwise angle from ref to worldFacing
  return Math.atan2(
    ref.x * worldFacing.y - ref.y * worldFacing.x,
    ref.x * worldFacing.x + ref.y * worldFacing.y,
  );
}

/** Look up the basis for a state key, falling back to DEFAULT_BASIS. */
export function getBasisForKey(
  basisRecord: Record<string, Basis> | undefined,
  key: string,
): Basis {
  return basisRecord?.[key] ?? DEFAULT_BASIS;
}

/**
 * Resolve the basis vectors for a dancer at init time.
 * Returns the world-space X and Y basis vectors.
 */
export function resolveInitBasis(
  basisRecord: Record<string, Basis> | undefined,
  key: string,
  dancerId: DancerId,
  init: WorldState,
): { xBasis: Vector; yBasis: Vector } {
  const basis = getBasisForKey(basisRecord, key);
  const dancer = Dancer.get(dancerId, init);
  return resolveBasis(basis, dancer);
}
