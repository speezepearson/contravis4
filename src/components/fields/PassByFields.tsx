import type z from "zod";

import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { PassByInstructionSchema } from "../../instructions/passBy";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function PassByFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "pass_by" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof PassByInstructionSchema>>,
  ) {
    const result = typedSafeParse(PassByInstructionSchema, {
      id,
      type: "pass_by",
      beats: instruction.beats,
      cid: instruction.cid,
      hand: instruction.hand,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.hand}
        onChange={(v) => tryCommit({ hand: HandSchema.parse(v) })}
        getLabel={(v) => v}
      />
      {" with "}
      <CalledIdentifierEditor
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
