import type { Role } from "../contraCore";
import {
  type CardinalDirection,
  InstructionIdSchema,
} from "../instructions/_base";
import {
  type Instruction,
  type InstructionId,
  InstructionSchema,
} from "../instructions/index";
import { assertNever } from "../utils";
import type { ActionOptionType } from "./CommandPane";

/** Props for inline field components. */
export interface SubFormProps {
  onChange: (instr: Instruction) => void;
  onInvalid?: () => void;
}

/** Create a default instruction for a given type. */
export function makeDefaultInstruction(
  type: ActionOptionType,
  id: InstructionId,
): Instruction {
  switch (type) {
    case "take_hands":
      return InstructionSchema.parse({
        id,
        type: "take_hands",
        beats: 0,
        cid: "neighbor",
        hand: "right",
      } satisfies Instruction);
    case "drop_hands":
      return InstructionSchema.parse({
        id,
        type: "drop_hands",
        beats: 0,
        which: "both",
      } satisfies Instruction);
    case "allemande":
      return InstructionSchema.parse({
        id,
        type: "allemande",
        beats: 8,
        cid: "neighbor",
        handedness: "right",
        rotations: 1,
      } satisfies Instruction);
    case "balance":
      return InstructionSchema.parse({
        id,
        type: "balance",
        beats: 4,
        cid: "neighbor",
      } satisfies Instruction);
    case "swing":
      return InstructionSchema.parse({
        id,
        type: "swing",
        beats: 16,
        cid: "neighbor",
        endFacing: "across",
      } satisfies Instruction);
    case "box_the_gnat":
      return InstructionSchema.parse({
        id,
        type: "box_the_gnat",
        beats: 4,
        cid: "neighbor",
      } satisfies Instruction);
    case "california_twirl":
      return InstructionSchema.parse({
        id,
        type: "california_twirl",
        beats: 4,
        cid: "partner",
      } satisfies Instruction);
    case "form_short_waves":
      return InstructionSchema.parse({
        id,
        type: "form_short_waves",
        beats: 0,
      } satisfies Instruction);
    case "do_si_do":
      return InstructionSchema.parse({
        id,
        type: "do_si_do",
        beats: 8,
        cid: "neighbor",
        rotations: 1,
      } satisfies Instruction);
    case "pass_by":
      return InstructionSchema.parse({
        id,
        type: "pass_by",
        beats: 2,
        cid: "neighbor",
        hand: "right",
      } satisfies Instruction);
    case "pull_by":
      return InstructionSchema.parse({
        id,
        type: "pull_by",
        beats: 2,
        cid: "neighbor",
        hand: "right",
      } satisfies Instruction);
    case "step":
      return InstructionSchema.parse({
        id,
        type: "step",
        beats: 0,
        direction: "in_front",
        distance: 0,
        facing: "across",
        facingOffset: 0,
      } satisfies Instruction);
    case "give_and_take_into_swing":
      return InstructionSchema.parse({
        id,
        type: "give_and_take_into_swing",
        beats: 16,
        cid: "neighbor",
        drawerRole: "lark",
        endFacing: "across",
      } satisfies Instruction);
    case "split":
      return InstructionSchema.parse({
        id,
        type: "split",
        by: "role",
        larks: [],
        robins: [],
      } satisfies Instruction);
    case "relabel":
      return InstructionSchema.parse({
        id,
        type: "relabel",
        beats: 0,
        label: "neighbor",
        cid: "in_front",
      } satisfies Instruction);
    case "roll_away":
      return InstructionSchema.parse({
        id,
        type: "roll_away",
        roller: "lark",
        rollee: "on_right",
      });
    default:
      assertNever(type);
  }
}

export function makeInstructionId(): InstructionId {
  return InstructionIdSchema.parse(crypto.randomUUID());
}

export function cardinalDirectionToText(dir: CardinalDirection): string {
  return dir;
}

export const DIR_OPTIONS = [
  "up",
  "down",
  "across",
  "out",
  "progression",
  "forward",
  "back",
  "right",
  "left",
  "partner",
  "neighbor",
  "opposite",
];

export function encodeRelationship(rel: {
  base: string;
  offset: number;
}): string {
  return `${rel.base}:${rel.offset}`;
}

export function decodeRelationship(encoded: string): {
  base: string;
  offset: number;
} {
  const i = encoded.lastIndexOf(":");
  return { base: encoded.slice(0, i), offset: parseInt(encoded.slice(i + 1)) };
}

export const DROP_WHICH_OPTIONS: string[] = [
  "both",
  "left",
  "right",
  "partner",
  "shadow",
  "neighbor",
];
export const DROP_WHICH_LABELS: Record<string, string> = {
  both: "both hands",
  left: "left hand",
  right: "right hand",
  partner: "partner hands",
  shadow: "shadow hands",
  neighbor: "neighbor hands",
};

export const HAND_OPTIONS = ["right", "left"];
export const TAKE_HAND_OPTIONS = ["right", "left", "inside"];

export const ROLE_OPTIONS: Role[] = ["lark", "robin"];

export const SPLIT_BY_OPTIONS = ["role", "direction"];
export const SPLIT_BY_LABELS: Record<string, string> = {
  role: "role (larks / robins)",
  direction: "direction (ups / downs)",
};
