import { produce } from "immer";
import { Vector } from "vecti";
import { z } from "zod";

import {
  type DancerId,
  getOffset,
  projectDancerIdToProtoId,
  type ProtoId,
} from "../contraCore";
import { getDir, lerpFacing, NORTH, PI } from "../geometry";
import { lerpVectors, must } from "../utils";
import {
  Dancer,
  getCycle,
  type Lark,
  type Robin,
  type WorldState,
} from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import {
  advanceState,
  type InstructionAnimator,
  linearTo,
  type Segment,
} from "./_segment";
import { hold } from "./_segment";
import { courtesyTurnSegs, resolveCourtesyTurnPartners } from "./courtesyTurn";

export const RobinsChainInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("robins_chain"),
  cid: CalledIdentifierSchema,
});
export type RobinsChainInstruction = z.infer<
  typeof RobinsChainInstructionSchema
>;

type CrossTargets = {
  cross1Target: Vector;
  cross2Target: Vector;
  targetFacing: Vector;
  interactedWith: DancerId[];
};

// ── Shared resolution logic ─────────────────────────────────────────────

function resolveChainTargets(
  instr: RobinsChainInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): {
  crossTargets: Map<ProtoId, CrossTargets>;
  getReceiver: (dancer: Robin) => Lark;
  getSendee: (dancer: Lark) => Robin;
} {
  if (who.size !== 4) throw new Error("chain requires all 4 dancers");

  const getReceiver = (dancer: Robin): Lark => {
    const res = must(dancer.resolveCalledIdentifier(instr.cid), [
      { dancerId: dancer.id },
      "has no receiver lark for chain",
    ]);
    if (!res.isLark()) throw new Error("programming error");
    return res;
  };

  const getSendee = (dancer: Lark): Robin => {
    const res = must(
      dancer.resolveCalledIdentifier(
        personInDir("setcounterclockwise", "different"),
      ),
      [
        { dancerId: dancer.id },
        "has no robin in setcounterclockwise direction to send on a chain",
      ],
    );
    if (!res.isRobin()) throw new Error("programming error");
    return res;
  };

  // Validate cycles.
  for (const dancer of who) {
    getCycle(Dancer.get(dancer, init), (d) => {
      if (d.isLark()) return getSendee(d);
      if (d.isRobin()) return getReceiver(d);
      throw new Error("programming error");
    });
  }

  const crossTargets = new Map<ProtoId, CrossTargets>();
  for (const protoId of who) {
    const d = Dancer.get(protoId, init);
    if (d.isRobin()) {
      const receiver = getReceiver(d);
      const receiversSendee = getSendee(receiver);

      const R = d.pos.add(receiversSendee.pos).divide(2);
      const D = getDir({ from: d.pos, to: R });
      const cross1Target = R.add(
        D.rotateByDegrees(90).normalize().multiply(0.25),
      );

      const larkSendeeMid = receiver.pos.add(receiversSendee.pos).divide(2);
      const towardReceiver = getDir({
        from: receiversSendee.pos,
        to: receiver.pos,
      });
      const cross2Target = larkSendeeMid.add(towardReceiver.multiply(0.25));

      crossTargets.set(protoId, {
        cross1Target,
        cross2Target,
        targetFacing: receiver.resolvePureDirection("out"),
        interactedWith: [receiver.id, getSendee(receiver).id],
      });
    } else if (d.isLark()) {
      const sendee = getSendee(d);

      const mid = d.pos.add(sendee.pos).divide(2);
      const towardSendee = getDir({ from: d.pos, to: sendee.pos });
      const finalTarget = mid.add(towardSendee.multiply(0.25));

      crossTargets.set(protoId, {
        cross1Target: d.pos.add(finalTarget).divide(2),
        cross2Target: finalTarget,
        targetFacing: d.resolvePureDirection("out"),
        interactedWith: [sendee.id],
      });
    }
  }

  return { crossTargets, getReceiver, getSendee };
}

// ── Legacy Segment[] API ────────────────────────────────────────────────

export const robinsChainSegments: InstructionAnimator<
  RobinsChainInstruction
> = (instr, init, who) => {
  const { crossTargets } = resolveChainTargets(instr, init, who);

  function getTargets(dancer: Dancer): CrossTargets {
    const t = crossTargets.get(dancer.protoId);
    if (!t) throw new Error("programming error");
    return t;
  }

  const halfBeats = instr.beats / 2;
  const quarterBeats = instr.beats / 4;

  const cross1: Segment = {
    dur: quarterBeats,
    position: (dancer, frac) => {
      const t = getTargets(dancer);
      return lerpVectors(dancer.pos, t.cross1Target, frac);
    },
    facing: (dancer, frac) => {
      const t = getTargets(dancer);
      if (dancer.isLark()) {
        return lerpFacing(dancer.facing, t.targetFacing, frac * 0.5, {
          forceDir: "ccw",
        });
      }
      return lerpFacing(dancer.facing, t.targetFacing, frac * 0.5);
    },
    hands: () => ({}),
    interactedWith: (dancer) => getTargets(dancer).interactedWith,
  };

  const cross2: Segment = {
    dur: quarterBeats,
    position: linearTo((dancer) => getTargets(dancer).cross2Target),
    facing: (dancer, frac) => {
      const t = getTargets(dancer);
      if (dancer.isLark()) {
        return lerpFacing(dancer.facing, t.targetFacing, frac, {
          forceDir: "ccw",
        });
      }
      return lerpFacing(dancer.facing, t.targetFacing, frac);
    },
    hands: () => ({}),
    interactedWith: (dancer) => getTargets(dancer).interactedWith,
  };

  const postCrossState = advanceState([cross1, cross2], init, who);
  const partnerOf = resolveCourtesyTurnPartners(postCrossState, who);
  const ctSegs = courtesyTurnSegs(halfBeats, partnerOf);

  const ctSegsWithInteraction = ctSegs.map((seg) => ({
    ...seg,
    interactedWith: (dancer: Dancer): DancerId[] => {
      const themId = partnerOf.get(dancer.id);
      if (!themId) throw new Error("programming error");
      return [themId];
    },
  }));

  return [cross1, cross2, ...ctSegsWithInteraction];
};

// ── Plan-based API (top-level instruction) ──────────────────────────────

/**
 * Animate a robins chain using per-dancer plans.
 *
 * Each dancer gets their own DancerSegment[] with closures that know the
 * dancer's identity, targets, and partners. No `dancer` parameter needed.
 */
export function robinsChainAnimator(
  instr: RobinsChainInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const { crossTargets } = resolveChainTargets(instr, init, who);

  const halfBeats = instr.beats / 2;
  const quarterBeats = instr.beats / 4;

  // Pre-compute the post-cross state so we can resolve courtesy turn partners.
  // Each dancer's post-cross position is their cross2Target, facing is targetFacing.
  // We need a full WorldState for resolveCourtesyTurnPartners.
  const postCrossPositions = new Map<
    ProtoId,
    { pos: Vector; facing: Vector }
  >();
  for (const id of who) {
    const targets = crossTargets.get(id);
    if (!targets) throw new Error("programming error");
    postCrossPositions.set(id, {
      pos: targets.cross2Target,
      facing: targets.targetFacing,
    });
  }

  // Build a synthetic post-cross WorldState for resolving courtesy turn partners.
  // We need this because resolveCourtesyTurnPartners uses Dancer lookups.
  const postCrossState: WorldState = produce(init, (draft) => {
    for (const id of who) {
      const pcp = postCrossPositions.get(id);
      if (!pcp) continue;
      draft[id].pos = pcp.pos;
      draft[id].facing = pcp.facing;
      draft[id].hands = {};
    }
  });

  const partnerOf = resolveCourtesyTurnPartners(postCrossState, who);

  const getPlans = (dancer: Dancer): DancerSegment[] => {
    const targets = crossTargets.get(dancer.protoId);
    if (!targets) throw new Error("programming error");

    const amLark = dancer.isLark();

    // Crossing phase 1: move to waypoint
    const cross1: DancerSegment = {
      dur: quarterBeats,
      position: (frac) => lerpVectors(dancer.pos, targets.cross1Target, frac),
      facing: (frac) =>
        lerpFacing(
          dancer.facing,
          targets.targetFacing,
          frac * 0.5,
          amLark
            ? {
                forceDir: "ccw",
              }
            : {},
        ),
      hands: () => ({}),
      interactedWith: () => targets.interactedWith,
    };

    // Crossing phase 2: move to final cross position
    // Need the facing at end of cross1 for lerp starting point.
    const cross1EndFacing = lerpFacing(
      dancer.facing,
      targets.targetFacing,
      0.5,
      amLark ? { forceDir: "ccw" } : {},
    );
    const cross2: DancerSegment = {
      dur: quarterBeats,
      position: (frac) =>
        lerpVectors(targets.cross1Target, targets.cross2Target, frac),
      facing: (frac) =>
        lerpFacing(
          cross1EndFacing,
          targets.targetFacing,
          frac,
          amLark
            ? {
                forceDir: "ccw",
              }
            : {},
        ),
      hands: () => ({}),
      interactedWith: () => targets.interactedWith,
    };

    // Courtesy turn phase (2 segments).
    // Pre-compute all the values needed for the courtesy turn closures.
    const ctPartnerId = partnerOf.get(dancer.id);
    if (!ctPartnerId) throw new Error("programming error");

    const myPostCrossPos = targets.cross2Target;
    const partnerProtoId = projectDancerIdToProtoId(ctPartnerId);
    // Use offset-adjusted position so the CT center is correct when the
    // partner has a non-zero progression offset (e.g. "down_robin_1").
    const partnerPostCrossPos = (() => {
      const pt = crossTargets.get(partnerProtoId);
      if (!pt) throw new Error("programming error");
      const partnerOffset = getOffset(ctPartnerId);
      return pt.cross2Target.add(NORTH.multiply(partnerOffset * 2));
    })();

    const ctHands = () =>
      hold(["left", ctPartnerId, "left"], ["right", ctPartnerId, "right"]);

    // CT segment 1: quarter-ellipse normalizing distance.
    const ct1: DancerSegment = {
      dur: halfBeats / 2,
      position: (frac) => {
        const center = myPostCrossPos.add(partnerPostCrossPos).divide(2);
        const offset = myPostCrossPos.subtract(center);
        const r = offset.length();
        const majorDir = offset.normalize();
        const minorDir = majorDir.rotateByRadians(PI / 2);
        const phi = (PI / 2) * frac;
        return center
          .add(majorDir.multiply(r * Math.cos(phi)))
          .add(minorDir.multiply(0.25 * Math.sin(phi)));
      },
      facing: (frac) => targets.targetFacing.rotateByRadians((PI / 2) * frac),
      hands: ctHands,
      interactedWith: () => [ctPartnerId],
    };

    // CT segment 2: quarter-circle at fixed radius.
    // Need starting position/facing from end of CT1.
    const ct1EndPos = (() => {
      const center = myPostCrossPos.add(partnerPostCrossPos).divide(2);
      const offset = myPostCrossPos.subtract(center);
      const majorDir = offset.normalize();
      const minorDir = majorDir.rotateByRadians(PI / 2);
      return center.add(minorDir.multiply(0.25));
    })();
    const ct1EndFacing = targets.targetFacing.rotateByRadians(PI / 2);

    // For CT2, the partner has also moved. Compute the partner's CT1 end position.
    const partnerCt1EndPos = (() => {
      const center = myPostCrossPos.add(partnerPostCrossPos).divide(2);
      const offset = partnerPostCrossPos.subtract(center);
      const majorDir = offset.normalize();
      const minorDir = majorDir.rotateByRadians(PI / 2);
      return center.add(minorDir.multiply(0.25));
    })();

    const ct2: DancerSegment = {
      dur: halfBeats / 2,
      position: (frac) => {
        const center = ct1EndPos.add(partnerCt1EndPos).divide(2);
        const offset = ct1EndPos.subtract(center);
        const r = offset.length();
        const majorDir = offset.normalize();
        const minorDir = majorDir.rotateByRadians(PI / 2);
        const phi = (PI / 2) * frac;
        return center
          .add(majorDir.multiply(r * Math.cos(phi)))
          .add(minorDir.multiply(0.35 * Math.sin(phi)));
      },
      facing: (frac) => ct1EndFacing.rotateByRadians((PI / 2) * frac),
      hands: ctHands,
      interactedWith: () => [ctPartnerId],
    };

    return [cross1, cross2, ct1, ct2];
  };

  return animatePlans(init, who, getPlans);
}
