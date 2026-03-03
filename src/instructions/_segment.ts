import { produce } from "immer";
import type { Vector } from "vecti";

import type { Beats, Hand, ProtoId, Relationship } from "../contraCore";
import { isLark, resolveRelationship } from "../contraCore";
import { ellipsePosition, lerpFacing as lerpFacingVec, revolve } from "../geometry";
import { lerpVectors } from "../utils";
import {
  connectHands,
  disconnectHands,
  getDancerState,
  type WorldState,
} from "../worldState";
import type { ContraAnimation } from "./_base";

/** Per-dancer position function: given dancer id, progress fraction [0,1], and segment initial state, returns position. */
export type PositionFn = (
  id: ProtoId,
  frac: number,
  segInit: WorldState,
) => Vector;

/** Per-dancer facing function: same signature, returns facing unit vector. */
export type FacingFn = (
  id: ProtoId,
  frac: number,
  segInit: WorldState,
) => Vector;

/** Per-dancer hands function: mutates draft state for hand connections. */
export type HandsFn = (
  id: ProtoId,
  frac: number,
  draft: WorldState,
) => void;

/** A single phase of an animation. */
export type Segment = {
  dur: Beats;
  position?: PositionFn; // omit = stay at segInit position
  facing?: FacingFn; // omit = keep segInit facing
  hands?: HandsFn; // omit = leave hands unchanged
};

// ── Core ────────────────────────────────────────────────────────────────

/**
 * Evaluate a segment to get its final WorldState (used for pre-computing
 * segment initial states and for giveAndTakeIntoSwing's approach→swing handoff).
 */
export function evaluateSegmentEnd(
  segment: Segment,
  init: WorldState,
  who: Set<ProtoId>,
): WorldState {
  return produce(init, (draft) => {
    for (const id of who) {
      if (segment.position) draft[id].pos = segment.position(id, 1, init);
      if (segment.facing) draft[id].facing = segment.facing(id, 1, init);
      if (segment.hands) segment.hands(id, 1, draft);
    }
  });
}

/**
 * Core composer. Takes init state, a `who` set, and array of segments, returns a ContraAnimation.
 * Handles all boilerplate:
 * - Computes segment initial states by evaluating each segment's end
 * - Routes getFrame(t) to the correct segment
 * - Loops over `who`, calls position/facing/hands fns, applies via produce()
 */
export function makeAnimation(
  init: WorldState,
  who: Set<ProtoId>,
  segments: Segment[],
): ContraAnimation {
  const segInits: WorldState[] = [init];
  for (let i = 0; i < segments.length - 1; i++) {
    segInits.push(evaluateSegmentEnd(segments[i], segInits[i], who));
  }

  const totalDur = segments.reduce((sum, s) => sum + s.dur, 0);

  return {
    dur: totalDur,
    getFrame(t) {
      let accDur = 0;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (t > accDur + seg.dur) {
          accDur += seg.dur;
          continue;
        }
        const localT = t - accDur;
        const frac = seg.dur > 0 ? localT / seg.dur : 1;
        const segInit = segInits[i];
        return produce(segInit, (draft) => {
          for (const id of who) {
            if (seg.position) draft[id].pos = seg.position(id, frac, segInit);
            if (seg.facing) draft[id].facing = seg.facing(id, frac, segInit);
            if (seg.hands) seg.hands(id, frac, draft);
          }
        });
      }
      throw new Error(
        `time ${t} is out of range for animation with duration ${totalDur}`,
      );
    },
  };
}

/**
 * Modifier: adds a position drift to a sequence of segments.
 * `drift(id, globalFrac)` returns a Vector offset, where globalFrac goes 0→1
 * across the entire sequence of segments.
 */
export function addPositionDrift(
  segments: Segment[],
  drift: (id: ProtoId, globalFrac: number) => Vector,
): Segment[] {
  const totalDur = segments.reduce((sum, s) => sum + s.dur, 0);
  let accDur = 0;
  return segments.map((seg) => {
    const segStart = accDur;
    accDur += seg.dur;
    const origPosition = seg.position;
    return {
      ...seg,
      position: (id: ProtoId, frac: number, segInit: WorldState): Vector => {
        const globalFrac =
          totalDur > 0 ? (segStart + frac * seg.dur) / totalDur : 1;
        const base = origPosition
          ? origPosition(id, frac, segInit)
          : segInit[id].pos;
        return base.add(drift(id, globalFrac));
      },
    };
  });
}

// ── Position primitives ─────────────────────────────────────────────────

/** Elliptical arc from dancer's position to their partner's position. */
export function arc(
  relationship: Relationship,
  opts: { semiMinor: number; phi: number },
): PositionFn {
  return (id, frac, segInit) => {
    const start = segInit[id].pos;
    const end = getDancerState(
      resolveRelationship(id, relationship),
      segInit,
    ).pos;
    return ellipsePosition(start, end, opts.semiMinor, opts.phi * frac);
  };
}

/** Orbit around midpoint with partner. */
export function orbit(
  relationship: Relationship,
  opts: { radians: number },
): PositionFn {
  return (id, frac, segInit) => {
    const myPos = segInit[id].pos;
    const theirPos = getDancerState(
      resolveRelationship(id, relationship),
      segInit,
    ).pos;
    const center = myPos.add(theirPos).divide(2);
    return revolve(myPos, { around: center, radians: opts.radians * frac });
  };
}

/** Linear interpolation to a target position. */
export function linearTo(
  target: (id: ProtoId, segInit: WorldState) => Vector,
): PositionFn {
  return (id, frac, segInit) => {
    return lerpVectors(segInit[id].pos, target(id, segInit), frac);
  };
}

// ── Facing primitives ───────────────────────────────────────────────────

/** Lerp facing toward a target direction via the short arc. */
export function lerpFacingTo(
  target: (id: ProtoId, segInit: WorldState) => Vector,
): FacingFn {
  return (id, frac, segInit) => {
    return lerpFacingVec(segInit[id].facing, target(id, segInit), frac);
  };
}

/** Rotate facing by a fixed number of radians over the segment. */
export function rotateFacingBy(
  radiansFn: (id: ProtoId) => number,
): FacingFn {
  return (id, frac, segInit) => {
    return segInit[id].facing.rotateByRadians(radiansFn(id) * frac);
  };
}

// ── Hand primitives ─────────────────────────────────────────────────────

/** Hold a specific hand connection throughout the segment. */
export function hold(
  hand: Hand,
  relationship: Relationship,
  theirHand: Hand,
): HandsFn {
  return (id, _frac, draft) => {
    connectHands(draft, id, hand, relationship, theirHand);
  };
}

/** Hold with role-dependent hand/relationship/theirHand. */
export function holdByRole(opts: {
  lark: [Hand, Relationship, Hand];
  robin: [Hand, Relationship, Hand];
}): HandsFn {
  return (id, _frac, draft) => {
    const [hand, relationship, theirHand] = isLark(id)
      ? opts.lark
      : opts.robin;
    connectHands(draft, id, hand, relationship, theirHand);
  };
}

/** Hold a hand connection until a threshold fraction, then disconnect all. */
export function holdUntil(
  threshold: number,
  hand: Hand,
  relationship: Relationship,
  theirHand: Hand,
): HandsFn {
  return (id, frac, draft) => {
    if (frac < threshold) {
      connectHands(draft, id, hand, relationship, theirHand);
    } else {
      disconnectHands(draft, id);
    }
  };
}

/** Disconnect all hands. */
export function disconnect(): HandsFn {
  return (id, _frac, draft) => {
    disconnectHands(draft, id);
  };
}
