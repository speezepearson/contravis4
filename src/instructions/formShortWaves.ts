import { produce } from "immer";
import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, getRole, type ProtoId } from "../contraCore";
import { resolveShortLine } from "../formations";
import { NORTH, SOUTH } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { indexOf, must, safeThreshold } from "../utils";
import { connectHands, Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  pureDir,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator, makeImmediateSegment } from "./_segment";

export const FormShortWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_short_waves"),
  beats: z.literal(0),
});
export type FormShortWavesInstruction = z.infer<
  typeof FormShortWavesInstructionSchema
>;

const SHORT_WAVES_XS = [-0.75, -0.25, 0.25, 0.75] as const;

function validateAndComputeFinalState(
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): WorldState {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`formShortWaves instruction must target all dancers`);

  for (const id of ALL_PROTO_IDS) {
    const line = resolveShortLine(Dancer.get(id, init));
    if (getRole(line[1].id) !== getRole(line[2].id)) {
      throw new Error(`dancers in middle of short waves do not have same role`);
    }
    for (let i = 0; i < 3; i++) {
      const isUp = must(
        safeThreshold(line[i].facing.y, {
          neg: "down",
          pos: "up",
        } as const),
        [{ dancerId: line[i].id }, " is not facing up or down"],
      );
      const nextIsUp = must(
        safeThreshold(line[i + 1].facing.y, {
          neg: "down",
          pos: "up",
        } as const),
        [{ dancerId: line[i + 1].id }, " is not facing up or down"],
      );
      if (isUp === nextIsUp) {
        throw new SnazzyError([
          "short waves should have dancers alternating facing up/down, but ",
          { dancerId: line[i].id },
          " and ",
          { dancerId: line[i + 1].id },
          " are both facing ",
          isUp ? "up" : "down",
        ]);
      }
    }
  }

  return produce(init, (draft) => {
    // First pass: set positions and facings
    for (const id of ALL_PROTO_IDS) {
      const line = resolveShortLine(Dancer.get(id, init));
      const i = must(
        indexOf(
          line.map((d) => d.protoId),
          id,
        ),
      );
      draft[id].facing = init[id].facing.y > 0 ? NORTH : SOUTH;
      draft[id].pos = new Vector(SHORT_WAVES_XS[i], init[id].pos.y).add(
        draft[id].facing.multiply(-0.1),
      );
    }
    // Second pass: connect hands (depends on updated positions/facings)
    for (const id of ALL_PROTO_IDS) {
      const onLeft = Dancer.get(id, draft).findDancerInCalledDirection(
        pureDir("on_left"),
      );
      const onRight = Dancer.get(id, draft).findDancerInCalledDirection(
        pureDir("on_right"),
      );
      if (onLeft) connectHands(draft, id, "left", onLeft.id, "left");
      if (onRight) connectHands(draft, id, "right", onRight.id, "right");
    }
  });
}

// ── Plan-based API ──────────────────────────────────────────────────────

export function planFormShortWaves(
  dancer: Dancer,
  finalState: WorldState,
): DancerSegment[] {
  const final = finalState[dancer.protoId];
  return [
    {
      dur: 0,
      position: () => final.pos,
      facing: () => final.facing,
      hands: () => final.hands,
    },
  ];
}

export function formShortWavesAnimator(
  _instr: FormShortWavesInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const finalState = validateAndComputeFinalState(init, who);
  return animatePlans(init, who, (dancer) =>
    planFormShortWaves(dancer, finalState),
  );
}

// ── Legacy Segment[] API ────────────────────────────────────────────────

export const formShortWavesSegments: InstructionAnimator<
  FormShortWavesInstruction
> = (_instr, init, who) => {
  const finalState = validateAndComputeFinalState(init, who);
  return [
    makeImmediateSegment(init, (id, draft) => {
      draft[id].facing = finalState[id].facing;
      draft[id].pos = finalState[id].pos;
      draft[id].hands = finalState[id].hands;
    }),
  ];
};
