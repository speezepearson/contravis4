import { produce } from "immer";
import { Vector } from "vecti";
import { z } from "zod";

import {
  ALL_PROTO_IDS,
  getRole,
  type ProtoId,
  RoleSchema,
} from "../contraCore";
import { lerpFacing } from "../geometry";
import { lerpVectors, must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
  resolveCardinalDirection,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { hold } from "./_segment";

export const LongLineInCenterInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("long_line_in_center"),
  role: RoleSchema,
});
export type LongLineInCenterInstruction = z.infer<
  typeof LongLineInCenterInstructionSchema
>;

/**
 * Compute the world state after all targeted dancers have moved to the center
 * line and face across. Needed to resolve "on_left"/"on_right" hand
 * connections from the correct positions.
 */
function computeLongLineFinalState(
  instr: LongLineInCenterInstruction,
  init: WorldState,
): WorldState {
  return produce(init, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      if (getRole(id) !== instr.role) continue;
      draft[id].pos = new Vector(0, draft[id].pos.y);
      draft[id].facing = must(
        resolveCardinalDirection("across", init[id].pos),
        [{ dancerId: id }, "too close to center, not sure which way to move"],
      );
    }
  });
}

export function planLongLineInCenter(
  instr: LongLineInCenterInstruction,
  dancer: Dancer,
  finalState: WorldState,
): DancerSegment[] {
  if (getRole(dancer.protoId) !== instr.role) {
    return [{ dur: instr.beats }, { dur: 0 }];
  }

  const startPos = dancer.pos;
  const target = new Vector(0, dancer.pos.y);
  const startFacing = dancer.facing;
  const targetFacing = must(resolveCardinalDirection("across", dancer.pos), [
    { dancerId: dancer.protoId },
    "too close to center, not sure which way to move",
  ]);

  const finalDancer = Dancer.get(dancer.protoId, finalState);

  return [
    {
      dur: instr.beats,
      position: (frac) => lerpVectors(startPos, target, frac),
      facing: (frac) => lerpFacing(startFacing, targetFacing, frac),
      hands: () => ({}),
    },
    {
      dur: 0,
      hands: () =>
        hold(
          [
            "left",
            finalDancer.resolveMatch(personInDir("on_left", "same")).id,
            "left",
          ],
          [
            "right",
            finalDancer.resolveMatch(personInDir("on_right", "same")).id,
            "right",
          ],
        ),
    },
  ];
}

export function longLineInCenterAnimator(
  instr: LongLineInCenterInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const finalState = computeLongLineFinalState(instr, init);
  return animatePlans(init, who, (dancer) =>
    planLongLineInCenter(instr, dancer, finalState),
  );
}
