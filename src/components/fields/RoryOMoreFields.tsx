import type z from "zod";

import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { RoryOMoreInstructionSchema } from "../../instructions/roryOMore";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function RoryOMoreFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "rory_o_more" }>;
}) {
  function tryCommit(
    overrides: Partial<z.input<typeof RoryOMoreInstructionSchema>>,
  ) {
    const result = typedSafeParse(RoryOMoreInstructionSchema, {
      type: "rory_o_more",
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
