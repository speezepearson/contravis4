import { z } from "zod";

import { getRole, type ProtoId, RoleSchema } from "../contraCore";
import { ellipsePosition, TWO_PI } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const MadRobinInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("mad_robin"),
  cid: CalledIdentifierSchema,
  rotations: z.number(),
  whoInFront: RoleSchema,
});
export type MadRobinInstruction = z.infer<typeof MadRobinInstructionSchema>;

export function planMadRobin(
  instr: MadRobinInstruction,
  dancer: Dancer,
  semiMinor: number,
): DancerSegment[] {
  const match = dancer.resolveMatch(instr.cid);
  const start = dancer.pos;
  const end = match.pos;
  const phi = TWO_PI * instr.rotations;
  const facingDir = must(resolveCardinalDirection("across", start), [
    { dancerId: dancer.protoId },
    "too close to center, not sure which way to face",
  ]);

  return [
    {
      dur: instr.beats,
      position: (frac) => ellipsePosition(start, end, semiMinor, phi * frac),
      facing: () => facingDir,
      hands: () => ({ left: undefined, right: undefined }),
      interactedWith: () => [match.id],
    },
  ];
}

export function madRobinAnimator(
  instr: MadRobinInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  // Assert all pairs are on the same side of the set
  for (const id of who) {
    const me = Dancer.get(id, init);
    const them = me.resolveMatch(instr.cid);
    if (Math.sign(me.pos.x) !== Math.sign(them.pos.x)) {
      throw new SnazzyError([
        { dancerId: id },
        " and ",
        { dancerId: them.id },
        " are not on the same side of the set for mad robin",
      ]);
    }
  }

  // Determine semiMinor sign so that whoInFront initially moves towards x=0.
  let semiMinor = 0.25;
  for (const id of who) {
    if (getRole(id) === instr.whoInFront) {
      const me = Dancer.get(id, init);
      const start = me.pos;
      const end = me.resolveMatch(instr.cid).pos;
      const semiMajorDir = start.subtract(end).normalize();
      const semiMinorDir = semiMajorDir.rotateByDegrees(90);
      if (Math.sign(semiMinorDir.x) !== Math.sign(start.x)) {
        semiMinor = -semiMinor;
      }
      break;
    }
  }

  return animatePlans(init, who, (dancer) =>
    planMadRobin(instr, dancer, semiMinor),
  );
}
