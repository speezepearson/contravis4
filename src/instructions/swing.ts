import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, type Beats, isLark, type ProtoId } from "../contraCore";
import {
  ccwRadsBetween,
  getDir,
  getDist,
  lerpFacing,
  revolve,
  TWO_PI,
} from "../geometry";
import { getSide, indexOf, lerpVectors, must, safeThreshold } from "../utils";
import {
  avgPos,
  Dancer,
  findNearbyDancers,
  getDancerSide,
  type WorldState,
} from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
} from "./_base";
import { computeEvenSpacingFudge } from "./_fudge";
import {
  addDancerDrift,
  animatePlans,
  type DancerSegment,
  evaluatePlansFinalState,
} from "./_plan";
import { hold } from "./_segment";

export const SwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("swing"),
  cid: CalledIdentifierSchema,
  endFacing: CardinalDirectionSchema,
});
export type SwingInstruction = z.infer<typeof SwingInstructionSchema>;

const DISENGAGE_BEATS = 1.5;
const ORBIT_RADIUS = 0.2;
const APPROX_BEATS_PER_SWING_ROTATION = 4;

/**
 * Choose approachBeats so the linear approach speed matches the orbit speed.
 *
 * Linear approach speed = approachDistance / approachBeats (constant).
 * Orbit speed = ORBIT_RADIUS * |swingRadians| / swingBeats.
 * Setting equal (with swingBeats = availableBeats - approachBeats):
 *   approachBeats = approachDist * available / (ORBIT_RADIUS * |swingRad| + approachDist)
 */
export function swingApproachBeatsForSpeedMatch(
  approachDistance: number,
  availableBeats: Beats,
  swingRadians: number,
): Beats {
  const orbitFactor = ORBIT_RADIUS * Math.abs(swingRadians);
  if (approachDistance + orbitFactor === 0) return 0;
  return (approachDistance * availableBeats) / (orbitFactor + approachDistance);
}

// ── Shared swing geometry ───────────────────────────────────────────────

type SwingGeometry = {
  final: { facing: Vector; pos: Vector };
  center: Vector;
  postApproach: { pos: Vector; facing: Vector };
  postSwing: { pos: Vector; facing: Vector };
  numSwingRadians: number;
};

function computeSwingGeometry(
  instr: SwingInstruction,
  init: WorldState,
): (d: Dancer) => SwingGeometry {
  const orig = (d: Dancer) => d.at(init);
  const getMatch = (d: Dancer) => orig(d).resolveMatch(instr.cid);
  const getCenter = (d: Dancer) => avgPos(orig(d), getMatch(d));

  return (d: Dancer): SwingGeometry => {
    const me = orig(d);
    const center = getCenter(d);
    const finalFacing = must(
      resolveCardinalDirection(instr.endFacing, center),
      [{ dancerId: d.id }, `unable to resolve end facing ${instr.endFacing}`],
    );

    const final = {
      facing: finalFacing,
      pos: center.add(
        finalFacing
          .multiply(
            { across: 1, out: 1, up: 0.5, down: 0.5 }[instr.endFacing] / 2,
          )
          .rotateByDegrees(90 * (isLark(d.protoId) ? 1 : -1)),
      ),
    };

    const postApproach = {
      pos: center.add(
        getDir({ from: center, to: me.pos })
          .multiply(ORBIT_RADIUS)
          .rotateByDegrees(-30),
      ),
      facing: getDir({ from: me.pos, to: center }),
    };

    const numSwingRadians =
      -TWO_PI * Math.floor(instr.beats / APPROX_BEATS_PER_SWING_ROTATION) +
      ccwRadsBetween(
        isLark(d.protoId)
          ? postApproach.facing
          : postApproach.facing.multiply(-1),
        finalFacing,
      );

    const postSwing = {
      pos: revolve(postApproach.pos, {
        around: center,
        radians: numSwingRadians,
      }),
      facing: postApproach.facing.rotateByRadians(numSwingRadians),
    };

    return { final, center, postApproach, postSwing, numSwingRadians };
  };
}

function computeSwingTiming(
  instr: SwingInstruction,
  init: WorldState,
  getGeom: (d: Dancer) => SwingGeometry,
): { approachBeats: Beats; swingBeats: Beats } {
  let totalApproachDist = 0;
  let totalSwingRadians = 0;
  for (const id of ALL_PROTO_IDS) {
    const geom = getGeom(Dancer.get(id, init));
    totalApproachDist += Dancer.get(id, init)
      .pos.subtract(geom.postApproach.pos)
      .length();
    totalSwingRadians += Math.abs(geom.numSwingRadians);
  }
  const avgApproachDist = totalApproachDist / ALL_PROTO_IDS.length;
  const avgSwingRadians = totalSwingRadians / ALL_PROTO_IDS.length;
  const approachBeats = swingApproachBeatsForSpeedMatch(
    avgApproachDist,
    instr.beats - DISENGAGE_BEATS,
    avgSwingRadians,
  );
  return {
    approachBeats,
    swingBeats: instr.beats - approachBeats - DISENGAGE_BEATS,
  };
}

/**
 * Build per-dancer swing plans (with fudge drifts applied for across/out endings).
 *
 * This is the composable building block: compound instructions (balanceAndSwing,
 * meltdownSwing, etc.) can call this on an intermediate state, get back per-dancer
 * DancerSegment[], and concatenate with their pre-swing plans.
 */
export function buildSwingPlans(
  instr: SwingInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): Map<ProtoId, DancerSegment[]> {
  const orig = (d: Dancer) => d.at(init);
  const getMatch = (d: Dancer) => orig(d).resolveMatch(instr.cid);
  const getCenter = (d: Dancer) => avgPos(orig(d), getMatch(d));

  const getGeom = computeSwingGeometry(instr, init);
  const { approachBeats, swingBeats } = computeSwingTiming(
    instr,
    init,
    getGeom,
  );

  const getPlan = (dancer: Dancer): DancerSegment[] => {
    const geom = getGeom(dancer);
    const matchId = getMatch(dancer).id;
    const amLark = isLark(dancer.protoId);

    const swingHands = () =>
      hold(amLark ? ["right", matchId, "left"] : ["left", matchId, "right"]);

    const disengageAngle = (() => {
      let angle = ccwRadsBetween(geom.postSwing.facing, geom.final.facing);
      if (!amLark && angle > 0) angle -= TWO_PI;
      return angle;
    })();

    return [
      // Approach
      {
        dur: approachBeats,
        position: (frac) =>
          lerpVectors(dancer.pos, geom.postApproach.pos, frac),
        facing: (frac) =>
          lerpFacing(dancer.facing, geom.postApproach.facing, frac),
        hands: () => ({}),
        interactedWith: () => [matchId],
      },
      // Orbit
      {
        dur: swingBeats,
        position: (frac) =>
          revolve(geom.postApproach.pos, {
            around: geom.center,
            radians: geom.numSwingRadians * frac,
          }),
        facing: (frac) =>
          geom.postApproach.facing.rotateByRadians(geom.numSwingRadians * frac),
        hands: swingHands,
      },
      // Disengage
      {
        dur: DISENGAGE_BEATS,
        position: (frac) =>
          lerpVectors(geom.postSwing.pos, geom.final.pos, frac),
        facing: (frac) =>
          geom.postSwing.facing.rotateByRadians(disengageAngle * frac),
        hands: swingHands,
      },
    ];
  };

  // Build plans for all dancers.
  const unfudgedPlans = new Map<ProtoId, DancerSegment[]>();
  for (const id of who) {
    unfudgedPlans.set(id, getPlan(Dancer.get(id, init)));
  }

  // For across/out endings, apply fudge drifts to each dancer's plan.
  switch (instr.endFacing) {
    case "across":
    case "out": {
      // Step 1: x-snap drift (snap center.x to ±0.5).
      const xDrifts = new Map<ProtoId, number>();
      for (const id of who) {
        const d = Dancer.get(id, init);
        const center = getCenter(d);
        const side = must(getSide(center), [
          { dancerId: d.id },
          "too close to center, not sure which side is east or west",
        ]);
        xDrifts.set(id, { east: 0.5, west: -0.5 }[side] - center.x);
      }

      const xSnappedPlans = new Map<ProtoId, DancerSegment[]>();
      for (const id of who) {
        const xDrift = xDrifts.get(id) ?? 0;
        const dancerInitPos = Dancer.get(id, init).pos;
        xSnappedPlans.set(
          id,
          addDancerDrift(
            unfudgedPlans.get(id) ?? [],
            dancerInitPos,
            (globalFrac) => new Vector(xDrift * globalFrac, 0),
          ),
        );
      }

      // Step 2: y-spacing drift (space dancers evenly on each side).
      const xSnappedFinal = evaluatePlansFinalState(init, who, xSnappedPlans);
      const west: ProtoId[] = [];
      const east: ProtoId[] = [];
      for (const id of ALL_PROTO_IDS) {
        const side = getDancerSide(Dancer.get(id, xSnappedFinal));
        if (side === "west") west.push(id);
        else east.push(id);
      }
      const westFudges = computeEvenSpacingFudge(
        xSnappedFinal[west[0]].pos.y,
        xSnappedFinal[west[1]].pos.y,
      );
      const eastFudges = computeEvenSpacingFudge(
        xSnappedFinal[east[0]].pos.y,
        xSnappedFinal[east[1]].pos.y,
      );
      const ySpacingDrifts = new Map<ProtoId, number>();
      ySpacingDrifts.set(west[0], westFudges[0]);
      ySpacingDrifts.set(west[1], westFudges[1]);
      ySpacingDrifts.set(east[0], eastFudges[0]);
      ySpacingDrifts.set(east[1], eastFudges[1]);

      const ySpacedPlans = new Map<ProtoId, DancerSegment[]>();
      for (const id of who) {
        const dy = ySpacingDrifts.get(id) ?? 0;
        const dancerInitPos = Dancer.get(id, init).pos;
        ySpacedPlans.set(
          id,
          addDancerDrift(
            xSnappedPlans.get(id) ?? [],
            dancerInitPos,
            (globalFrac) => new Vector(0, dy * globalFrac),
          ),
        );
      }

      // Step 3: y-alignment drift (align across-matches in y).
      const ySpacedFinal = evaluatePlansFinalState(init, who, ySpacedPlans);

      const findDyToNearest = (
        fromProto: ProtoId,
        toProto: ProtoId,
      ): number => {
        const fromPos = Dancer.get(fromProto, ySpacedFinal).pos;
        const [candidate0, candidate1] = findNearbyDancers(
          fromPos,
          toProto,
          ySpacedFinal,
        );
        const dist0 = getDist(fromPos, candidate0.pos);
        const dist1 = getDist(fromPos, candidate1.pos);
        const chosen = (() => {
          const res = safeThreshold(dist0 - dist1, {
            neg: candidate0,
            pos: candidate1,
          });
          if (res) return res;
          const recents = init[fromProto].recents;
          const recency0 = indexOf(recents, candidate0.id) ?? Infinity;
          const recency1 = indexOf(recents, candidate1.id) ?? Infinity;
          if (recency0 < recency1) return candidate0;
          if (recency1 < recency0) return candidate1;
          throw new Error(
            `[swingAnimator fudgeToAlignY] can't determine nearest copy`,
          );
        })();
        return chosen.pos.y - fromPos.y;
      };

      const westLark = must(
        west.find((id) => isLark(id)),
        ["no lark on west side"],
      );
      const eastRobin = must(
        east.find((id) => !isLark(id)),
        ["no robin on east side"],
      );

      const dyWest = findDyToNearest(westLark, eastRobin);
      const dyFudgeWest = dyWest / 2;
      const dyFudgeEast = -dyFudgeWest;

      const westIds = new Set(west);
      const finalPlans = new Map<ProtoId, DancerSegment[]>();
      for (const id of who) {
        const dy = westIds.has(id) ? dyFudgeWest : dyFudgeEast;
        const dancerInitPos = Dancer.get(id, init).pos;
        finalPlans.set(
          id,
          addDancerDrift(
            ySpacedPlans.get(id) ?? [],
            dancerInitPos,
            (globalFrac) => new Vector(0, dy * globalFrac),
          ),
        );
      }

      return finalPlans;
    }
  }

  // Non-across/out endings: no fudge needed.
  return unfudgedPlans;
}

export function swingAnimator(
  instr: SwingInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const plans = buildSwingPlans(instr, init, who);
  return animatePlans(init, who, (d) => plans.get(d.protoId) ?? []);
}
