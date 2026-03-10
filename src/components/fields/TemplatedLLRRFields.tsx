import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { TemplatedLLRRInstructionSchema } from "../../instructions/templatedLLRRInstruction";
import { allLLRRTemplates } from "../../instructions/templates/index";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function TemplatedLLRRFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "templated_llrr" }>;
}) {
  const { id } = instruction;
  const template = allLLRRTemplates[instruction.templateId];

  function tryCommit(
    overrides: Partial<z.input<typeof TemplatedLLRRInstructionSchema>>,
  ) {
    const result = typedSafeParse(TemplatedLLRRInstructionSchema, {
      id,
      type: "templated_llrr",
      beats: instruction.beats,
      templateId: instruction.templateId,
      fields: instruction.fields,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {template?.matcher.type === "choreographer_specified" && (
        <>
          {" with "}
          <CalledIdentifierDropdown
            options={CalledIdentifierSchema.options}
            value={instruction.fields.matcher ?? "partner"}
            onChange={(cid) =>
              tryCommit({ fields: { ...instruction.fields, matcher: cid } })
            }
          />
        </>
      )}
    </>
  );
}
