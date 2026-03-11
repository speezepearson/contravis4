import type z from "zod";

import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { ShoulderRoundInstructionSchema } from "../../instructions/shoulderRound";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";
import { InlineNumber } from "../InlineNumber";

export function ShoulderRoundFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "shoulder_round" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof ShoulderRoundInstructionSchema>>,
  ) {
    const result = typedSafeParse(ShoulderRoundInstructionSchema, {
      id,
      type: "shoulder_round",
      beats: instruction.beats,
      cid: instruction.cid,
      handedness: instruction.handedness,
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
        value={instruction.handedness}
        onChange={(v) => tryCommit({ handedness: HandSchema.parse(v) })}
        getLabel={(v) => v}
      />{" "}
      <InlineNumber
        value={String(instruction.rotations)}
        onTextChange={(v) => tryCommit({ rotations: Number(v) })}
        onDrag={(n) => tryCommit({ rotations: n })}
        step={0.25}
        suffix="x"
      />
      {" with "}
      <CalledIdentifierEditor
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
