import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { UpTheHallInstructionSchema } from "../../instructions/upTheHall";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { InlineNumber } from "../InlineNumber";

export function UpTheHallFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "up_the_hall" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof UpTheHallInstructionSchema>>,
  ) {
    const result = typedSafeParse(UpTheHallInstructionSchema, {
      id,
      type: "up_the_hall",
      beats: instruction.beats,
      distance: instruction.distance,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <InlineNumber
      value={String(instruction.distance)}
      onTextChange={(v) => tryCommit({ distance: Number(v) })}
      onDrag={(n) => tryCommit({ distance: n })}
      step={0.5}
      suffix="m"
    />
  );
}
