import { Vector } from "vecti";
import { z } from "zod";

import { HandSchema, type ProtoId, RoleSchema } from "../contraCore";
import {
  getGroupOfFour,
  makePreferHinted,
  preferCloser,
  preferOneInFront,
  preferRecent,
  type Tiebreaker,
} from "../formations";
import { getSingleton, lerpVectors, must } from "../utils";
import { getDancerSide, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { fudgePlansToAlignY, fudgePlansToSpaceEvenlyInY } from "./_fudge";
import { animatePlans, type PlanGetter } from "./_plan";

export const HeyInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("hey"),
  full: z.boolean(),
  centerRole: RoleSchema,
  centerHand: HandSchema,
  disambiguatingCid: CalledIdentifierSchema.optional(),
});
export type HeyInstruction = z.infer<typeof HeyInstructionSchema>;

export function heyAnimator(
  instr: HeyInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  if (who.size !== 4) throw new Error("hey requires all 4 dancers");

  const tiebreakers: [Tiebreaker, ...Tiebreaker[]] = instr.disambiguatingCid
    ? [
        makePreferHinted(instr.disambiguatingCid),
        preferCloser,
        preferOneInFront,
        preferRecent,
      ]
    : [preferCloser, preferOneInFront, preferRecent];

  const basePlan: PlanGetter = (dancer) => {
    const group = getGroupOfFour(dancer, { by: tiebreakers });
    const side = getDancerSide(dancer);

    const targetPos = (() => {
      if (instr.full) {
        const x = side === "west" ? -0.5 : 0.5;
        return new Vector(x, dancer.pos.y);
      } else {
        const sameRoleOther = must(
          getSingleton(
            group.filter((d) => d.role === dancer.role && d.dir !== dancer.dir),
          ),
        );
        const x = side === "west" ? 0.5 : -0.5;
        return new Vector(x, sameRoleOther.pos.y);
      }
    })();

    const interacted = group.filter((d) => d.id !== dancer.id).map((d) => d.id);

    return [
      {
        dur: instr.beats,
        position: (frac: number) => lerpVectors(dancer.pos, targetPos, frac),
        hands: () => ({}),
        interactedWith: () => interacted,
      },
    ];
  };

  const fudgedPlan = fudgePlansToAlignY(
    fudgePlansToSpaceEvenlyInY(basePlan, init),
    init,
  );

  return animatePlans(init, who, fudgedPlan);
}
