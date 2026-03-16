import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import {
  TakeHandSchema,
  TakeHandsInstructionSchema,
} from "../../instructions/takeHands";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import type { SubFormProps } from "../fieldUtils";
import { TAKE_HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function TakeHandsFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "take_hands" }>;
}) {
  function tryCommit(
    overrides: Partial<z.input<typeof TakeHandsInstructionSchema>>,
  ) {
    const result = typedSafeParse(TakeHandsInstructionSchema, {
      beats: 0,
      type: "take_hands",
      cid: instruction.cid,
      hand: instruction.hand,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={TAKE_HAND_OPTIONS}
        value={instruction.hand}
        onChange={(v) => tryCommit({ hand: TakeHandSchema.parse(v) })}
        getLabel={(v) => v}
      />
      {" with "}
      <CalledIdentifierEditor
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
