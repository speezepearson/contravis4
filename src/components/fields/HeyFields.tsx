import type z from "zod";

import { HandSchema, RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { HeyInstructionSchema } from "../../instructions/hey";
import { typedSafeParse } from "../../utils";
import { DisambiguatingCidField } from "../DisambiguatingCidField";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS, ROLE_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function HeyFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "hey" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Partial<z.input<typeof HeyInstructionSchema>>) {
    const result = typedSafeParse(HeyInstructionSchema, {
      id,
      type: "hey",
      beats: instruction.beats,
      full: instruction.full,
      centerRole: instruction.centerRole,
      centerHand: instruction.centerHand,
      disambiguatingCid: instruction.disambiguatingCid,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {"("}
      <InlineDropdown
        options={["half", "full"]}
        value={instruction.full ? "full" : "half"}
        onChange={(v) => tryCommit({ full: v === "full" })}
      />
      {")"}
      {": "}
      <InlineDropdown
        options={ROLE_OPTIONS}
        value={instruction.centerRole}
        onChange={(v) => tryCommit({ centerRole: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />
      {" pass "}
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.centerHand}
        onChange={(v) => tryCommit({ centerHand: HandSchema.parse(v) })}
      />
      {" in the center "}
      <DisambiguatingCidField
        value={instruction.disambiguatingCid}
        onChange={(cid) => tryCommit({ disambiguatingCid: cid })}
        onInvalid={onInvalid}
      />
    </>
  );
}
