import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema, inferRoleOfCalledIdentifier } from "../../instructions/_base";
import { BoxTheGnatInstructionSchema } from "../../instructions/boxTheGnat";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function BoxTheGnatFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "box_the_gnat" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof BoxTheGnatInstructionSchema>>,
  ) {
    const result = typedSafeParse(BoxTheGnatInstructionSchema, {
      id,
      type: "box_the_gnat",
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
        options={CalledIdentifierSchema.options.filter(cid => inferRoleOfCalledIdentifier(cid) !== 'same')}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
