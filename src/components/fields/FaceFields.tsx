import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { FaceInstructionSchema } from "../../instructions/face";
import { typedSafeParse } from "../../utils";
import { CalledDirectionEditor } from "../CalledDirectionEditor";
import type { SubFormProps } from "../fieldUtils";

export function FaceFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "face" }>;
}) {
  function tryCommit(
    overrides: Partial<z.input<typeof FaceInstructionSchema>>,
  ) {
    const result = typedSafeParse(FaceInstructionSchema, {
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
      <CalledDirectionEditor
        value={instruction.direction}
        onChange={(f) => tryCommit({ direction: f })}
      />
    </>
  );
}
