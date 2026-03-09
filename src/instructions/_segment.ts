import { produce } from "immer";
import type { Vector } from "vecti";

import {
  ALL_PROTO_IDS,
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
import { type SettableLabel, SettableLabelSchema } from "../labels";
import { SnazzyError } from "../snazzyError";
import { isEqual, lerpVectors } from "../utils";
import {
  Dancer,
  type DancerHandPointer,
  sanityCheckWorldState,
  setLabel,
  type WorldState,
} from "../worldState";
import { type CalledIdentifier, type ContraAnimation } from "./_base";

/** Produces segments for an instruction. The primary interface for atomic instructions. */
export type InstructionAnimator<T> = (
  instr: T,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
) => Segment[];

/** Per-dancer position function: given dancer (bound to segInit state) and progress fraction [0,1], returns position. */
export type PositionFn = (dancer: Dancer, frac: number) => Vector;

/** Per-dancer facing function: same signature, returns facing unit vector. */
export type FacingFn = (dancer: Dancer, frac: number) => Vector;

/** Per-dancer labels function: overwrites *just the returned labels*, leaving others unchanged. */
export type LabelsFn = (
  dancer: Dancer,
  frac: number,
) => Array<[SettableLabel, DancerId]>;

/** Per-dancer hands function: overwrites *all* the dancer's hands, leaving unmentioned hands unattached. */
export type HandsFn = (dancer: Dancer, frac: number) => Dancer["hands"];

/** Per-dancer recents function: returns a list of dancers that a dancer interacted with in this segment. */
export type InteractedWithFn = (dancer: Dancer) => DancerId[];

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

/** Apply a segment at a given frac to produce a new WorldState. */
function applySegment(
  segment: Segment,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
  frac: number,
): WorldState {
  const withoutLabels = produce(init, (draft) => {
    for (const id of who) {
      const d = Dancer.get(id, init);
      if (segment.position) draft[id].pos = segment.position(d, frac);
      if (segment.facing) draft[id].facing = segment.facing(d, frac);
    }
    for (const id of who) {
      const d = Dancer.get(id, init);
      if (segment.hands) {
        draft[id].hands = {};
        draft[id].hands = segment.hands(d, frac);
      }
      if (segment.labels) {
        for (const [label, theirId] of segment.labels(d, frac)) {
          setLabel(draft, id, label, theirId);
        }
      }
      if (segment.interactedWith) {
        const newRecents = segment.interactedWith(d);
        draft[id].recents = [
          ...newRecents,
          ...draft[id].recents.filter((i) => !newRecents.includes(i)),
        ];
      }
    }
  });
  if (!segment.labels) return withoutLabels;

  const labelFn = segment.labels;
  const possibleResults = [...who].map((id) =>
    produce(withoutLabels, (draft) => {
      for (const [label, theirId] of labelFn(Dancer.get(id, init), 1)) {
        setLabel(draft, id, label, theirId);
      }
    }),
  );
  for (const res of possibleResults) {
    if (!isEqual(res, possibleResults[0])) {
      throw new Error(
        `[applySegment] labels function returned different results for different dancers: ${JSON.stringify(res)} vs ${JSON.stringify(possibleResults[0])}`,
      );
    }
  }
  return possibleResults[0];
}

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
  return applySegment(segment, init, who, frac);
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

const MAX_SPEED_PER_BEAT = 1.0;
const VELOCITY_CHECK_STEP: Beats = 0.25;

function checkVelocity(
  animation: ContraAnimation,
  who: ReadonlySet<ProtoId>,
): void {
  if (animation.dur === 0) return;

  let prevState = animation.getFrame(0);
  const nSteps = Math.floor(animation.dur / VELOCITY_CHECK_STEP);
  for (let i = 1; i <= nSteps; i++) {
    const t = Math.min(i * VELOCITY_CHECK_STEP, animation.dur);
    const dt = t - (i - 1) * VELOCITY_CHECK_STEP;
    const state = animation.getFrame(t);
    for (const id of who) {
      const dist = state[id].pos.subtract(prevState[id].pos).length();
      const speed = dist / dt;
      if (speed > MAX_SPEED_PER_BEAT) {
        throw new SnazzyError([
          { dancerId: id },
          ` is moving too fast (${speed.toFixed(2)} units/beat, max ${MAX_SPEED_PER_BEAT}) at beat ${t.toFixed(2)}`,
        ]);
      }
    }
    prevState = state;
  }
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

  const animation: ContraAnimation = {
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
        return sanityCheckWorldState(applySegment(seg, segInit, who, frac));
      }
      throw new Error(
        `time ${t} is out of range for animation with duration ${totalDur}`,
      );
    },
  };

  checkVelocity(animation, who);

  return animation;
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
      position: (dancer: Dancer, frac: number): Vector => {
        const globalFrac =
          totalDur > 0 ? (segStart + frac * seg.dur) / totalDur : 1;
        const base = origPosition ? origPosition(dancer, frac) : dancer.pos;
        return base.add(drift(dancer.protoId, globalFrac));
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
    position: (dancer) => final[dancer.protoId].pos,
    facing: (dancer) => final[dancer.protoId].facing,
    hands: (dancer) => final[dancer.protoId].hands,
    labels: (dancer) => {
      const entries: Array<[SettableLabel, DancerId]> = [];
      for (const [l, v] of Object.entries(final[dancer.protoId].labels)) {
        const settable = SettableLabelSchema.safeParse(l);
        if (!settable.success) continue;
        if (v) entries.push([settable.data, v]);
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
  return (dancer, frac) => {
    const them = dancer.resolveMatch(cid);
    const start = dancer.pos;
    const end = them.pos;
    return ellipsePosition(start, end, opts.semiMinor, opts.phi * frac);
  };
}

/** Orbit around midpoint with counterpart. */
export function orbit(
  centers: (dancer: Dancer) => Vector,
  opts: { radians: number },
  who?: ReadonlySet<ProtoId>,
): PositionFn {
  return (dancer, frac) => {
    if (who && !who.has(dancer.protoId)) return dancer.pos;
    const myPos = dancer.pos;
    return revolve(myPos, {
      around: centers(dancer),
      radians: opts.radians * frac,
    });
  };
}

/** Linear interpolation to a target position. */
export function linearTo(target: (dancer: Dancer) => Vector): PositionFn {
  return (dancer, frac) => {
    return lerpVectors(dancer.pos, target(dancer), frac);
  };
}

// ── Facing primitives ───────────────────────────────────────────────────

/** Lerp facing toward a target direction via the short arc (or forced direction). */
export function lerpFacingTo(
  target: (dancer: Dancer) => Vector,
  {
    forceDir,
    forceDirTolerance = 0.1,
  }: {
    forceDir?: (id: ProtoId) => "cw" | "ccw" | undefined;
    forceDirTolerance?: number;
  } = {},
  who?: ReadonlySet<ProtoId>,
): FacingFn {
  return (dancer, frac) => {
    if (who && !who.has(dancer.protoId)) return dancer.facing;
    return lerpFacingVec(dancer.facing, target(dancer), frac, {
      forceDir: forceDir?.(dancer.protoId),
      forceDirTolerance,
    });
  };
}

/** Rotate facing by a fixed number of radians over the segment. */
export function rotateFacingBy(
  radiansFn: (dancer: Dancer) => number,
): FacingFn {
  return (dancer, frac) => {
    return dancer.facing.rotateByRadians(radiansFn(dancer) * frac);
  };
}

// ── Hand primitives ─────────────────────────────────────────────────────

export function hold(
  ...args:
    | [[Hand, DancerId, Hand]]
    | [["left", DancerId, Hand], ["right", DancerId, Hand]]
): Dancer["hands"] {
  const result: Partial<Record<Hand, DancerHandPointer>> = {};
  for (const [hand, theirId, theirHand] of args) {
    result[hand] = { theirId, theirHand };
  }
  return result;
}
