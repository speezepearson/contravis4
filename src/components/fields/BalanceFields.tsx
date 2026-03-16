import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { BalanceInstructionSchema } from "../../instructions/balance";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import type { SubFormProps } from "../fieldUtils";

export function BalanceFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "balance" }>;
}) {
  function tryCommit(
    overrides: Partial<z.input<typeof BalanceInstructionSchema>>,
  ) {
    const result = typedSafeParse(BalanceInstructionSchema, {
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
      <CalledIdentifierEditor
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
