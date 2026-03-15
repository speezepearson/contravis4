import { z } from "zod";

import {
  type DancerId,
  getRole,
  type Hand,
  otherHand,
  type ProtoId,
  RoleSchema,
} from "../contraCore";
import {
  ccwRadsBetween,
  ellipsePosition,
  getDir,
  lerpFacing,
  PI,
  TWO_PI,
} from "../geometry";
import { IrreducibleLabelSchema } from "../labels";
import { SnazzyError } from "../snazzyError";
import type { AssertExtends } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type CalledIdentifier,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const RolleeSpecSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PersonInDirection"),
    dir: z.enum(["on_right", "on_left"]),
    onlyRole: z.enum(["same", "different"]),
  }),
  z.object({ type: z.literal("label"), label: IrreducibleLabelSchema }),
]);
export type RolleeSpec = z.infer<typeof RolleeSpecSchema>;
null satisfies AssertExtends<RolleeSpec, CalledIdentifier>;

export const RollAwayInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("roll_away"),
  roller: RoleSchema,
  rollee: RolleeSpecSchema,
});
export type RollAwayInstruction = z.infer<typeof RollAwayInstructionSchema>;

function validateRollAway(
  instr: RollAwayInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): { isRtl: boolean } {
  const rolleesSeen = new Set<DancerId>();
  const rollerSides = new Set<number>();

  for (const id of who) {
    if (getRole(id) !== instr.roller) continue;
    const roller = Dancer.get(id, init);
    const rollee = roller.resolveMatch(instr.rollee);
    if (rolleesSeen.has(rollee.id)) {
      throw new SnazzyError([
        "multiple rollers grabbed the same rollee ",
        { dancerId: rollee.id },
      ]);
    }
    rolleesSeen.add(rollee.id);
    rollerSides.add(
      Math.sign(
        ccwRadsBetween(
          roller.facing,
          getDir({ from: roller.pos, to: rollee.pos }),
        ),
      ),
    );
  }
  if (rollerSides.size !== 1) throw new Error(`rollers have different sides`);

  return { isRtl: rollerSides.has(-1) };
}

function planRollAway(
  instr: RollAwayInstruction,
  dancer: Dancer,
  isRtl: boolean,
): DancerSegment[] {
  const them = dancer.resolveMatch(instr.rollee);
  const themId = them.id;
  const startPos = dancer.pos;
  const themPos = them.pos;
  const startFacing = dancer.facing;
  const isRoller = getRole(dancer.protoId) === instr.roller;

  const semiMinor = isRtl ? -0.25 : 0.25;

  // Hands: first half roller holds [rtl: right, ltr: left]
  const firstRollerHand: Hand = isRtl ? "right" : "left";
  const firstRolleeHand: Hand = otherHand(firstRollerHand);

  // Rollee's facing rotates a full 360 [ccw if rtl, cw if ltr]
  const rolleeRotation = isRtl ? TWO_PI : -TWO_PI;

  // Pre-compute facing for roller (lerp) and rollee (rotate)
  const facingFn: (frac: number) => import("vecti").Vector = (() => {
    const normal = getDir({
      from: startPos,
      to: themPos,
    }).rotateByDegrees(90 * (isRoller === isRtl ? 1 : -1));
    if (isRoller) {
      return (frac: number) => lerpFacing(startFacing, normal, frac);
    }
    const totalRads = ccwRadsBetween(startFacing, normal) + rolleeRotation;
    return (frac: number) => startFacing.rotateByRadians(totalRads * frac);
  })();

  return [
    {
      dur: instr.beats,
      position: (frac) =>
        ellipsePosition(startPos, themPos, semiMinor, PI * frac),
      facing: facingFn,
      hands: (frac) => {
        const firstHalf = frac < 0.5;
        const myHand: Hand = isRoller
          ? firstHalf
            ? firstRollerHand
            : otherHand(firstRollerHand)
          : firstHalf
            ? firstRolleeHand
            : otherHand(firstRolleeHand);
        const theirHand: Hand = isRoller
          ? firstHalf
            ? firstRolleeHand
            : otherHand(firstRolleeHand)
          : firstHalf
            ? firstRollerHand
            : otherHand(firstRollerHand);

        return {
          [myHand]: { theirId: themId, theirHand: theirHand },
        };
      },
      interactedWith: () => [themId],
    },
  ];
}

export function rollAwayAnimator(
  instr: RollAwayInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const { isRtl } = validateRollAway(instr, init, who);
  return animatePlans(init, who, (dancer) =>
    planRollAway(instr, dancer, isRtl),
  );
}
