import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import {
  ALL_BASE_CALLED_IDENTIFIERS,
  PersonInDirectionVariantSchema,
} from "../../instructions/_base";
import { GreetNewNeighborsInstructionSchema } from "../../instructions/greetNewNeighbors";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import type { SubFormProps } from "../fieldUtils";

export function GreetNewNeighborsFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "greet_new_neighbors" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof GreetNewNeighborsInstructionSchema>>,
  ) {
    const result = typedSafeParse(GreetNewNeighborsInstructionSchema, {
      id,
      beats: 0,
      type: "greet_new_neighbors",
      cid: instruction.cid,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {": "}
      <CalledIdentifierEditor
        baseOptions={ALL_BASE_CALLED_IDENTIFIERS.filter(
          (cid) => cid.type === "PersonInDirection",
        )}
        value={instruction.cid}
        onChange={(cid) => {
          const parsed = PersonInDirectionVariantSchema.safeParse(cid);
          if (parsed.success) tryCommit({ cid: parsed.data });
          else onInvalid?.();
        }}
      />
      {" is your new neighbor"}
    </>
  );
}
