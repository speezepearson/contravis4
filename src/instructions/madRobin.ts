import { z } from "zod";

import { getRole, RoleSchema } from "../contraCore";
import { ellipsePosition, TWO_PI } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { must } from "../utils";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
  resolveMatches,
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
  const matches = resolveMatches(instr.cid, init, { roles: "different" });

  // Assert all pairs are on the same side of the set
  for (const id of who) {
    const myX = init[id].pos.x;
    const theirX = matches[id].pos.x;
    if (Math.sign(myX) !== Math.sign(theirX)) {
      throw new SnazzyError([
        { dancerId: id },
        " and ",
        { dancerId: matches[id].id },
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
      const start = init[id].pos;
      const end = matches[id].pos;
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
        const end = matches[dancer.protoId].pos;
        return ellipsePosition(start, end, semiMinor, phi * frac);
      },
      facing: (dancer) => {
        return must(resolveCardinalDirection("across", dancer.pos), [
          { dancerId: dancer.protoId },
          "too close to center, not sure which way to face",
        ]);
      },
      hands: () => ({}),
      interactedWith: (dancer) => [matches[dancer.protoId].id],
    },
  ];
};
