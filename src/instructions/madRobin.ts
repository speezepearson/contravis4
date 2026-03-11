import { z } from "zod";

import { getRole, RoleSchema } from "../contraCore";
import { ellipsePosition, TWO_PI } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { must } from "../utils";
import { Dancer } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
} from "./_base";
import { type InstructionAnimator } from "./_segment";

export const MadRobinInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("mad_robin"),
  cid: CalledIdentifierSchema,
  rotations: z.number(),
  whoInFront: RoleSchema,
});
export type MadRobinInstruction = z.infer<typeof MadRobinInstructionSchema>;

export const madRobinSegments: InstructionAnimator<MadRobinInstruction> = (
  instr,
  init,
  who,
) => {
  const orig = (d: Dancer) => d.at(init);
  const getMatch = (d: Dancer) => orig(d).resolveMatch(instr.cid);

  // Assert all pairs are on the same side of the set
  for (const id of who) {
    const me = Dancer.get(id, init);
    const them = getMatch(me);
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
  // At phi=0 the velocity is proportional to semiMinorDir * (-semiMinor).
  // We need the x-component of that velocity to point towards x=0 for the
  // whoInFront dancer, i.e. its sign must equal -sign(start.x).
  // Equivalently, semiMinorDir.x must have the same sign as start.x.
  let semiMinor = 0.25;
  for (const id of who) {
    if (getRole(id) === instr.whoInFront) {
      const me = Dancer.get(id, init);
      const start = me.pos;
      const end = getMatch(me).pos;
      const semiMajorDir = start.subtract(end).normalize();
      const semiMinorDir = semiMajorDir.rotateByDegrees(90);
      if (Math.sign(semiMinorDir.x) !== Math.sign(start.x)) {
        semiMinor = -semiMinor;
      }
      break;
    }
  }

  const phi = TWO_PI * instr.rotations;

  return [
    {
      dur: instr.beats,
      position: (dancer, frac) => {
        const start = dancer.pos;
        const end = getMatch(dancer).pos;
        return ellipsePosition(start, end, semiMinor, phi * frac);
      },
      facing: (dancer) => {
        return must(resolveCardinalDirection("across", dancer.pos), [
          { dancerId: dancer.protoId },
          "too close to center, not sure which way to face",
        ]);
      },
      hands: () => ({}),
      interactedWith: (dancer) => [getMatch(dancer).id],
    },
  ];
};
