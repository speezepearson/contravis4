import type z from "zod";

import { RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { LongLineInCenterInstructionSchema } from "../../instructions/longLineInCenter";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { ROLE_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function LongLineInCenterFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "long_line_in_center" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof LongLineInCenterInstructionSchema>>,
  ) {
    const result = typedSafeParse(LongLineInCenterInstructionSchema, {
      id,
      type: "long_line_in_center",
      beats: instruction.beats,
      role: instruction.role,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {": "}
      <InlineDropdown
        options={ROLE_OPTIONS}
        value={instruction.role}
        onChange={(v) => tryCommit({ role: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />
      {" to center"}
    </>
  );
}
