import { Vector } from "vecti";
import { z } from "zod";

import { type Beats, type ProtoId } from "../contraCore";
import { EAST, NORTH, SOUTH, WEST } from "../geometry";
import { buildProtoRecord, Dancer, type WorldState, WorldStateSchema } from "../worldState";
import { AtomicInstructionSchema } from "./_atomic";
import { getSplitDuration, SplitSchema } from "./split";

export { type InstructionId, InstructionIdSchema } from "./_base";

export const InstructionSchema = z.discriminatedUnion("type", [
  AtomicInstructionSchema,
  SplitSchema,
]);
export type Instruction = z.infer<typeof InstructionSchema>;

export function instructionDuration(instr: Instruction): Beats {
  switch (instr.type) {
    case "split":
      return getSplitDuration(instr);
    default:
      return instr.beats;
  }
}

export function danceLength(instructions: Instruction[]): Beats {
  return Math.max(
    4,
    instructions.reduce((s, i) => s + instructionDuration(i), 0),
  );
}

export const InitFormationNameSchema = z.enum(["improper", "beckett", "proper"]);
export type InitFormationName = z.infer<typeof InitFormationNameSchema>;

export const InitFormationSchema = z.union([
  InitFormationNameSchema,
  WorldStateSchema,
]);
export type InitFormation = z.infer<typeof InitFormationSchema>;

export function resolveInitFormation(initFormation: InitFormation): WorldState {
  if (typeof initFormation === "string") {
    return initFormationStates[initFormation];
  }
  return initFormation;
}

const protoCores: Record<ProtoId, Omit<ConstructorParameters<typeof Dancer>[1], 'pos'|'facing'>> = {
  up_lark_0: {
    hands: {},
    labels: {
      partner: "up_robin_0",
      neighbor: "down_robin_0",
    },
    recents: ["up_robin_0", "down_robin_0"],
  },
  up_robin_0: {
    hands: {},
    labels: {
      partner: "up_lark_0",
      neighbor: "down_lark_0",
    },
    recents: ["up_lark_0", "down_lark_0"],
  },
  down_lark_0: {
    hands: {},
    labels: {
      partner: "down_robin_0",
      neighbor: "up_robin_0",
    },
    recents: ["down_robin_0", "up_robin_0"],
  },
  down_robin_0: {
    hands: {},
    labels: {
      partner: "down_lark_0",
      neighbor: "up_lark_0",
    },
    recents: ["down_lark_0", "up_lark_0"],
  },
};
const initFormationPosFacings: Record<InitFormationName, Record<ProtoId, {pos: Vector, facing: Vector}>> = {
  improper: {
    up_lark_0: {pos: new Vector(-0.5, -0.5), facing: NORTH},
    up_robin_0: {pos: new Vector(0.5, -0.5), facing: NORTH},
    down_lark_0: {pos: new Vector(0.5, 0.5), facing: SOUTH},
    down_robin_0: {pos: new Vector(-0.5, 0.5), facing: SOUTH},
  },
  beckett: {
    up_lark_0: {pos: new Vector(-0.5, 0.5), facing: EAST},
    up_robin_0: {pos: new Vector(-0.5, -0.5), facing: EAST},
    down_lark_0: {pos: new Vector(0.5, -0.5), facing: WEST},
    down_robin_0: {pos: new Vector(0.5, 0.5), facing: WEST},
  },
  proper: {
    up_lark_0: {pos: new Vector(-0.5, -0.5), facing: NORTH},
    up_robin_0: {pos: new Vector(0.5, -0.5), facing: NORTH},
    down_lark_0: {pos: new Vector(0.5, 0.5), facing: SOUTH},
    down_robin_0: {pos: new Vector(-0.5, 0.5), facing: SOUTH},
  },
}

export const initFormationStates: Record<InitFormationName, WorldState> = {
  improper: buildInitFormation("improper"),
  beckett: buildInitFormation("beckett"),
  proper: buildInitFormation("proper"),
}
function buildInitFormation(initFormationName: InitFormationName): WorldState {
  return buildProtoRecord(id => new Dancer(id, {
    ...protoCores[id],
    pos: initFormationPosFacings[initFormationName][id].pos,
    facing: initFormationPosFacings[initFormationName][id].facing,
  }));
}

export const DanceSchema = z.object({
  name: z.string().optional(),
  author: z.string().optional(),
  initFormation: InitFormationSchema,
  instructions: z.array(InstructionSchema),
});
export type Dance = z.infer<typeof DanceSchema>;
