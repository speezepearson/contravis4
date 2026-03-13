import { Vector } from "vecti";

import { catmullRom, catmullRomAngle } from "../../geometry";
import { Dancer, type WorldState } from "../../worldState";
import type { DancerSegment, PlanGetter } from "../_plan";
import {
  relFacingToWorldWithBasis,
  relPosToWorldWithBasis,
} from "./_basisResolution";

/**
 * A resolved keyframe: world-space position and facing angle for one dancer.
 */
type ResolvedPoint = { pos: Vector; angle: number };

/**
 * Build Catmull-Rom-smoothed plans from template keyframes.
 * Precomputes control points per dancer, returning a PlanGetter.
 */
export function buildKeyframePlans<K extends string>(
  keyframes: ReadonlyArray<{
    dur: number;
    states: Partial<Record<K, { relPos: Vector; relFacing: number }>>;
  }>,
  init: WorldState,
  scale: number,
  getKey: (dancer: Dancer) => K,
  getBasis: (dancer: Dancer) => { xBasis: Vector; yBasis: Vector },
): PlanGetter {
  return (dancer: Dancer): DancerSegment[] => {
    const key = getKey(dancer);
    const segments: DancerSegment[] = [];

    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const dur = kf.dur * scale;
      const state = kf.states[key];

      if (!state) {
        segments.push({ dur });
        continue;
      }

      const iPrev = i - 1;
      const iNext = Math.min(i + 1, keyframes.length - 1);

      const resolved = resolvePoint(dancer, key, i, keyframes, init, getBasis);
      if (!resolved) {
        segments.push({ dur });
        continue;
      }

      // Precompute all Catmull-Rom control points
      const p1 = resolvePrevPoint(
        dancer,
        key,
        iPrev,
        keyframes,
        init,
        getBasis,
      );
      const p2 = resolved.pos;
      const p0 = resolveSurroundingPoint(
        dancer,
        key,
        iPrev - 1,
        iPrev,
        keyframes,
        init,
        getBasis,
      );
      const p3 = resolveSurroundingPoint(
        dancer,
        key,
        iNext,
        i,
        keyframes,
        init,
        getBasis,
      );

      const a1 = resolvePrevAngle(
        dancer,
        key,
        iPrev,
        keyframes,
        init,
        getBasis,
      );
      const a2 = resolved.angle;
      const a0 = resolveSurroundingAngle(
        dancer,
        key,
        iPrev - 1,
        iPrev,
        keyframes,
        init,
        getBasis,
      );
      const a3 = resolveSurroundingAngle(
        dancer,
        key,
        iNext,
        i,
        keyframes,
        init,
        getBasis,
      );

      segments.push({
        dur,
        position: (frac: number) => catmullRom(p0, p1, p2, p3, frac),
        facing: (frac: number) => {
          const angle = catmullRomAngle(a0, a1, a2, a3, frac);
          return new Vector(Math.cos(angle), Math.sin(angle));
        },
      });
    }

    return segments;
  };
}

/** Resolve a keyframe's world-space position and facing angle for a dancer. */
function resolvePoint<K extends string>(
  dancer: Dancer,
  key: K,
  kfIndex: number,
  keyframes: ReadonlyArray<{
    dur: number;
    states: Partial<Record<K, { relPos: Vector; relFacing: number }>>;
  }>,
  init: WorldState,
  getBasis: (dancer: Dancer) => { xBasis: Vector; yBasis: Vector },
): ResolvedPoint | null {
  const state = keyframes[kfIndex].states[key];
  if (!state) return null;

  const orig = dancer.at(init);
  const { xBasis, yBasis } = getBasis(dancer);
  const pos = relPosToWorldWithBasis(state.relPos, orig.pos, xBasis, yBasis);
  const facingVec = relFacingToWorldWithBasis(state.relFacing, yBasis);
  const angle = Math.atan2(facingVec.y, facingVec.x);
  return { pos, angle };
}

/** Get the world-space position of the point *before* this segment (init state or previous keyframe). */
function resolvePrevPoint<K extends string>(
  dancer: Dancer,
  key: K,
  iPrev: number,
  keyframes: ReadonlyArray<{
    dur: number;
    states: Partial<Record<K, { relPos: Vector; relFacing: number }>>;
  }>,
  init: WorldState,
  getBasis: (dancer: Dancer) => { xBasis: Vector; yBasis: Vector },
): Vector {
  if (iPrev < 0) {
    return dancer.at(init).pos;
  }
  const resolved = resolvePoint(dancer, key, iPrev, keyframes, init, getBasis);
  return resolved?.pos ?? dancer.at(init).pos;
}

/** Get the facing angle of the point *before* this segment. */
function resolvePrevAngle<K extends string>(
  dancer: Dancer,
  key: K,
  iPrev: number,
  keyframes: ReadonlyArray<{
    dur: number;
    states: Partial<Record<K, { relPos: Vector; relFacing: number }>>;
  }>,
  init: WorldState,
  getBasis: (dancer: Dancer) => { xBasis: Vector; yBasis: Vector },
): number {
  if (iPrev < 0) {
    const f = dancer.at(init).facing;
    return Math.atan2(f.y, f.x);
  }
  const resolved = resolvePoint(dancer, key, iPrev, keyframes, init, getBasis);
  if (resolved) return resolved.angle;
  const f = dancer.at(init).facing;
  return Math.atan2(f.y, f.x);
}

/**
 * Get a surrounding control point for Catmull-Rom (p0 or p3).
 * If the index is out of range, reflect from the fallback point.
 */
function resolveSurroundingPoint<K extends string>(
  dancer: Dancer,
  key: K,
  targetIdx: number,
  fallbackIdx: number,
  keyframes: ReadonlyArray<{
    dur: number;
    states: Partial<Record<K, { relPos: Vector; relFacing: number }>>;
  }>,
  init: WorldState,
  getBasis: (dancer: Dancer) => { xBasis: Vector; yBasis: Vector },
): Vector {
  if (targetIdx >= 0 && targetIdx < keyframes.length) {
    const resolved = resolvePoint(
      dancer,
      key,
      targetIdx,
      keyframes,
      init,
      getBasis,
    );
    if (resolved) return resolved.pos;
  }
  // Fall back: use the fallback point (which mirrors the tangent to zero at the endpoint)
  if (fallbackIdx < 0) return dancer.at(init).pos;
  const fb = resolvePoint(dancer, key, fallbackIdx, keyframes, init, getBasis);
  return fb?.pos ?? dancer.at(init).pos;
}

/** Same as resolveSurroundingPoint but for angles. */
function resolveSurroundingAngle<K extends string>(
  dancer: Dancer,
  key: K,
  targetIdx: number,
  fallbackIdx: number,
  keyframes: ReadonlyArray<{
    dur: number;
    states: Partial<Record<K, { relPos: Vector; relFacing: number }>>;
  }>,
  init: WorldState,
  getBasis: (dancer: Dancer) => { xBasis: Vector; yBasis: Vector },
): number {
  if (targetIdx >= 0 && targetIdx < keyframes.length) {
    const resolved = resolvePoint(
      dancer,
      key,
      targetIdx,
      keyframes,
      init,
      getBasis,
    );
    if (resolved) return resolved.angle;
  }
  if (fallbackIdx < 0) {
    const f = dancer.at(init).facing;
    return Math.atan2(f.y, f.x);
  }
  const fb = resolvePoint(dancer, key, fallbackIdx, keyframes, init, getBasis);
  if (fb) return fb.angle;
  const f = dancer.at(init).facing;
  return Math.atan2(f.y, f.x);
}
