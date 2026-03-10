import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { ALL_CALLED_IDENTIFIERS } from "../../instructions/_base";
import { GreetShadowInstructionSchema } from "../../instructions/greetShadow";
import { type ShadowLabel, ShadowLabelSchema } from "../../labels";
import { typedSafeParse } from "../../utils";
import { BasicLabelDropdown } from "../BasicLabelDropdown";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function GreetShadowFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "greet_shadow" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof GreetShadowInstructionSchema>>,
  ) {
    const result = typedSafeParse(GreetShadowInstructionSchema, {
      id,
      beats: 0,
      type: "greet_shadow",
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
        options={ALL_CALLED_IDENTIFIERS.filter(
          (cid) => cid.type === "PersonInDirection",
        )}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
      {" is your "}
      <BasicLabelDropdown<ShadowLabel>
        options={ShadowLabelSchema.options}
        value={instruction.label}
        onChange={(label) => tryCommit({ label })}
      />
    </>
  );
}
