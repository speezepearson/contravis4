import { Vector } from "vecti";
import { z } from "zod";

import { type DancerId, type ProtoId } from "../contraCore";
import { getDir, lerpFacing } from "../geometry";
import { lerpVectors, must } from "../utils";
import { Dancer, getCycle, type Lark, type Robin } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  personInDir,
} from "./_base";
import {
  advanceState,
  type InstructionAnimator,
  linearTo,
  type Segment,
} from "./_segment";
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

export const robinsChainSegments: InstructionAnimator<
  RobinsChainInstruction
> = (instr, init, who) => {
  if (who.size !== 4) throw new Error("chain requires all 4 dancers");

  /** Robin → receiving lark (given by cid). */
  const getReceiver = (dancer: Robin): Lark => {
    const res = must(dancer.resolveCalledIdentifier(instr.cid), [
      { dancerId: dancer.id },
      "has no receiver lark for chain",
    ]);
    if (!res.isLark()) throw new Error("programming error");
    return res;
  };

  /** Lark → robin being sent away (setcounterclockwise from lark). */
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

  {
    for (const dancer of who) {
      getCycle(Dancer.get(dancer, init), (d) => {
        if (d.isLark()) return getSendee(d);
        if (d.isRobin()) return getReceiver(d);
        throw new Error("programming error");
      });
    }
  }

  // Pre-resolve all targets from the init state, before positions change.
  const crossTargets = new Map<ProtoId, CrossTargets>();
  for (const protoId of who) {
    const d = Dancer.get(protoId, init);
    if (d.isRobin()) {
      const receiver = getReceiver(d);
      const receiversSendee = getSendee(receiver);

      // Cross1 waypoint: perpendicular offset from midpoint(robin, receiversSendee).
      const R = d.pos.add(receiversSendee.pos).divide(2);
      const D = getDir({ from: d.pos, to: R });
      const cross1Target = R.add(
        D.rotateByDegrees(90).normalize().multiply(0.25),
      );

      // Cross2 target: 0.25m toward receiver from midpoint(receiver, receiversSendee).
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

      // Lark target: 0.25m toward sendee from midpoint(lark, sendee).
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

  function getTargets(dancer: Dancer): CrossTargets {
    const t = crossTargets.get(dancer.protoId);
    if (!t) throw new Error("programming error");
    return t;
  }

  const halfBeats = instr.beats / 2;
  const quarterBeats = instr.beats / 4;

  // Phase 1: Robins cross the set in two sub-segments (curved path);
  // larks shift linearly to the sent robin's position.

  // Sub-segment 1: Robin curves to waypoint; lark moves toward its midpoint target.
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

  // Sub-segment 2: Robin continues to near receiver; lark finishes to near sendee.
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

  // Phase 2: Courtesy turn, reusing shared logic.
  // Pre-resolve partners from post-cross state.
  const postCrossState = advanceState([cross1, cross2], init, who);
  const partnerOf = resolveCourtesyTurnPartners(postCrossState, who);
  const ctSegs = courtesyTurnSegs(halfBeats, partnerOf);

  // Add interactedWith to each courtesy turn segment.
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
