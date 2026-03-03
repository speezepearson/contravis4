import type z from "zod";

import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { CircleInstructionSchema } from "../../instructions/circle";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";
import { InlineNumber } from "../InlineNumber";

export function CircleFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "circle" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof CircleInstructionSchema>>,
  ) {
    const result = typedSafeParse(CircleInstructionSchema, {
      id,
      type: "circle",
      beats: instruction.beats,
      direction: instruction.direction,
      rotations: instruction.rotations,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.direction}
        onChange={(v) => tryCommit({ direction: HandSchema.parse(v) })}
        getLabel={(v) => v}
      />{" "}
      <InlineNumber
        value={String(instruction.rotations)}
        onTextChange={(v) => tryCommit({ rotations: Number(v) })}
        onDrag={(n) => tryCommit({ rotations: n })}
        step={0.25}
        suffix="x"
      />
    </>
  );
}
