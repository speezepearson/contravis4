import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { TemplatedLRInstructionSchema } from "../../instructions/templatedLRInstruction";
import { allLRTemplates } from "../../instructions/templates/index";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function TemplatedLRFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "templated_lr" }>;
}) {
  const { id } = instruction;
  const template = allLRTemplates[instruction.templateId];

  function tryCommit(
    overrides: Partial<z.input<typeof TemplatedLRInstructionSchema>>,
  ) {
    const result = typedSafeParse(TemplatedLRInstructionSchema, {
      id,
      type: "templated_lr",
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
