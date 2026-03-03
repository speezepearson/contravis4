import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledDirectionSchema } from "../../instructions/_base";
import { FaceInstructionSchema } from "../../instructions/face";
import { typedSafeParse } from "../../utils";
import { CalledDirectionDropdown } from "../CalledDirectionDropdown";
import type { SubFormProps } from "../fieldUtils";

export function FaceFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "face" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof FaceInstructionSchema>>,
  ) {
    const result = typedSafeParse(FaceInstructionSchema, {
      id,
      type: "face",
      beats: instruction.beats,
      direction: instruction.direction,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <CalledDirectionDropdown
        options={CalledDirectionSchema.options}
        value={instruction.direction}
        onChange={(f) => tryCommit({ direction: f })}
      />
    </>
  );
}
