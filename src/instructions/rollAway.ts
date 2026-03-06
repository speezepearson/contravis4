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
import { buildProtoRecord, Dancer } from "../worldState";
import {
  type CalledIdentifier,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { hold, type InstructionAnimator } from "./_segment";

export const RolleeSpecSchema = z.enum([
  "person_on_right",
  "person_on_left",
  ...IrreducibleLabelSchema.options,
]);
export type RolleeSpec = z.infer<typeof RolleeSpecSchema>;
undefined as unknown as RolleeSpec satisfies CalledIdentifier; // type assertion

export const RollAwayInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("roll_away"),
  roller: RoleSchema,
  rollee: RolleeSpecSchema,
});
export type RollAwayInstruction = z.infer<typeof RollAwayInstructionSchema>;

export const rollAwaySegments: InstructionAnimator<RollAwayInstruction> = (
  instr,
  init,
  who,
) => {
  // Assert & pre-compute match map: each dancer must have an opposite-role
  // match in the expected direction, and no two rollers may share a rollee.
  const rollerToRollee = new Map<ProtoId, DancerId>();
  const rolleeToRoller = new Map<DancerId, ProtoId>();
  for (const id of who) {
    if (getRole(id) !== instr.roller) continue;
    const rolleeId = resolveCalledIdentifier(id, instr.rollee, init, {
      roles: "different",
    });
    if (!rolleeId) {
      throw new Error(
        `${id} has no opposite-role ${instr.rollee} to roll away`,
      );
    }
    rollerToRollee.set(id, rolleeId);
    if (rolleeToRoller.has(rolleeId)) {
      throw new Error(
        `rollers ${rolleeToRoller.get(rolleeId)} and ${id} both grabbed the same rollee ${rolleeId}`,
      );
    }
    rolleeToRoller.set(rolleeId, id);
  }

  const matches = buildProtoRecord((id) => {
    const res =
      getRole(id) === instr.roller
        ? rollerToRollee.get(id)
        : rolleeToRoller.get(id);
    if (!res) throw new Error(`dancer ${id} has no match`);
    return res;
  });

  const rollerSides = new Set(
    [...rollerToRollee].map(([rollerId, rolleeId]) => {
      const roller = Dancer.get(rollerId, init);
      const rollee = Dancer.get(rolleeId, init);
      return Math.sign(
        ccwRadsBetween(
          roller.facing,
          getDir({ from: roller.pos, to: rollee.pos }),
        ),
      );
    }),
  );
  if (rollerSides.size !== 1) throw new Error(`rollers have different sides`);

  const isRtl = rollerSides.has(-1);

  const semiMinor = isRtl ? -0.25 : 0.25;

  // Hands: first half roller holds [rtl: right, ltr: left]
  const firstRollerHand: Hand = isRtl ? "right" : "left";
  const firstRolleeHand: Hand = otherHand(firstRollerHand);

  // Rollee's facing rotates a full 360° [ccw if rtl, cw if ltr]
  const rolleeRotation = isRtl ? TWO_PI : -TWO_PI;

  return [
    {
      dur: instr.beats,
      position: (id, frac, segInit) => {
        const themId = matches[id];
        const start = segInit[id].pos;
        const end = Dancer.get(themId, segInit).pos;
        return ellipsePosition(start, end, semiMinor, PI * frac);
      },
      facing: (id, frac, segInit) => {
        const isRoller = getRole(id) === instr.roller;
        const normal = getDir({
          from: segInit[id].pos,
          to: Dancer.get(matches[id], segInit).pos,
        }).rotateByDegrees(90 * (isRoller === isRtl ? 1 : -1));
        if (isRoller) return lerpFacing(segInit[id].facing, normal, frac);
        const totalRads =
          ccwRadsBetween(segInit[id].facing, normal) + rolleeRotation;
        return segInit[id].facing.rotateByRadians(totalRads * frac);
      },
      hands: (id, frac) => {
        const isRoller = getRole(id) === instr.roller;
        const themId = matches[id];

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

        return hold([myHand, themId, theirHand]);
      },
      interactedWith: (id) => [matches[id]],
    },
  ];
};
