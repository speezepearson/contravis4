import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { ellipsePosition, getDir, PI } from "../geometry";
import { must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import { type ContraAnimation, instructionBaseSchemaFields } from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator } from "./_segment";

export const CourtesyTurnInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("courtesy_turn"),
});
export type CourtesyTurnInstruction = z.infer<
  typeof CourtesyTurnInstructionSchema
>;

export const courtesyTurnSegments: InstructionAnimator<
  CourtesyTurnInstruction
> = (instr, init, who) => {
  const anim = animatePlans(init, who, (d) => planCourtesyTurn(instr, d));
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

// ── Plan-based API (top-level instruction) ──────────────────────────────

export function planCourtesyTurn(
  instr: CourtesyTurnInstruction,
  dancer: Dancer,
): DancerSegment[] {
  return planCourtesyTurnWithResolvedMatch(
    instr,
    dancer,
    must(
      dancer.resolveCalledIdentifier({
        type: "PerRole",
        larks: {
          type: "PersonInDirection",
          dir: "on_right",
          onlyRole: "different",
        },
        robins: {
          type: "PersonInDirection",
          dir: "on_left",
          onlyRole: "different",
        },
      }),
    ),
  );
}

export function planCourtesyTurnWithResolvedMatch(
  instr: Omit<CourtesyTurnInstruction, "id" | "type" | "cid">,
  dancer: Dancer,
  other: Dancer,
): DancerSegment[] {
  const toThem = getDir({ from: dancer.pos, to: other.pos });
  const initFacing = toThem.rotateByRadians(
    ({ lark: 1, robin: -1 }[dancer.role] * PI) / 2,
  );
  return [
    {
      dur: instr.beats,
      position: (frac) =>
        ellipsePosition(dancer.pos, other.pos, -0.25, PI * frac),
      facing: (frac) => initFacing.rotateByRadians(PI * frac),
      hands: () => ({
        left: { theirId: other.id, theirHand: "left" },
        right: { theirId: other.id, theirHand: "right" },
      }),
      interactedWith: () => [other.id],
    },
  ];
}

export function courtesyTurnAnimator(
  instr: CourtesyTurnInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planCourtesyTurn(instr, dancer));
}
