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
import { instructionBaseSchemaFields, resolveCardinalDirection } from "./_base";
import {
  advanceState,
  hold,
  type InstructionAnimator,
  makeImmediateSegment,
  type PositionFn,
  type Segment,
} from "./_segment";

export const PoussetteInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("poussette"),
  backer: RoleSchema,
  backerDir: HandSchema,
  full: z.boolean(),
});
export type PoussetteInstruction = z.infer<typeof PoussetteInstructionSchema>;

/**
 * Creates a position function for a poussette arc.
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
          .resolveCalledDirection("across")
          .rotateByDegrees(
            (isBacker ? 1 : -1) * { right: -90, left: 90 }[backerDir],
          ),
      ),
    });
  }
  // console.log({arcDests})

  return (dancer, frac) => {
    const { start, end } = arcDests.get(dancer.protoId)!;
    const semiMinorCw =
      -0.75 *
      Math.sign(start.x) *
      Math.sign(end.y - start.y) *
      (dancer.role === backerRole ? 1 : -1.3);
    return ellipsePosition(start, end, semiMinorCw, PI * frac);
  };
}

export const poussetteSegments: InstructionAnimator<PoussetteInstruction> = (
  instr,
  init,
  who,
) => {
  const orig = (d: Dancer) => d.at(init);
  const getMatch = (d: Dancer) =>
    orig(d).resolveMatch("person_across", { roles: "different" });

  const setupSegment = makeImmediateSegment(init, (id, draft) => {
    draft[id].facing = must(resolveCardinalDirection("across", draft[id].pos), [
      { dancerId: id },
      "too close to center, not sure which way to face",
    ]);
    const match = getMatch(Dancer.get(id, init));
    draft[id].hands = hold(
      ["left", match.id, "right"],
      ["right", match.id, "left"],
    );
  });

  const afterSetup = advanceState([setupSegment], init, who);

  const handsFn = (dancer: Dancer) => {
    const matchId = getMatch(dancer).id;
    return hold(["left", matchId, "right"], ["right", matchId, "left"]);
  };

  const halfBeats = instr.full ? instr.beats / 2 : instr.beats;

  const firstHalf: Segment = {
    dur: halfBeats,
    position: makeHalfPoussetteArcPositionFn(
      instr.backer,
      instr.backerDir,
      afterSetup,
    ),
    hands: handsFn,
    interactedWith: (dancer) => [getMatch(dancer).id],
  };

  if (!instr.full) {
    return [setupSegment, firstHalf];
  }

  const afterFirst = advanceState([firstHalf], afterSetup, who);
  // The second half uses the other backer but the SAME backerDir.
  // Since the new backer faces the opposite direction across,
  // on_${backerDir} naturally resolves to the opposite spatial direction,
  // bringing the couple back to where it started.
  const secondHalf = {
    dur: halfBeats,
    position: makeHalfPoussetteArcPositionFn(
      otherRole(instr.backer),
      instr.backerDir,
      afterFirst,
    ),
    hands: handsFn,
  };

  return [setupSegment, firstHalf, secondHalf];
};
