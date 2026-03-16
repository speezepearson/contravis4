import { produce } from "immer";
import type { Vector } from "vecti";

import {
  type Beats,
  type DancerId,
  type Hand,
  type ProtoId,
} from "../contraCore";
import type { SettableLabel } from "../labels";
import { SnazzyError } from "../snazzyError";
import {
  Dancer,
  type DancerHandPointer,
  setLabel,
  type WorldState,
} from "../worldState";
import type { ContraAnimation } from "./_base";

// ── Types ───────────────────────────────────────────────────────────────

/**
 * A single phase of a per-dancer animation plan.
 *
 * Unlike `Segment`, every function here takes *only* a `frac` — no `dancer`
 * parameter. The instruction has already captured the dancer's identity in
 * the closure when it built the plan.
 */
export type DancerSegment = {
  dur: Beats;
  position?: (frac: number) => Vector; // omit = hold position from previous segment
  facing?: (frac: number) => Vector; // omit = hold facing from previous segment
  hands?: (
    frac: number,
  ) => Partial<Record<Hand, DancerHandPointer | undefined>>; // omit = carry forward
  labels?: (frac: number) => Array<[SettableLabel, DancerId]>; // omit = no label changes
  interactedWith?: () => DancerId[]; // omit = no interaction tracking
};

/**
 * An instruction's per-dancer animation plan: given a dancer (at figure start),
 * returns that dancer's segment list. Different dancers can have different
 * segment boundaries and durations.
 */
export type PlanGetter = (dancer: Dancer) => DancerSegment[];

// ── Per-dancer segment init tracking ────────────────────────────────────

type DancerSnapshot = {
  pos: Vector;
  facing: Vector;
  hands: Partial<Record<Hand, DancerHandPointer>>;
};

function buildSegInits(
  init: WorldState,
  id: ProtoId,
  segments: DancerSegment[],
): DancerSnapshot[] {
  const d = Dancer.get(id, init);
  const snapshots: DancerSnapshot[] = [
    { pos: d.pos, facing: d.facing, hands: d.hands },
  ];
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const prev = snapshots[i];
    snapshots.push({
      pos: seg.position ? seg.position(1) : prev.pos,
      facing: seg.facing ? seg.facing(1) : prev.facing,
      hands: seg.hands ? seg.hands(1) : prev.hands,
    });
  }
  return snapshots;
}

// ── Core composer ───────────────────────────────────────────────────────

const MAX_SPEED_PER_BEAT = 1.0;
const VELOCITY_CHECK_STEP: Beats = 0.25;

function checkVelocity(
  animation: ContraAnimation,
  who: ReadonlySet<ProtoId>,
): SnazzyError[] {
  const warnings: SnazzyError[] = [];
  if (animation.dur === 0) return warnings;

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
        warnings.push(
          new SnazzyError([
            { dancerId: id },
            ` is moving too fast (${speed.toFixed(2)} units/beat, max ${MAX_SPEED_PER_BEAT}) at beat ${t.toFixed(2)}`,
          ]),
        );
      }
    }
    prevState = state;
  }
  return warnings;
}

/**
 * Core composer for per-dancer plans. The plan-based equivalent of `animateSegments`.
 *
 * Each dancer in `who` gets their own segment list (via `getPlans`), which may
 * have different segment boundaries and even different total durations.
 * The animation duration is the max across all dancers; dancers whose plans end
 * early hold their final state.
 */
export function animatePlans(
  init: WorldState,
  who: ReadonlySet<ProtoId>,
  getPlans: PlanGetter,
): ContraAnimation {
  // Build per-dancer segment lists and pre-compute segment-init snapshots.
  const allPlans = new Map<
    ProtoId,
    { segments: DancerSegment[]; segInits: DancerSnapshot[]; totalDur: Beats }
  >();
  for (const id of who) {
    const segments = getPlans(Dancer.get(id, init));
    const segInits = buildSegInits(init, id, segments);
    const totalDur = segments.reduce((sum, s) => sum + s.dur, 0);
    allPlans.set(id, { segments, segInits, totalDur });
  }

  const overallDur = Math.max(...[...allPlans.values()].map((p) => p.totalDur));

  const animation: ContraAnimation = {
    dur: overallDur,
    getFrame(t) {
      return produce(init, (draft) => {
        for (const id of who) {
          const plan = allPlans.get(id);
          if (!plan) continue;
          const { segments, segInits, totalDur } = plan;

          // Clamp t to this dancer's total duration.
          const clampedT = Math.min(t, totalDur);

          if (segments.length === 0) continue;

          // Find the active segment for this dancer.
          let accDur = 0;
          let segIdx = 0;
          for (let i = 0; i < segments.length; i++) {
            if (
              clampedT >= accDur + segments[i].dur &&
              i < segments.length - 1
            ) {
              accDur += segments[i].dur;
              segIdx = i + 1;
              continue;
            }
            segIdx = i;
            break;
          }

          const seg = segments[segIdx];
          const segInit = segInits[segIdx];
          const localT = clampedT - accDur;
          const frac = seg.dur > 0 ? localT / seg.dur : 1;

          draft[id].pos = seg.position ? seg.position(frac) : segInit.pos;
          draft[id].facing = seg.facing ? seg.facing(frac) : segInit.facing;

          draft[id].hands = {};
          draft[id].hands = seg.hands ? seg.hands(frac) : segInit.hands;

          // Accumulate interactedWith from ALL segments up to the active one,
          // matching the legacy behavior where segInit carries forward recents.
          for (let j = 0; j <= segIdx; j++) {
            const s = segments[j];
            if (s.interactedWith) {
              const newRecents = s.interactedWith();
              draft[id].recents = [
                ...newRecents,
                ...draft[id].recents.filter((i) => !newRecents.includes(i)),
              ];
            }
          }
        }

        // Labels are applied in a second pass so setLabel's cross-dancer
        // updates don't collide with position writes.
        for (const id of who) {
          const plan = allPlans.get(id);
          if (!plan) continue;
          const { segments, totalDur } = plan;

          const clampedT = Math.min(t, totalDur);
          if (segments.length === 0) continue;

          let accDur = 0;
          let segIdx = 0;
          for (let i = 0; i < segments.length; i++) {
            if (
              clampedT >= accDur + segments[i].dur &&
              i < segments.length - 1
            ) {
              accDur += segments[i].dur;
              segIdx = i + 1;
              continue;
            }
            segIdx = i;
            break;
          }

          const seg = segments[segIdx];
          const localT = clampedT - accDur;
          const frac = seg.dur > 0 ? localT / seg.dur : 1;

          if (seg.labels) {
            for (const [label, theirId] of seg.labels(frac)) {
              setLabel(draft, id, label, theirId);
            }
          }
        }
      });
    },
  };

  const velocityWarnings = checkVelocity(animation, who);
  if (velocityWarnings.length > 0) {
    animation.warnings = velocityWarnings;
  }

  return animation;
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Evaluate a set of per-dancer plans to get the final WorldState.
 * Useful for computing fudge drifts that depend on all dancers' final positions.
 */
export function evaluatePlansFinalState(
  init: WorldState,
  who: ReadonlySet<ProtoId>,
  getPlan: PlanGetter,
): WorldState {
  return produce(init, (draft) => {
    for (const id of who) {
      const segments = getPlan(Dancer.get(id, init));
      if (!segments || segments.length === 0) continue;

      const d = Dancer.get(id, init);
      let pos = d.pos;
      let facing = d.facing;
      for (const seg of segments) {
        pos = seg.position ? seg.position(1) : pos;
        facing = seg.facing ? seg.facing(1) : facing;
      }
      draft[id].pos = pos;
      draft[id].facing = facing;
    }
  });
}

/**
 * Per-dancer version of `addPositionDrift`.
 * Adds a position offset that goes from zero at the start to `drift(1)` at the end.
 */
export function addDancerDrift(
  segments: DancerSegment[],
  initPos: Vector,
  drift: (globalFrac: number) => Vector,
): DancerSegment[] {
  const totalDur = segments.reduce((sum, s) => sum + s.dur, 0);
  let accDur = 0;
  // Pre-compute per-segment init positions for fallback when position is omitted.
  let carryPos = initPos;
  return segments.map((seg) => {
    const segStart = accDur;
    const segInitPos = carryPos;
    accDur += seg.dur;
    carryPos = seg.position ? seg.position(1) : segInitPos;

    const origPosition = seg.position;
    return {
      ...seg,
      position: (frac: number): Vector => {
        const globalFrac =
          totalDur > 0 ? (segStart + frac * seg.dur) / totalDur : 1;
        const base = origPosition ? origPosition(frac) : segInitPos;
        return base.add(drift(globalFrac));
      },
    };
  });
}
