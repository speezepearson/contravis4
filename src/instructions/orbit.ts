import { Vector } from "vecti";
import { z } from "zod";

import {
  type Beats,
  getRole,
  HandSchema,
  type ProtoId,
  RoleSchema,
} from "../contraCore";
import {
  getGroupOfFour,
  preferCloser,
  preferOneInFront,
  preferRecent,
} from "../formations";
import {
  ellipsePosition,
  getDir,
  lerpFacing,
  PI,
  revolve,
  TWO_PI,
} from "../geometry";
import { must } from "../utils";
import { avgPos, Dancer, type WorldState } from "../worldState";
import { type ContraAnimation, instructionBaseSchemaFields } from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { hold } from "./_segment";
import { approachBeatsForSpeedMatch } from "./allemande";

export const MiddleMoveSchema = z.enum(["allemande", "shoulder_round"]);

export const OrbitInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("orbit"),
  roleInMiddle: RoleSchema,
  middleMove: MiddleMoveSchema,
  handedness: HandSchema,
});
export type OrbitInstruction = z.infer<typeof OrbitInstructionSchema>;

const MIDDLE_ROTATIONS = 1.5;
const ALLEMANDE_RADIUS = 0.25;
const APPROACH_ELLIPSE_RADIANS = PI / 2;

function planMiddle(
  instr: OrbitInstruction,
  dancer: Dancer,
  middlePartner: Dancer,
  approachBeats: Beats,
  allInGroup: Dancer[],
): DancerSegment[] {
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numRadians =
    (TWO_PI * MIDDLE_ROTATIONS - APPROACH_ELLIPSE_RADIANS) * rotationSign;
  const circlingBeats = instr.beats - approachBeats;

  const startPos = dancer.pos;
  const matchPos = middlePartner.pos;
  const startFacing = dancer.facing;
  const center = avgPos(dancer, middlePartner);
  const distance = startPos.subtract(matchPos).length();

  const targetFacing = getDir({ from: startPos, to: matchPos });

  const postApproachPos = ellipsePosition(
    startPos,
    matchPos,
    -ALLEMANDE_RADIUS * rotationSign,
    APPROACH_ELLIPSE_RADIANS,
  );
  const postApproachFacing = lerpFacing(startFacing, targetFacing, 1);

  const isAllemande = instr.middleMove === "allemande";

  return [
    {
      dur: approachBeats,
      position: (frac) =>
        ellipsePosition(
          startPos,
          matchPos,
          -ALLEMANDE_RADIUS * rotationSign,
          APPROACH_ELLIPSE_RADIANS * frac,
        ),
      facing: (frac) => lerpFacing(startFacing, targetFacing, frac),
      ...(isAllemande && distance < 1.2
        ? {
            hands: () =>
              hold([instr.handedness, middlePartner.id, instr.handedness]),
          }
        : {}),
    },
    {
      dur: circlingBeats,
      position: (frac) =>
        revolve(postApproachPos, {
          around: center,
          radians: numRadians * frac,
        }),
      facing: (frac) => postApproachFacing.rotateByRadians(numRadians * frac),
      ...(isAllemande
        ? {
            hands: () =>
              hold([instr.handedness, middlePartner.id, instr.handedness]),
          }
        : {}),
      interactedWith: () => allInGroup.map((d) => d.id),
    },
  ];
}

function planOrbiter(
  instr: OrbitInstruction,
  dancer: Dancer,
  groupCenter: Vector,
  allInGroup: Dancer[],
): DancerSegment[] {
  // CW if handedness=left, CCW if handedness=right
  const orbitRadians = (instr.handedness === "left" ? -1 : 1) * PI;

  const startPos = dancer.pos;
  const initFacingAngle = Math.atan2(dancer.facing.y, dancer.facing.x);

  return [
    {
      dur: instr.beats,
      position: (frac) =>
        revolve(startPos, {
          around: groupCenter,
          radians: orbitRadians * frac,
        }),
      facing: (frac) => {
        const angle = initFacingAngle + orbitRadians * frac;
        return new Vector(Math.cos(angle), Math.sin(angle));
      },
      hands: () => ({ left: undefined, right: undefined }),
      interactedWith: () => allInGroup.map((d) => d.id),
    },
  ];
}

export function orbitAnimator(
  instr: OrbitInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const tiebreakers = [preferOneInFront, preferCloser, preferRecent] satisfies [
    typeof preferOneInFront,
    ...unknown[],
  ];

  // Pre-compute approach beats for the middle pair using average distance
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numAllemandeRadians =
    (TWO_PI * MIDDLE_ROTATIONS - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  let totalMiddleDistance = 0;
  let middleCount = 0;
  for (const id of who) {
    if (getRole(id) === instr.roleInMiddle) {
      const dancer = Dancer.get(id, init);
      const group = getGroupOfFour(dancer, { by: tiebreakers });
      const middlePartner = must(
        group.find(
          (d) =>
            d.id !== dancer.id && getRole(d.protoId) === instr.roleInMiddle,
        ),
      );
      totalMiddleDistance += dancer.pos.subtract(middlePartner.pos).length();
      middleCount++;
    }
  }
  const avgMiddleDistance =
    middleCount > 0 ? totalMiddleDistance / middleCount : 1;

  const approachBeats = approachBeatsForSpeedMatch(
    avgMiddleDistance,
    instr.beats,
    numAllemandeRadians,
  );

  return animatePlans(init, who, (dancer) => {
    const group = getGroupOfFour(dancer, { by: tiebreakers });
    const groupCenter = avgPos(...group);
    const isMiddle = getRole(dancer.protoId) === instr.roleInMiddle;

    if (isMiddle) {
      const middlePartner = must(
        group.find(
          (d) =>
            d.id !== dancer.id && getRole(d.protoId) === instr.roleInMiddle,
        ),
      );
      return planMiddle(instr, dancer, middlePartner, approachBeats, [
        ...group,
      ]);
    } else {
      return planOrbiter(instr, dancer, groupCenter, [...group]);
    }
  });
}
