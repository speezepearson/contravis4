import type z from "zod";

import { HandSchema, otherRole, RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import {
  MiddleMoveSchema,
  OrbitInstructionSchema,
} from "../../instructions/orbit";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS, ROLE_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

const MIDDLE_MOVE_OPTIONS = MiddleMoveSchema.options;
const MIDDLE_MOVE_LABELS: Record<string, string> = {
  allemande: "allemande",
  shoulder_round: "shoulder round",
};

export function OrbitFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "orbit" }>;
}) {
  function tryCommit(
    overrides: Partial<z.input<typeof OrbitInstructionSchema>>,
  ) {
    const result = typedSafeParse(OrbitInstructionSchema, {
      type: "orbit",
      beats: instruction.beats,
      roleInMiddle: instruction.roleInMiddle,
      middleMove: instruction.middleMove,
      handedness: instruction.handedness,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={ROLE_OPTIONS}
        value={instruction.roleInMiddle}
        onChange={(v) => tryCommit({ roleInMiddle: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />{" "}
      <InlineDropdown
        options={[...MIDDLE_MOVE_OPTIONS]}
        value={instruction.middleMove}
        onChange={(v) => tryCommit({ middleMove: MiddleMoveSchema.parse(v) })}
        getLabel={(v) => MIDDLE_MOVE_LABELS[v] ?? v}
      />{" "}
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.handedness}
        onChange={(v) => tryCommit({ handedness: HandSchema.parse(v) })}
      />
      {" in the middle while "}
      {otherRole(instruction.roleInMiddle) + "s"}
      {" orbit"}
    </>
  );
}
