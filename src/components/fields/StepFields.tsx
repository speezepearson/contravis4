import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { StepInstructionSchema } from "../../instructions/step";
import { typedSafeParse } from "../../utils";
import { CalledDirectionEditor } from "../CalledDirectionEditor";
import type { SubFormProps } from "../fieldUtils";
import { InlineNumber } from "../InlineNumber";

export function StepFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "step" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof StepInstructionSchema>>,
  ) {
    const result = typedSafeParse(StepInstructionSchema, {
      id,
      type: "step",
      beats: instruction.beats,
      direction: instruction.direction,
      distance: instruction.distance,
      facing: instruction.facing,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <CalledDirectionEditor
        value={instruction.direction}
        onChange={(dir) => tryCommit({ direction: dir })}
      />{" "}
      <InlineNumber
        value={String(instruction.distance)}
        onTextChange={(v) => tryCommit({ distance: Number(v) })}
        onDrag={(n) => tryCommit({ distance: n })}
        step={0.05}
        suffix="m"
      />
      {" and face "}
      <CalledDirectionEditor
        value={instruction.facing}
        onChange={(f) => tryCommit({ facing: f })}
      />
    </>
  );
}
