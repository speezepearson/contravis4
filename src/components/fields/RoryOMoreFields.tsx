import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { InstructionSchema } from "../../instructions/index";
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
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "rory_o_more",
      beats: instruction.beats,
      direction: instruction.direction,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
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
