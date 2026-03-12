import { produce } from "immer";
import type { Vector } from "vecti";
import { z } from "zod";

import {
  ALL_PROTO_IDS,
  getRole,
  type Hand,
  HandSchema,
  otherRole,
  type ProtoId,
  type Role,
  RoleSchema,
} from "../contraCore";
import { ellipsePosition, PI } from "../geometry";
import { must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
  pureDir,
  resolveCardinalDirection,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator, type PositionFn } from "./_segment";

export const PoussetteInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("poussette"),
  backer: RoleSchema,
  backerDir: HandSchema,
  full: z.boolean(),
});
export type PoussetteInstruction = z.infer<typeof PoussetteInstructionSchema>;

/**
 * Creates a position function for a poussette arc (legacy Segment API).
 * The backer traces an elliptical arc; the non-backer maintains displacement.
 * Arc dests are resolved by temporarily facing dancers across.
 */
export function makeHalfPoussetteArcPositionFn(
  backerRole: Role,
  backerDir: Hand,
  init: WorldState,
): PositionFn {
  const arcDests = new Map<ProtoId, { start: Vector; end: Vector }>();
  for (const id of ALL_PROTO_IDS) {
    const isBacker = getRole(id) === backerRole;
    arcDests.set(id, {
      start: init[id].pos,
      end: init[id].pos.add(
        Dancer.get(id, init)
          .resolveCalledDirection(pureDir("across"))
          .rotateByDegrees(
            (isBacker ? 1 : -1) * { right: -90, left: 90 }[backerDir],
          ),
      ),
    });
  }

  return (dancer, frac) => {
    const { start, end } = must(arcDests.get(dancer.protoId), [
      { dancerId: dancer.protoId },
      "missing arc dest",
    ]);
    const semiMinorCw =
      -0.75 *
      Math.sign(start.x) *
      Math.sign(end.y - start.y) *
      (dancer.role === backerRole ? 1 : -1.3);
    return ellipsePosition(start, end, semiMinorCw, PI * frac);
  };
}

/**
 * Creates a per-dancer position function for a poussette arc (plan API).
 * Pre-computes all needed values at plan time so the returned function
 * takes only frac.
 */
export function makeHalfPoussetteArcDancerPositionFn(
  backerRole: Role,
  backerDir: Hand,
  dancer: Dancer,
): (frac: number) => Vector {
  const isBacker = dancer.role === backerRole;
  const start = dancer.pos;
  const end = start.add(
    dancer
      .resolveCalledDirection(pureDir("across"))
      .rotateByDegrees(
        (isBacker ? 1 : -1) * { right: -90, left: 90 }[backerDir],
      ),
  );
  const semiMinorCw =
    -0.75 *
    Math.sign(start.x) *
    Math.sign(end.y - start.y) *
    (isBacker ? 1 : -1.3);

  return (frac) => ellipsePosition(start, end, semiMinorCw, PI * frac);
}

// ── Plan-based API ──────────────────────────────────────────────────────

export function planPoussette(
  instr: PoussetteInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const matchId = dancer.resolveMatch(personInDir("across", "different")).id;

  // Setup: face across, take two-hand hold with match
  const setupFacing = must(resolveCardinalDirection("across", dancer.pos), [
    { dancerId: dancer.protoId },
    "too close to center, not sure which way to face",
  ]);
  const postSetupDancer = produce(dancer, (draft) => {
    draft.facing = setupFacing;
  });

  const setupSegment: DancerSegment = {
    dur: 0,
    position: () => dancer.pos,
    facing: () => setupFacing,
    hands: () => ({
      left: { theirId: matchId, theirHand: "right" },
      right: { theirId: matchId, theirHand: "left" },
    }),
  };

  const halfBeats = instr.full ? instr.beats / 2 : instr.beats;

  // First half: arc with original backer
  const firstHalfPosition = makeHalfPoussetteArcDancerPositionFn(
    instr.backer,
    instr.backerDir,
    postSetupDancer,
  );

  const firstHalf: DancerSegment = {
    dur: halfBeats,
    position: firstHalfPosition,
    hands: () => ({
      left: { theirId: matchId, theirHand: "right" },
      right: { theirId: matchId, theirHand: "left" },
    }),
    interactedWith: () => [matchId],
  };

  if (!instr.full) {
    return [setupSegment, firstHalf];
  }

  // Second half: arc with other backer, same backerDir.
  // Compute post-first-half dancer state.
  const postFirstHalfDancer = produce(postSetupDancer, (draft) => {
    draft.pos = firstHalfPosition(1);
  });

  const secondHalfPosition = makeHalfPoussetteArcDancerPositionFn(
    otherRole(instr.backer),
    instr.backerDir,
    postFirstHalfDancer,
  );

  const secondHalf: DancerSegment = {
    dur: halfBeats,
    position: secondHalfPosition,
    hands: () => ({
      left: { theirId: matchId, theirHand: "right" },
      right: { theirId: matchId, theirHand: "left" },
    }),
  };

  return [setupSegment, firstHalf, secondHalf];
}

// ── Legacy Segment[] API ────────────────────────────────────────────────

export const poussetteSegments: InstructionAnimator<PoussetteInstruction> = (
  instr,
  init,
  who,
) => {
  const anim = animatePlans(init, who, (d) => planPoussette(instr, d));
  return [
    {
      dur: instr.beats,
      position: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).pos,
      facing: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).facing,
      hands: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).hands,
      interactedWith: (dancer) => dancer.at(anim.getFrame(instr.beats)).recents,
    },
  ];
};

// ── Animator API ────────────────────────────────────────────────────────

export function poussetteAnimator(
  instr: PoussetteInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (d) => planPoussette(instr, d));
}
