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
import { getDir, PI, TWO_PI } from "../geometry";
import { getSingleton, must, safeThreshold } from "../utils";
import { avgPos, getDancerSide, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
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
    const centerY = avgPos(...group).y;

    const hSide = getDancerSide(dancer) === "west" ? 1 : -1;
    const vSide = must(
      safeThreshold(
        dancer.pos.y -
          must(
            getSingleton(
              group.filter(
                (d) => d.role === dancer.role && d.dir !== dancer.dir,
              ),
            ),
          ).pos.y,
        { neg: -1, pos: 1 },
      ),
    );

    const interacted = group.filter((d) => d.id !== dancer.id).map((d) => d.id);

    if (instr.full) {
      const posFuncs: Array<(frac: number) => Vector> =
        dancer.role === instr.centerRole
          ? [
              (frac) =>
                new Vector(
                  hSide * (-0.5 + frac * 1.0),
                  centerY + vSide * 0.5 * Math.cos(frac * TWO_PI),
                ),
              (frac) =>
                new Vector(
                  hSide * (0.75 - 0.5 * Math.abs(frac - 0.5)),
                  centerY + vSide * 0.5 * Math.cos(frac * PI),
                ),
              (frac) =>
                new Vector(
                  hSide * (0.5 - frac * 1.0),
                  centerY + vSide * -0.5 * Math.cos(frac * TWO_PI),
                ),
              (frac) =>
                new Vector(
                  hSide * (-0.75 + 0.5 * Math.abs(frac - 0.5)),
                  centerY - vSide * 0.5 * Math.cos(frac * PI),
                ),
            ]
          : [
              (frac) =>
                new Vector(
                  hSide * (-0.75 + 0.5 * Math.abs(frac - 0.5)),
                  centerY + vSide * 0.5 * Math.cos(frac * PI),
                ),
              (frac) =>
                new Vector(
                  hSide * (-0.5 + frac * 1.0),
                  centerY - vSide * 0.5 * Math.cos(frac * TWO_PI),
                ),
              (frac) =>
                new Vector(
                  hSide * (0.75 - 0.5 * Math.abs(frac - 0.5)),
                  centerY - vSide * 0.5 * Math.cos(frac * PI),
                ),
              (frac) =>
                new Vector(
                  hSide * (0.5 - frac * 1.0),
                  centerY + vSide * 0.5 * Math.cos(frac * TWO_PI),
                ),
            ];
      return posFuncs.map((posFunc) => ({
        dur: instr.beats / 4,
        position: posFunc,
        facing: (frac) =>
          getDir({ from: posFunc(frac), to: posFunc(frac + 0.1) }),
        hands: () => ({}),
        interactedWith: () => interacted,
      }));
    } else {
      const posFuncs: Array<(frac: number) => Vector> =
        dancer.role === instr.centerRole
          ? [
              (frac) =>
                new Vector(
                  hSide * (-0.5 + frac * 1.0),
                  centerY + vSide * 0.5 * Math.cos(frac * TWO_PI),
                ),
              (frac) =>
                new Vector(
                  hSide * (0.75 - 0.5 * Math.abs(frac - 0.5)),
                  centerY + vSide * 0.5 * Math.cos(frac * PI),
                ),
            ]
          : [
              (frac) =>
                new Vector(
                  hSide * (-0.75 + 0.5 * Math.abs(frac - 0.5)),
                  centerY + vSide * 0.5 * Math.cos(frac * PI),
                ),
              (frac) =>
                new Vector(
                  hSide * (-0.5 + frac * 1.0),
                  centerY - vSide * 0.5 * Math.cos(frac * TWO_PI),
                ),
            ];
      return posFuncs.map((posFunc) => ({
        dur: instr.beats / 2,
        position: posFunc,
        facing: (frac) =>
          getDir({ from: posFunc(frac), to: posFunc(frac + 0.1) }),
        hands: () => ({}),
        interactedWith: () => interacted,
      }));
    }
  };

  return animatePlans(init, who, basePlan);
}
