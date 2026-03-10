import type z from "zod";

import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { ALL_CALLED_IDENTIFIERS } from "../../instructions/_base";
import { PullByInstructionSchema } from "../../instructions/pullBy";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function PullByFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "pull_by" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof PullByInstructionSchema>>,
  ) {
    const result = typedSafeParse(PullByInstructionSchema, {
      id,
      type: "pull_by",
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
      <CalledIdentifierDropdown
        options={ALL_CALLED_IDENTIFIERS}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
