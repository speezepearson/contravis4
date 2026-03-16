import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { TakeHandsInRingsInstructionSchema } from "../../instructions/takeHandsInRings";
import { typedSafeParse } from "../../utils";
import { DisambiguatingCidField } from "../DisambiguatingCidField";
import type { SubFormProps } from "../fieldUtils";

export function TakeHandsInRingsFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "take_hands_in_rings" }>;
}) {
  function tryCommit(
    overrides: Partial<z.input<typeof TakeHandsInRingsInstructionSchema>>,
  ) {
    const result = typedSafeParse(TakeHandsInRingsInstructionSchema, {
      type: "take_hands_in_rings",
      beats: instruction.beats,
      disambiguatingCid: instruction.disambiguatingCid,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <DisambiguatingCidField
      value={instruction.disambiguatingCid}
      onChange={(cid) => tryCommit({ disambiguatingCid: cid })}
      onInvalid={onInvalid}
    />
  );
}
