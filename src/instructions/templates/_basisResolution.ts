import { Vector } from "vecti";

import { type DancerId } from "../../contraCore";
import { must } from "../../utils";
import { Dancer, type WorldState } from "../../worldState";
import type {
  BasisSpec,
  BasisVectorSpec,
  ChoreographerSpecifiedFields,
  TemplateBasis,
} from "./_base";

/**
 * Resolve a concrete BasisVectorSpec into a world-space vector for a dancer.
 *
 * - CalledDirection variants (PureDirection, TowardsLabel, TowardsPerson)
 *   → unit vector (via resolveCalledDirection)
 * - CalledIdentifier variants (label, PersonInDirection)
 *   → displacement from dancer to target (non-unit, scales with distance)
 */
export function resolveBasisVector(
  spec: BasisVectorSpec,
  dancer: Dancer,
): Vector {
  switch (spec.type) {
    case "PureDirection":
    case "TowardsLabel":
    case "TowardsPerson":
      return dancer.resolveCalledDirection(spec);
    case "label":
    case "PersonInDirection": {
      const target = dancer.resolveCalledIdentifier(spec);
      if (!target) {
        throw new Error(
          `Can't resolve basis vector for ${dancer.id}: no matching dancer found`,
        );
      }
      const disp = target.pos.subtract(dancer.pos);
      if (disp.length() < 1e-9) {
        throw new Error(
          `Basis vector for ${dancer.id} is zero-length (target is at same position)`,
        );
      }
      return disp;
    }
    case "PerRole":
      return resolveBasisVector(
        dancer.isLark() ? spec.larks : spec.robins,
        dancer,
      );
  }
}

/**
 * Resolve a BasisSpec (which may be choreographer_specified_*) into a concrete
 * BasisVectorSpec by pulling from the instruction fields or the template's
 * assumed default.
 */
function resolveSpec(
  spec: BasisSpec,
  fieldValue: BasisVectorSpec | undefined,
  assumed: BasisVectorSpec | undefined,
): BasisVectorSpec {
  if (
    spec.type === "choreographer_specified_direction" ||
    spec.type === "choreographer_specified_identifier"
  ) {
    return must(fieldValue ?? assumed, [
      `Choreographer-specified basis has no value and no assumed default`,
    ]);
  }
  // It's already a concrete CalledDirection or CalledIdentifier
  return spec;
}

/**
 * Resolve the template's basis into world-space X and Y vectors for a dancer.
 */
export function resolveTemplateBasis(
  basis: TemplateBasis,
  fields: ChoreographerSpecifiedFields,
  dancer: Dancer,
): { xBasis: Vector; yBasis: Vector } {
  const xSpec = resolveSpec(basis.x, fields.basisX, basis.assumedX);
  const ySpec = resolveSpec(basis.y, fields.basisY, basis.assumedY);
  return {
    xBasis: resolveBasisVector(xSpec, dancer),
    yBasis: resolveBasisVector(ySpec, dancer),
  };
}

/**
 * Resolve the template's basis for a dancer at init state, using assumed
 * defaults (for template authoring / preview).
 */
export function resolveTemplateBasisAtInit(
  basis: TemplateBasis,
  dancerId: DancerId,
  init: WorldState,
): { xBasis: Vector; yBasis: Vector } {
  return resolveTemplateBasis(
    basis,
    { basisX: basis.assumedX, basisY: basis.assumedY },
    Dancer.get(dancerId, init),
  );
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
  return Math.atan2(
    ref.x * worldFacing.y - ref.y * worldFacing.x,
    ref.x * worldFacing.x + ref.y * worldFacing.y,
  );
}
