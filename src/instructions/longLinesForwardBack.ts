import { Vector } from "vecti";
import { z } from "zod";

import type { ProtoId } from "../contraCore";
import { lerpFacing, roughlySameDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { lerpVectors, must } from "../utils";
import { type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
  resolveCardinalDirection,
} from "./_base";
import {
  fudgePlansToAlignY,
  fudgePlansToSpaceEvenlyInY,
  fudgeToAlignY,
  fudgeToSpaceEvenlyInY,
} from "./_fudge";
import { animatePlans, type PlanGetter } from "./_plan";
import {
  hold,
  type InstructionAnimator,
  lerpFacingTo,
  linearTo,
  type Segment,
} from "./_segment";

export const LongLinesForwardBackInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("long_lines_forward_back"),
});
export type LongLinesForwardBackInstruction = z.infer<
  typeof LongLinesForwardBackInstructionSchema
>;

export const longLinesForwardBackSegments: InstructionAnimator<
  LongLinesForwardBackInstruction
> = (instr, init, who) => {
  // Assert everybody faces across
  for (const id of who) {
    if (
      !roughlySameDir(
        init[id].facing,
        must(resolveCardinalDirection("across", init[id].pos), [
          { dancerId: id },
          "is in the middle, can't tell which way to move",
        ]),
      )
    ) {
      throw new SnazzyError([
        { dancerId: id },
        " must face across for long lines forward and back",
      ]);
    }
  }

  const halfBeats = instr.beats / 2;

  const walkForwardSegment: Segment = {
    dur: halfBeats,
    position: linearTo((dancer) => {
      const x = Math.sign(init[dancer.protoId].pos.x) * 0.2;
      return new Vector(x, dancer.pos.y);
    }),
    facing: lerpFacingTo((dancer) =>
      must(resolveCardinalDirection("across", dancer.pos), [
        { dancerId: dancer.protoId },
        "is in the middle, can't tell which way to move",
      ]),
    ),
    hands: (dancer) =>
      hold(
        [
          "left",
          must(
            dancer.resolveCalledIdentifier(personInDir("on_left", "different")),
            [{ dancerId: dancer.id }, "has nobody on the left"],
          ).id,
          "right",
        ],
        [
          "right",
          must(
            dancer.resolveCalledIdentifier(
              personInDir("on_right", "different"),
            ),
            [{ dancerId: dancer.id }, "has nobody on the right"],
          ).id,
          "left",
        ],
      ),
  };

  const segments: Segment[] = [
    ...fudgeToAlignY(
      fudgeToSpaceEvenlyInY([walkForwardSegment], init, who),
      init,
      who,
    ),
    {
      dur: halfBeats,
      position: linearTo((dancer) => {
        const x = Math.sign(dancer.pos.x) * 0.5;
        return new Vector(x, dancer.pos.y);
      }),
    },
  ];

  return segments;
};

export function longLinesForwardBackAnimator(
  instr: LongLinesForwardBackInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  // Assert everybody faces across
  for (const id of who) {
    if (
      !roughlySameDir(
        init[id].facing,
        must(resolveCardinalDirection("across", init[id].pos), [
          { dancerId: id },
          "is in the middle, can't tell which way to move",
        ]),
      )
    ) {
      throw new SnazzyError([
        { dancerId: id },
        " must face across for long lines forward and back",
      ]);
    }
  }

  const halfBeats = instr.beats / 2;

  const walkForwardPlan: PlanGetter = (dancer) => {
    const targetX = Math.sign(init[dancer.protoId].pos.x) * 0.2;
    const targetPos = new Vector(targetX, dancer.pos.y);
    const targetFacing = must(resolveCardinalDirection("across", dancer.pos), [
      { dancerId: dancer.protoId },
      "is in the middle, can't tell which way to move",
    ]);
    const leftNeighbor = must(
      dancer.resolveCalledIdentifier(personInDir("on_left", "different")),
      [{ dancerId: dancer.id }, "has nobody on the left"],
    );
    const rightNeighbor = must(
      dancer.resolveCalledIdentifier(personInDir("on_right", "different")),
      [{ dancerId: dancer.id }, "has nobody on the right"],
    );
    const handsResult = hold(
      ["left", leftNeighbor.id, "right"],
      ["right", rightNeighbor.id, "left"],
    );

    return [
      {
        dur: halfBeats,
        position: (frac: number) => lerpVectors(dancer.pos, targetPos, frac),
        facing: (frac: number) => lerpFacing(dancer.facing, targetFacing, frac),
        hands: () => handsResult,
      },
    ];
  };

  const fudgedWalkForward = fudgePlansToAlignY(
    fudgePlansToSpaceEvenlyInY(walkForwardPlan, init),
    init,
  );

  return animatePlans(init, who, (dancer) => {
    const walkForwardSegs = fudgedWalkForward(dancer);
    const lastSeg = walkForwardSegs[walkForwardSegs.length - 1];
    const postWalkPos = lastSeg.position ? lastSeg.position(1) : dancer.pos;

    return [
      ...walkForwardSegs,
      {
        dur: halfBeats,
        position: (frac: number) => {
          const finalX = Math.sign(postWalkPos.x) * 0.5;
          return lerpVectors(
            postWalkPos,
            new Vector(finalX, postWalkPos.y),
            frac,
          );
        },
      },
    ];
  });
}
