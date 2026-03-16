import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import {
  ALL_BASE_CALLED_DIRECTIONS,
  ALL_BASE_CALLED_IDENTIFIERS,
  CalledDirectionSchema,
  CalledIdentifierSchema,
} from "../../instructions/_base";
import { TemplatedLRInstructionSchema } from "../../instructions/templatedLRInstruction";
import { BasisVectorSpecSchema } from "../../instructions/templates/_base";
import { allLRTemplates } from "../../instructions/templates/index";
import { typedSafeParse } from "../../utils";
import { CalledDirectionEditor } from "../CalledDirectionEditor";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import type { SubFormProps } from "../fieldUtils";

export function TemplatedLRFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "templated_lr" }>;
}) {
  const template = allLRTemplates[instruction.templateId];

  function tryCommit(
    overrides: Partial<z.input<typeof TemplatedLRInstructionSchema>>,
  ) {
    const result = typedSafeParse(TemplatedLRInstructionSchema, {
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

  return (
    <>
      {basisX.type === "choreographer_specified_direction" && (
        <>
          {" basis X: "}
          <CalledDirectionEditor
            value={CalledDirectionSchema.parse(
              instruction.fields.basisX ??
                template.basis.assumedX ??
                ALL_BASE_CALLED_DIRECTIONS[0],
            )}
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
      {basisX.type === "choreographer_specified_identifier" && (
        <>
          {" basis X: "}
          <CalledIdentifierEditor
            value={CalledIdentifierSchema.parse(
              instruction.fields.basisX ??
                template.basis.assumedX ??
                ALL_BASE_CALLED_IDENTIFIERS[0],
            )}
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
      {basisY.type === "choreographer_specified_direction" && (
        <>
          {" basis Y: "}
          <CalledDirectionEditor
            value={CalledDirectionSchema.parse(
              instruction.fields.basisY ??
                template.basis.assumedY ??
                ALL_BASE_CALLED_DIRECTIONS[0],
            )}
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
      {basisY.type === "choreographer_specified_identifier" && (
        <>
          {" basis Y: "}
          <CalledIdentifierEditor
            value={CalledIdentifierSchema.parse(
              instruction.fields.basisY ??
                template.basis.assumedY ??
                ALL_BASE_CALLED_IDENTIFIERS[0],
            )}
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
