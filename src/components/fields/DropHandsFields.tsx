import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { DropHandsInstructionSchema } from "../../instructions/dropHands";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { DROP_WHICH_LABELS, DROP_WHICH_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function DropHandsFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "drop_hands" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof DropHandsInstructionSchema>>,
  ) {
    const result = typedSafeParse(DropHandsInstructionSchema, {
      id,
      beats: 0,
      type: "drop_hands",
      which: instruction.which,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={DROP_WHICH_OPTIONS}
        value={instruction.which}
        onChange={(v) =>
          tryCommit({
            which: DropHandsInstructionSchema.shape.which.parse(v),
          })
        }
        getLabel={(v) => DROP_WHICH_LABELS[v] ?? v}
      />
    </>
  );
}
