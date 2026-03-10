import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import {
  CalledDirectionSchema,
  CalledIdentifierSchema,
} from "../../instructions/_base";
import { TemplatedLRInstructionSchema } from "../../instructions/templatedLRInstruction";
import { BasisVectorSpecSchema } from "../../instructions/templates/_base";
import { allLRTemplates } from "../../instructions/templates/index";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

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

  const basisX = template.basis.x;
  const basisY = template.basis.y;

  const dirOptions = CalledDirectionSchema.options;
  const cidOptions = CalledIdentifierSchema.options;

  return (
    <>
      {basisX === "choreographer_specified_direction" && (
        <>
          {" basis X: "}
          <InlineDropdown
            options={[...dirOptions]}
            value={
              instruction.fields.basisX ??
              template.basis.assumedX ??
              BasisVectorSpecSchema.options[0]
            }
            onChange={(val) =>
              tryCommit({
                fields: {
                  ...instruction.fields,
                  basisX: BasisVectorSpecSchema.parse(val),
                },
              })
            }
          />
        </>
      )}
      {basisX === "choreographer_specified_identifier" && (
        <>
          {" basis X: "}
          <InlineDropdown
            options={[...cidOptions]}
            value={
              instruction.fields.basisX ??
              template.basis.assumedX ??
              BasisVectorSpecSchema.options[0]
            }
            onChange={(val) =>
              tryCommit({
                fields: {
                  ...instruction.fields,
                  basisX: BasisVectorSpecSchema.parse(val),
                },
              })
            }
          />
        </>
      )}
      {basisY === "choreographer_specified_direction" && (
        <>
          {" basis Y: "}
          <InlineDropdown
            options={[...dirOptions]}
            value={
              instruction.fields.basisY ??
              template.basis.assumedY ??
              BasisVectorSpecSchema.options[0]
            }
            onChange={(val) =>
              tryCommit({
                fields: {
                  ...instruction.fields,
                  basisY: BasisVectorSpecSchema.parse(val),
                },
              })
            }
          />
        </>
      )}
      {basisY === "choreographer_specified_identifier" && (
        <>
          {" basis Y: "}
          <InlineDropdown
            options={[...cidOptions]}
            value={
              instruction.fields.basisY ??
              template.basis.assumedY ??
              BasisVectorSpecSchema.options[0]
            }
            onChange={(val) =>
              tryCommit({
                fields: {
                  ...instruction.fields,
                  basisY: BasisVectorSpecSchema.parse(val),
                },
              })
            }
          />
        </>
      )}
    </>
  );
}
