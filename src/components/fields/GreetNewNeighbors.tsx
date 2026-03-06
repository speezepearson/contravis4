import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { PersonInDirectionSchema } from "../../instructions/_base";
import { GreetNewNeighborsInstructionSchema } from "../../instructions/greetNewNeighbors";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
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
      <CalledIdentifierDropdown
        options={PersonInDirectionSchema.options}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
      {" is your new neighbor"}
    </>
  );
}
