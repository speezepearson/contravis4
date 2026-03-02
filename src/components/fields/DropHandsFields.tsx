import { InstructionSchema } from "../../instructions/index";
import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";
import { DROP_WHICH_OPTIONS, DROP_WHICH_LABELS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function DropHandsFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "drop_hands" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      beats: 0,
      type: "drop_hands",
      which: instruction.which,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={DROP_WHICH_OPTIONS}
        value={instruction.which}
        onChange={(v) => tryCommit({ which: v })}
        getLabel={(v) => DROP_WHICH_LABELS[v] ?? v}
      />
    </>
  );
}
