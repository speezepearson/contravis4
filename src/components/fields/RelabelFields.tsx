import type z from "zod";

import { type SettableLabel, SettableLabelSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { RelabelInstructionSchema } from "../../instructions/relabel";
import { typedSafeParse } from "../../utils";
import { BasicLabelDropdown } from "../BasicLabelDropdown";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function RelabelFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "relabel" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof RelabelInstructionSchema>>,
  ) {
    const result = typedSafeParse(RelabelInstructionSchema, {
      id,
      beats: 0,
      type: "relabel",
      label: instruction.label,
      cid: instruction.cid,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {": "}
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
      {" is your new "}
      <BasicLabelDropdown<SettableLabel>
        options={SettableLabelSchema.options}
        value={instruction.label}
        onChange={(label) => tryCommit({ label })}
      />
    </>
  );
}
