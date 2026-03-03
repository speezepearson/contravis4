import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { CaliforniaTwirlInstructionSchema } from "../../instructions/californiaTwirl";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function CaliforniaTwirlFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "california_twirl" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof CaliforniaTwirlInstructionSchema>>,
  ) {
    const result = typedSafeParse(CaliforniaTwirlInstructionSchema, {
      id,
      type: "california_twirl",
      beats: instruction.beats,
      cid: instruction.cid,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {"with "}
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options} // TODO: exclude same-role dancers
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
