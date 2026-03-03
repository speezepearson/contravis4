import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { InstructionSchema } from "../../instructions/index";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function BalanceFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "balance" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "balance",
      beats: instruction.beats,
      cid: instruction.cid,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options} // TODO: exclude same-role dancers
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
