import { z } from "zod";

import { type Beats, HandSchema, type ProtoId } from "../contraCore";
import { PI, TWO_PI } from "../geometry";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import type { InstructionAnimator } from "./_segment";
import {
  allemandeSegments,
  approachBeatsForSpeedMatch,
  planAllemande,
} from "./allemande";

export const ShoulderRoundInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("shoulder_round"),
  cid: CalledIdentifierSchema,
  handedness: HandSchema,
  rotations: z.number(),
});
export type ShoulderRoundInstruction = z.infer<
  typeof ShoulderRoundInstructionSchema
>;

const APPROACH_ELLIPSE_RADIANS = PI / 2;
const ALLEMANDE_RADIUS = 0.25;

// ── Plan-based API ──────────────────────────────────────────────────────

export function planShoulderRound(
  instr: ShoulderRoundInstruction,
  dancer: Dancer,
  approachBeats: Beats,
): DancerSegment[] {
  const segments = planAllemande(
    { ...instr, type: "allemande" },
    dancer,
    approachBeats,
  );
  return segments.map(({ hands: _hands, ...rest }) => rest);
}

export function shoulderRoundAnimator(
  instr: ShoulderRoundInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numAllemandeRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  let totalDistance = 0;
  let count = 0;
  for (const id of who) {
    const dancer = Dancer.get(id, init);
    const match = dancer.resolveMatch(instr.cid);
    totalDistance += dancer.pos.subtract(match.pos).length();
    count++;
  }
  const avgDistance = totalDistance / count;

  const approachBeats = approachBeatsForSpeedMatch(
    avgDistance,
    instr.beats,
    numAllemandeRadians,
  );

  return animatePlans(init, who, (dancer) =>
    planShoulderRound(instr, dancer, approachBeats),
  );
}

// ── Legacy Segment[] API ────────────────────────────────────────────────

export const shoulderRoundSegments: InstructionAnimator<
  ShoulderRoundInstruction
> = (instr, init, who) => {
  const segments = allemandeSegments(
    { ...instr, type: "allemande" },
    init,
    who,
  );
  return segments.map(({ hands: _hands, ...rest }) => rest);
};
