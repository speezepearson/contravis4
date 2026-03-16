import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { ccwRadsBetween, PI } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  perRoleId,
  personInDir,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { planCaliforniaTwirl } from "./californiaTwirl";

export const TurnAsACoupleInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("turn_as_a_couple"),
});
export type TurnAsACoupleInstruction = z.infer<
  typeof TurnAsACoupleInstructionSchema
>;

function checkFacingSameDirection(init: WorldState, who: ReadonlySet<ProtoId>) {
  const checked = new Set<string>();
  for (const id of who) {
    const them = Dancer.get(id, init).resolveMatch(
      perRoleId(
        personInDir("on_right", "different"),
        personInDir("on_left", "different"),
      ),
    );
    const pairKey = [id, them.id].sort().join(",");
    if (checked.has(pairKey)) continue;
    checked.add(pairKey);
    const angleDiff = Math.abs(ccwRadsBetween(init[id].facing, them.facing));
    if (angleDiff > PI / 4) {
      throw new SnazzyError([
        { dancerId: id },
        " and ",
        { dancerId: them.id },
        " are not facing the same direction for turn_as_a_couple",
      ]);
    }
  }
}

export function planTurnAsACouple(
  instr: TurnAsACoupleInstruction,
  dancer: Dancer,
): DancerSegment[] {
  return planCaliforniaTwirl(
    { beats: instr.beats, type: "california_twirl" },
    dancer,
  );
}

export function turnAsACoupleAnimator(
  instr: TurnAsACoupleInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  checkFacingSameDirection(init, who);

  return animatePlans(init, who, (dancer) => planTurnAsACouple(instr, dancer));
}
