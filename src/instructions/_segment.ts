import { produce } from "immer";
import type { Vector } from "vecti";

import {
  ALL_PROTO_IDS,
  type BasicLabel,
  type Beats,
  type DancerId,
  type Hand,
  type ProtoId,
} from "../contraCore";
import {
  ellipsePosition,
  lerpFacing as lerpFacingVec,
  revolve,
} from "../geometry";
import { lerpVectors } from "../utils";
import {
  type DancerHandPointer,
  type DancerState,
  getDancerState,
  sanityCheckWorldState,
  type WorldState,
} from "../worldState";
import {
  type CalledIdentifier,
  type ContraAnimation,
  resolveMatch,
} from "./_base";

/** Produces segments for an instruction. The primary interface for atomic instructions. */
export type InstructionAnimator<T> = (
  instr: T,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
) => Segment[];

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

/** Per-dancer labels function: overwrites *just the returned labels*, leaving others unchanged. */
export type LabelsFn = (
  id: ProtoId,
  frac: number,
  segInit: WorldState,
) => Array<[BasicLabel, DancerId]>;

/** Per-dancer hands function: overwrites *all* the dancer's hands, leaving unmentioned hands unattached. */
export type HandsFn = (
  id: ProtoId,
  frac: number,
  segInit: WorldState,
) => DancerState["hands"];

/** Per-dancer recents function: returns a list of dancers that a dancer interacted with in this segment. */
export type InteractedWithFn = (id: ProtoId, segInit: WorldState) => DancerId[];

/** A single phase of an animation. */
export type Segment = {
  dur: Beats;
  position?: PositionFn; // omit = stay at segInit position
  facing?: FacingFn; // omit = keep segInit facing
  hands?: HandsFn; // omit = leave hands unchanged
  labels?: LabelsFn; // omit = leave labels unchanged
  interactedWith?: InteractedWithFn; // omit = leave recents unchanged
};

// ── Core ────────────────────────────────────────────────────────────────

/**
 * Evaluate a segment to get its final WorldState (used for pre-computing
 * segment initial states and for giveAndTakeIntoSwing's approach→swing handoff).
 */
export function getSegmentFrameAtFrac(
  segment: Segment,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
  frac: number,
): WorldState {
  return produce(init, (draft) => {
    for (const id of who) {
      if (segment.position) draft[id].pos = segment.position(id, frac, init);
      if (segment.facing) draft[id].facing = segment.facing(id, frac, init);
      if (segment.hands) draft[id].hands = segment.hands(id, frac, init);
      if (segment.labels) {
        for (const [label, theirId] of segment.labels(id, frac, init)) {
          draft[id].labels[label] = theirId;
        }
      }
      if (segment.interactedWith) {
        const newRecents = segment.interactedWith(id, init);
        draft[id].recents = [
          ...newRecents,
          ...draft[id].recents.filter((i) => !newRecents.includes(i)),
        ];
      }
    }
  });
}

/** Advance state through a sequence of segments (for composing multi-step instructions). */
export function advanceState(
  segs: Segment[],
  state: WorldState,
  who: ReadonlySet<ProtoId>,
): WorldState {
  let s = state;
  for (const seg of segs) s = getSegmentFrameAtFrac(seg, s, who, 1);
  return s;
}

/**
 * Core composer. Takes init state, a `who` set, and array of segments, returns a ContraAnimation.
 * Handles all boilerplate:
 * - Computes segment initial states by evaluating each segment's end
 * - Routes getFrame(t) to the correct segment
 * - Loops over `who`, calls position/facing/hands fns, applies via produce()
 */
export function animateSegments(
  init: WorldState,
  who: ReadonlySet<ProtoId>,
  segments: Segment[],
): ContraAnimation {
  const segInits: WorldState[] = [init];
  for (let i = 0; i < segments.length - 1; i++) {
    segInits.push(getSegmentFrameAtFrac(segments[i], segInits[i], who, 1));
  }

  const totalDur = segments.reduce((sum, s) => sum + s.dur, 0);

  return {
    dur: totalDur,
    getFrame(t) {
      if (segments.length === 0) return init;
      let accDur = 0;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (t >= accDur + seg.dur && i < segments.length - 1) {
          accDur += seg.dur;
          continue;
        }
        const localT = t - accDur;
        const frac = seg.dur > 0 ? localT / seg.dur : 1;
        const segInit = segInits[i];
        return sanityCheckWorldState(
          produce(segInit, (draft) => {
            for (const id of who) {
              if (seg.position) draft[id].pos = seg.position(id, frac, segInit);
              if (seg.facing) draft[id].facing = seg.facing(id, frac, segInit);
            }
            for (const id of who) {
              if (seg.hands) {
                draft[id].hands = {};
                draft[id].hands = seg.hands(id, frac, segInit);
              }
              if (seg.labels) {
                for (const [label, theirId] of seg.labels(id, frac, segInit)) {
                  draft[id].labels[label] = theirId;
                }
              }
              if (seg.interactedWith) {
                const newRecents = seg.interactedWith(id, segInit);
                draft[id].recents = [
                  ...newRecents,
                  ...draft[id].recents.filter((i) => !newRecents.includes(i)),
                ];
              }
            }
          }),
        );
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

export function makeImmediateSegment(
  init: WorldState,
  mutate: (id: ProtoId, draft: WorldState) => void,
): Segment {
  const final = produce(init, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      mutate(id, draft);
    }
  });
  return {
    dur: 0,
    position: (id) => final[id].pos,
    facing: (id) => final[id].facing,
    hands: (id) => final[id].hands,
    labels: (id) => {
      const entries: Array<[BasicLabel, DancerId]> = [];
      for (const [l, v] of Object.entries(final[id].labels)) {
        if (v) entries.push([l as BasicLabel, v]);
      }
      return entries;
    },
  };
}

// ── Position primitives ─────────────────────────────────────────────────

/** Elliptical arc from dancer's position to their counterpart's position. */
export function arc(
  cid: CalledIdentifier,
  opts: { semiMinor: number; phi: number },
): PositionFn {
  return (id, frac, segInit) => {
    const themId = resolveMatch(id, cid, segInit);
    const start = segInit[id].pos;
    const end = getDancerState(themId, segInit).pos;
    return ellipsePosition(start, end, opts.semiMinor, opts.phi * frac);
  };
}

/** Orbit around midpoint with counterpart. */
export function orbit(
  matches: Map<ProtoId, DancerId>,
  opts: { radians: number },
  who?: ReadonlySet<ProtoId>,
): PositionFn {
  return (id, frac, segInit) => {
    if (who && !who.has(id)) return segInit[id].pos;
    const myPos = segInit[id].pos;
    const themId = matches.get(id);
    if (!themId) return myPos;
    const theirPos = getDancerState(themId, segInit).pos;
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

/** Lerp facing toward a target direction via the short arc (or forced direction). */
export function lerpFacingTo(
  target: (id: ProtoId, segInit: WorldState) => Vector,
  {
    forceDir,
    forceDirTolerance = 0.1,
  }: {
    forceDir?: (id: ProtoId) => "cw" | "ccw" | undefined;
    forceDirTolerance?: number;
  } = {},
  who?: ReadonlySet<ProtoId>,
): FacingFn {
  return (id, frac, segInit) => {
    if (who && !who.has(id)) return segInit[id].facing;
    return lerpFacingVec(segInit[id].facing, target(id, segInit), frac, {
      forceDir: forceDir?.(id),
      forceDirTolerance,
    });
  };
}

/** Rotate facing by a fixed number of radians over the segment. */
export function rotateFacingBy(radiansFn: (id: ProtoId) => number): FacingFn {
  return (id, frac, segInit) => {
    return segInit[id].facing.rotateByRadians(radiansFn(id) * frac);
  };
}

// ── Hand primitives ─────────────────────────────────────────────────────

export function hold(
  ...args:
    | [[Hand, DancerId, Hand]]
    | [["left", DancerId, Hand], ["right", DancerId, Hand]]
): DancerState["hands"] {
  const result: Partial<Record<Hand, DancerHandPointer>> = {};
  for (const [hand, theirId, theirHand] of args) {
    result[hand] = { theirId, theirHand };
  }
  return result;
}
