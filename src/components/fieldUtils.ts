import type {
  BaseRelationship,
  FoilBaseRelationship,
  Role,
} from "../contraCore";
import {
  type CardinalDirection,
  InstructionIdSchema,
} from "../instructions/_base";
import {
  type Instruction,
  type InstructionId,
  InstructionSchema,
  type RelativeDirection,
  RelativeDirectionSchema,
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
        relationship: { base: "neighbor", offset: 0 },
        hand: "right",
      });
    case "drop_hands":
      return InstructionSchema.parse({
        id,
        type: "drop_hands",
        beats: 0,
        which: "both",
      });
    case "allemande":
      return InstructionSchema.parse({
        id,
        type: "allemande",
        beats: 8,
        relationship: { base: "neighbor", offset: 0 },
        handedness: "right",
        rotations: 1,
      });
    case "balance":
      return InstructionSchema.parse({
        id,
        type: "balance",
        beats: 4,
        relationship: { base: "neighbor", offset: 0 },
      });
    case "swing":
      return InstructionSchema.parse({
        id,
        type: "swing",
        beats: 8,
        relationship: { base: "neighbor", offset: 0 },
        endFacing: { kind: "direction", value: "across" },
      });
    case "box_the_gnat":
      return InstructionSchema.parse({
        id,
        type: "box_the_gnat",
        beats: 4,
        relationship: { base: "neighbor", offset: 0 },
      });
    case "california_twirl":
      return InstructionSchema.parse({
        id,
        type: "california_twirl",
        beats: 4,
        relationship: { base: "partner", offset: 0 },
      });
    case "form_short_waves":
      return InstructionSchema.parse({
        id,
        type: "form_short_waves",
        beats: 0,
      });
    case "do_si_do":
      return InstructionSchema.parse({
        id,
        type: "do_si_do",
        beats: 8,
        relationship: { base: "neighbor", offset: 0 },
        rotations: 1,
      });
    case "pass_by":
      return InstructionSchema.parse({
        id,
        type: "pass_by",
        beats: 2,
        relationship: { base: "neighbor", offset: 0 },
        hand: "right",
      });
    case "pull_by":
      return InstructionSchema.parse({
        id,
        type: "pull_by",
        beats: 2,
        relationship: { base: "neighbor", offset: 0 },
        hand: "right",
      });
    case "step":
      return InstructionSchema.parse({
        id,
        type: "step",
        beats: 0,
        direction: { kind: "direction", value: "forward" },
        distance: 0,
        facing: { kind: "direction", value: "forward" },
        facingOffset: 0,
      });
    case "give_and_take_into_swing":
      return InstructionSchema.parse({
        id,
        type: "give_and_take_into_swing",
        beats: 16,
        relationship: { base: "neighbor", offset: 0 },
        drawerRole: "lark",
        endFacing: { kind: "direction", value: "across" },
      });
    case "split":
      return InstructionSchema.parse({
        id,
        type: "split",
        by: "role",
        larks: [],
        robins: [],
      });
    default:
      assertNever(type);
  }
}

export function makeInstructionId(): InstructionId {
  return InstructionIdSchema.parse(crypto.randomUUID());
}

export function parseDirection(text: string): RelativeDirection | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;
  const asDir = RelativeDirectionSchema.safeParse({
    kind: "direction",
    value: trimmed,
  });
  if (asDir.success) return asDir.data;
  const asRel = RelativeDirectionSchema.safeParse({
    kind: "relationship",
    value: { base: trimmed, offset: 0 },
  });
  if (asRel.success) return asRel.data;
  return null;
}

export function directionToText(dir: RelativeDirection): string {
  if (dir.kind === "direction") return dir.value;
  return dir.value.base;
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

export const RELATIONSHIP_OPTIONS: BaseRelationship[] = [
  "partner",
  "neighbor",
  "opposite",
];
export const FOIL_RELATIONSHIP_OPTIONS: FoilBaseRelationship[] = [
  "partner",
  "neighbor",
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

export function relationshipLabel(rel: {
  base: string;
  offset: number;
}): string {
  if (rel.base === "partner" && rel.offset === 0) return "partner";
  if (rel.base === "partner")
    return `shadow ${rel.offset > 0 ? "+" : ""}${rel.offset}`;
  if (rel.offset === 0) return rel.base;
  if (rel.offset === 1) return `next ${rel.base}`;
  if (rel.offset === -1) return `prev ${rel.base}`;
  return rel.offset > 0
    ? `next x${rel.offset} ${rel.base}`
    : `prev x${Math.abs(rel.offset)} ${rel.base}`;
}

export function relationshipOptionLabel(encoded: string): string {
  return relationshipLabel(decodeRelationship(encoded));
}

function buildRelationshipOptions(bases: string[]): string[] {
  const options: string[] = [];
  for (const base of bases) {
    options.push(`${base}:0`);
    if (base !== "partner") {
      for (let i = 1; i <= 4; i++) {
        options.push(`${base}:${i}`, `${base}:${-i}`);
      }
    }
  }
  for (let i = 1; i <= 4; i++) {
    options.push(`partner:${i}`, `partner:${-i}`);
  }
  return options;
}

export const FULL_RELATIONSHIP_OPTIONS = buildRelationshipOptions([
  "partner",
  "neighbor",
  "opposite",
]);
export const FULL_FOIL_RELATIONSHIP_OPTIONS = buildRelationshipOptions([
  "partner",
  "neighbor",
]);

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
