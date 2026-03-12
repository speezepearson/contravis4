import { z } from "zod";

import { HandSchema, type ProtoId } from "../contraCore";
import { ellipsePosition, getDir, PI } from "../geometry";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { arc, hold, type InstructionAnimator } from "./_segment";

export const PullByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pull_by"),
  cid: CalledIdentifierSchema,
  hand: HandSchema,
});
export type PullByInstruction = z.infer<typeof PullByInstructionSchema>;

export function planPullBy(
  instr: PullByInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const match = dancer.resolveMatch(instr.cid);
  const start = dancer.pos;
  const end = match.pos;
  const semiMinor = 0.25 * { left: -1, right: 1 }[instr.hand];

  return [
    {
      dur: instr.beats,
      position: (frac) => ellipsePosition(start, end, semiMinor, PI * frac),
      facing: (frac) => {
        const myPos = ellipsePosition(start, end, semiMinor, PI * frac);
        const theirPos = ellipsePosition(end, start, semiMinor, PI * frac);
        return getDir({ from: myPos, to: theirPos });
      },
      hands: (frac) => {
        if (frac >= 0.5) return {};
        return hold([instr.hand, match.id, instr.hand]);
      },
      interactedWith: () => [match.id],
    },
  ];
}

export const pullBySegments: InstructionAnimator<PullByInstruction> = (
  instr,
) => {
  const semiMinor = 0.25 * { left: -1, right: 1 }[instr.hand];
  return [
    {
      dur: instr.beats,
      position: arc(instr.cid, { semiMinor, phi: PI }),
      facing: (dancer, _frac) => {
        const them = dancer.resolveMatch(instr.cid);
        return them.pos.subtract(dancer.pos).normalize();
      },
      hands: (dancer, frac) => {
        if (frac >= 0.5) return {};
        const them = dancer.resolveMatch(instr.cid);
        return hold([instr.hand, them.id, instr.hand]);
      },
      interactedWith: (dancer) => [dancer.resolveMatch(instr.cid).id],
    },
  ];
};

export function pullByAnimator(
  instr: PullByInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planPullBy(instr, dancer));
}
