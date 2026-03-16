import type z from "zod";

import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { PullByInstructionSchema } from "../../instructions/pullBy";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
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
  function tryCommit(
    overrides: Partial<z.input<typeof PullByInstructionSchema>>,
  ) {
    const result = typedSafeParse(PullByInstructionSchema, {
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
      <CalledIdentifierEditor
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
