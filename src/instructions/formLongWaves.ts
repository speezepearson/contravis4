import { z } from "zod";

import {
  ALL_PROTO_IDS,
  type Hand,
  parseProtoId,
  type ProtoId,
} from "../contraCore";
import { EAST, WEST } from "../geometry";
import { must, safeThreshold } from "../utils";
import {
  Dancer,
  type DancerHandPointer,
  getDancerSide,
  type WorldState,
} from "../worldState";
import { type ContraAnimation, instructionBaseSchemaFields } from "./_base";
import { fudgePlansToAlignY, fudgePlansToSpaceEvenlyInY } from "./_fudge";
import { animatePlans, type DancerSegment } from "./_plan";

export const FormLongWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_long_waves"),
  beats: z.literal(0),
});
export type FormLongWavesInstruction = z.infer<
  typeof FormLongWavesInstructionSchema
>;

function validate(init: WorldState, who: ReadonlySet<ProtoId>): void {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`formLongWaves instruction must target all dancers`);

  // Assert one lark on each side, one robin on each side
  for (const role of ["lark", "robin"] as const) {
    const protos = ALL_PROTO_IDS.filter((id) => parseProtoId(id).role === role);
    const sides = new Set(
      protos.map((id) => getDancerSide(Dancer.get(id, init))),
    );
    if (sides.size !== 2)
      throw new Error(
        `formLongWaves requires one ${role} on each side of the set, got sides [${sides}]`,
      );
  }

  // Assert that either larks face out & robins across, or vice versa.
  const larkIds = ALL_PROTO_IDS.filter(
    (id) => parseProtoId(id).role === "lark",
  );
  const robinIds = ALL_PROTO_IDS.filter(
    (id) => parseProtoId(id).role === "robin",
  );

  const out = (id: ProtoId): boolean => Dancer.get(id, init).facesOut();

  const larksOut = larkIds.every((id) => out(id));
  const larksAcross = larkIds.every((id) => !out(id));
  const robinsOut = robinIds.every((id) => out(id));
  const robinsAcross = robinIds.every((id) => !out(id));
  if (!((larksOut && robinsAcross) || (larksAcross && robinsOut))) {
    throw new Error(
      `formLongWaves requires all larks facing the same way (across or out) and all robins the opposite`,
    );
  }
}

// ── Plan-based API ──────────────────────────────────────────────────────

export function planFormLongWaves(dancer: Dancer): DancerSegment[] {
  const facing = must(
    safeThreshold(dancer.facing.x, { neg: WEST, pos: EAST }),
    [{ dancerId: dancer.id }, " isn't sure whether to face in or out"],
  );

  const out = dancer.facesOut();

  const left = must(
    dancer.resolveCalledIdentifier({
      type: "PersonInDirection",
      dir: out ? "setcounterclockwise" : "setclockwise",
      onlyRole: "different",
    }),
    [{ dancerId: dancer.id }, "has nobody on the left"],
  );
  const right = must(
    dancer.resolveCalledIdentifier({
      type: "PersonInDirection",
      dir: out ? "setclockwise" : "setcounterclockwise",
      onlyRole: "different",
    }),
    [{ dancerId: dancer.id }, "has nobody on the right"],
  );

  const hands: Partial<Record<Hand, DancerHandPointer>> = {
    left: { theirId: left.id, theirHand: "left" },
    right: { theirId: right.id, theirHand: "right" },
  };

  return [
    {
      dur: 0,
      facing: () => facing,
      hands: () => hands,
    },
  ];
}

export function formLongWavesAnimator(
  _instr: FormLongWavesInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  validate(init, who);
  return animatePlans(
    init,
    who,
    fudgePlansToSpaceEvenlyInY(
      fudgePlansToAlignY((dancer) => planFormLongWaves(dancer), init),
      init,
    ),
  );
}
