import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { TurnAsACoupleInstructionSchema } from "../../instructions/turnAsACouple";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function TurnAsACoupleFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "turn_as_a_couple" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof TurnAsACoupleInstructionSchema>>,
  ) {
    const result = typedSafeParse(TurnAsACoupleInstructionSchema, {
      id,
      type: "turn_as_a_couple",
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
        options={CalledIdentifierSchema.options}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
