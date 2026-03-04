import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledDirectionSchema } from "../../instructions/_base";
import { BalanceInstructionSchema } from "../../instructions/balance";
import { typedSafeParse } from "../../utils";
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

  function tryCommit(
    overrides: Partial<z.input<typeof BalanceInstructionSchema>>,
  ) {
    const result = typedSafeParse(BalanceInstructionSchema, {
      id,
      type: "balance",
      beats: instruction.beats,
      cid: instruction.cid,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <CalledIdentifierDropdown
        options={CalledDirectionSchema.options}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
