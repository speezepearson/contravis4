import type z from "zod";

import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { SliceInstructionSchema } from "../../instructions/slice";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function SliceFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "slice" }>;
}) {
  function tryCommit(
    overrides: Partial<z.input<typeof SliceInstructionSchema>>,
  ) {
    const result = typedSafeParse(SliceInstructionSchema, {
      type: "slice",
      beats: instruction.beats,
      direction: instruction.direction,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <InlineDropdown
      options={HAND_OPTIONS}
      value={instruction.direction}
      onChange={(v) => tryCommit({ direction: HandSchema.parse(v) })}
      getLabel={(v) => v}
    />
  );
}
